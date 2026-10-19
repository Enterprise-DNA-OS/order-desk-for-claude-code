-- Keep quantity checks at the database boundary as well as in the CLI.
CREATE FUNCTION shipment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE available integer; held text; ordered date;
BEGIN
 IF EXISTS(SELECT 1 FROM shipments WHERE id=NEW.id) THEN RETURN NEW; END IF;
 PERFORM 1 FROM orders o JOIN order_lines l ON l.order_id=o.id WHERE l.id=NEW.line_id FOR UPDATE OF o;
 SELECT l.quantity-l.cancelled-l.opening_shipped-coalesce((SELECT sum(s.quantity) FROM shipments s WHERE s.line_id=l.id),0),o.hold_reason,o.ordered_on
 INTO available,held,ordered FROM order_lines l JOIN orders o ON o.id=l.order_id WHERE l.id=NEW.line_id;
 IF NEW.quantity>available OR held<>'' THEN RAISE EXCEPTION 'Shipment exceeds remaining units or order is held'; END IF;
 IF NEW.shipped_on<ordered OR NEW.shipped_on>current_date THEN RAISE EXCEPTION 'Shipment date outside recorded order history'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_shipment BEFORE INSERT ON shipments FOR EACH ROW EXECUTE FUNCTION shipment_guard();
CREATE FUNCTION cancellation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE shipped integer;
BEGIN
 PERFORM 1 FROM orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT coalesce(sum(quantity),0)::integer INTO shipped FROM shipments WHERE line_id=NEW.id;
 IF NEW.cancelled+NEW.opening_shipped+shipped>NEW.quantity THEN RAISE EXCEPTION 'Line change would consume shipped units'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_line BEFORE UPDATE ON order_lines FOR EACH ROW EXECUTE FUNCTION cancellation_guard();
CREATE FUNCTION return_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE available integer; claimed integer;
BEGIN
 IF EXISTS(SELECT 1 FROM returns WHERE id=NEW.id) THEN RETURN NEW; END IF;
 PERFORM 1 FROM orders o JOIN order_lines l ON l.order_id=o.id WHERE l.id=NEW.line_id FOR UPDATE OF o;
 SELECT opening_shipped+coalesce((SELECT sum(quantity) FROM shipments WHERE line_id=NEW.line_id AND shipped_on<=NEW.opened_on),0)
 INTO available FROM order_lines WHERE id=NEW.line_id;
 SELECT coalesce(sum(quantity),0)::integer INTO claimed FROM returns WHERE line_id=NEW.line_id AND outcome IS DISTINCT FROM 'withdrawn';
 IF NEW.quantity+claimed>available THEN RAISE EXCEPTION 'Return exceeds available shipped units'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_return BEFORE INSERT ON returns FOR EACH ROW EXECUTE FUNCTION return_guard();
