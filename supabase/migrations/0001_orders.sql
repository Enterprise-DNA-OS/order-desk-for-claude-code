CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE workspace (id integer PRIMARY KEY CHECK(id=1), name text NOT NULL CHECK(length(trim(name))>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE channels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE CHECK(length(trim(name))>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX channels_name_ci ON channels(lower(name));
CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text NOT NULL UNIQUE CHECK(length(trim(sku))>0), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX products_sku_ci ON products(lower(sku));
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), channel_id uuid NOT NULL REFERENCES channels,
 reference text NOT NULL CHECK(length(trim(reference))>0), customer text NOT NULL, currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 ordered_on date NOT NULL, ship_by date, deliver_by date, tax_year_end date, retain_until date,
 hold_reason text NOT NULL DEFAULT '', source_status text NOT NULL DEFAULT 'manual', source_fingerprint text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(channel_id,reference), CHECK(ship_by IS NULL OR ship_by>=ordered_on), CHECK(deliver_by IS NULL OR deliver_by>=ordered_on), CHECK(tax_year_end IS NULL OR tax_year_end>=ordered_on)
);
CREATE TABLE order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders,
 line_ref text NOT NULL, product_id uuid NOT NULL REFERENCES products, quantity integer NOT NULL CHECK(quantity>0),
 unit_cents bigint NOT NULL CHECK(unit_cents>=0), cancelled integer NOT NULL DEFAULT 0 CHECK(cancelled>=0),
 opening_shipped integer NOT NULL DEFAULT 0 CHECK(opening_shipped>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,line_ref), CHECK(cancelled+opening_shipped<=quantity)
);
CREATE TABLE shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), line_id uuid NOT NULL REFERENCES order_lines, quantity integer NOT NULL CHECK(quantity>0),
 warehouse text NOT NULL CHECK(length(trim(warehouse))>0), carrier text NOT NULL CHECK(length(trim(carrier))>0), tracking text NOT NULL CHECK(length(trim(tracking))>0),
 shipped_on date NOT NULL, delivered_on date, evidence text NOT NULL CHECK(length(trim(evidence))>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(delivered_on IS NULL OR delivered_on>=shipped_on)
);
CREATE TABLE returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), line_id uuid NOT NULL REFERENCES order_lines, quantity integer NOT NULL CHECK(quantity>0),
 reason text NOT NULL CHECK(length(trim(reason))>0), opened_on date NOT NULL DEFAULT current_date, review_by date NOT NULL,
 outcome text CHECK(outcome IN ('repair','replacement','refund-requested','declined','withdrawn')), evidence text,
 resolved_on date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(review_by>=opened_on), CHECK((outcome IS NULL AND resolved_on IS NULL) OR (outcome IS NOT NULL AND resolved_on>=opened_on AND length(trim(evidence))>0))
);
CREATE TABLE tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders, owner text NOT NULL CHECK(length(trim(owner))>0),
 note text NOT NULL CHECK(length(trim(note))>0), due_on date NOT NULL, completed_on date, evidence text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(completed_on IS NULL OR length(trim(evidence))>0)
);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_id text NOT NULL, action text NOT NULL, actor text NOT NULL CHECK(length(trim(actor))>0),
 evidence text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION immutable_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit events are append-only'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION immutable_event();
-- One trusted operator, no anonymous/public access. Owner credentials bypass RLS.
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['workspace','channels','products','orders','order_lines','shipments','returns','tasks'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM public',t);
END LOOP; END $$;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_events FROM public;
CREATE VIEW line_balances AS
SELECT l.*,p.sku,p.name AS product,
 l.opening_shipped+coalesce(s.shipped,0)::integer AS shipped,
 coalesce(s.delivered,0)::integer AS delivered,
 l.quantity-l.cancelled-l.opening_shipped-coalesce(s.shipped,0)::integer AS remaining,
 coalesce(r.returned,0)::integer AS returned,
 coalesce(r.open_returns,0)::integer AS open_returns
FROM order_lines l JOIN products p ON p.id=l.product_id
LEFT JOIN (SELECT line_id,sum(quantity) AS shipped,sum(CASE WHEN delivered_on IS NOT NULL THEN quantity ELSE 0 END) AS delivered FROM shipments GROUP BY line_id) s ON s.line_id=l.id
LEFT JOIN (SELECT line_id,sum(CASE WHEN outcome IS DISTINCT FROM 'withdrawn' THEN quantity ELSE 0 END) AS returned,count(*) FILTER(WHERE outcome IS NULL) AS open_returns FROM returns GROUP BY line_id) r ON r.line_id=l.id;
CREATE VIEW order_summary AS
SELECT o.*,c.name AS channel,coalesce(sum(l.quantity),0)::integer AS units,
 coalesce(sum(l.shipped),0)::integer AS shipped,coalesce(sum(l.remaining),0)::integer AS remaining,
 coalesce(sum(l.cancelled),0)::integer AS cancelled,coalesce(sum(l.delivered),0)::integer AS delivered,
 coalesce(sum(l.opening_shipped),0)::integer AS imported_shipped,
 coalesce(sum(l.open_returns),0)::integer AS open_returns,
 coalesce(sum((l.quantity-l.cancelled)*l.unit_cents),0)::bigint AS value_cents,
 CASE WHEN count(l.id)=0 THEN 'empty' WHEN o.hold_reason<>'' THEN 'held' WHEN sum(l.cancelled)=sum(l.quantity) THEN 'cancelled'
 WHEN sum(l.remaining)=0 THEN 'dispatched' WHEN sum(l.shipped)>0 THEN 'partial' ELSE 'open' END AS status
FROM orders o JOIN channels c ON c.id=o.channel_id LEFT JOIN line_balances l ON l.order_id=o.id GROUP BY o.id,c.name;
CREATE VIEW dispatch_queue AS SELECT id,reference,channel,ship_by,currency,remaining,hold_reason,status FROM order_summary WHERE remaining>0 ORDER BY ship_by NULLS LAST,reference;
CREATE VIEW promises_due AS SELECT id,reference,channel,deliver_by,shipped,delivered,imported_shipped FROM order_summary WHERE deliver_by<current_date AND units-cancelled>delivered ORDER BY deliver_by,reference;
CREATE VIEW returns_queue AS SELECT r.id,o.reference,p.sku,r.quantity,r.reason,r.review_by,r.outcome,o.currency FROM returns r JOIN order_lines l ON l.id=r.line_id JOIN orders o ON o.id=l.order_id JOIN products p ON p.id=l.product_id WHERE r.outcome IS NULL ORDER BY r.review_by,o.reference;
CREATE VIEW attention_queue AS
 SELECT id,reference,'dispatch overdue'::text AS issue,ship_by AS due_on FROM order_summary WHERE remaining>0 AND ship_by<current_date
 UNION ALL SELECT id,reference,'held: '||hold_reason,ship_by FROM order_summary WHERE hold_reason<>'' AND remaining>0
 UNION ALL SELECT id,reference,'delivery promise overdue',deliver_by FROM promises_due
 UNION ALL SELECT o.id,o.reference,'task overdue: '||t.owner,t.due_on FROM tasks t JOIN orders o ON o.id=t.order_id WHERE t.completed_on IS NULL AND t.due_on<current_date
 UNION ALL SELECT o.id,o.reference,'return review overdue',r.review_by FROM returns r JOIN order_lines l ON l.id=r.line_id JOIN orders o ON o.id=l.order_id WHERE r.outcome IS NULL AND r.review_by<current_date;
CREATE VIEW compliance_queue AS
 SELECT id,reference,'NZ-DELIVERY'::text AS rule,'Agreed delivery date passed without full delivery evidence'::text AS finding FROM promises_due
 UNION ALL SELECT id,reference,'NZ-RECORDS','Missing tax year end or retention date' FROM orders WHERE tax_year_end IS NULL OR retain_until IS NULL
 UNION ALL SELECT id,reference,'NZ-RECORDS','Retention date below seven years from supplied tax year end' FROM orders WHERE retain_until < (tax_year_end+interval '7 years')::date
 UNION ALL SELECT id,reference,'LOCAL-PROMISE','No dispatch deadline recorded' FROM order_summary WHERE remaining>0 AND ship_by IS NULL
 UNION ALL SELECT id,reference,'LOCAL-IMPORT','Imported shipment quantity needs separate delivery reconciliation' FROM order_summary WHERE imported_shipped>0;
REVOKE ALL ON line_balances,order_summary,dispatch_queue,promises_due,returns_queue,attention_queue,compliance_queue FROM public;
