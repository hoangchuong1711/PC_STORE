-- T14: persist checkout idempotency metadata on the immutable order.
-- Historical/manual orders may keep both values NULL; API-created orders always set both.
ALTER TABLE orders
    ADD COLUMN checkout_idempotency_key VARCHAR(128),
    ADD COLUMN checkout_request_hash VARCHAR(64),
    ADD CONSTRAINT ck_orders_checkout_idempotency_pair CHECK (
        (checkout_idempotency_key IS NULL AND checkout_request_hash IS NULL)
        OR
        (checkout_idempotency_key IS NOT NULL AND checkout_request_hash IS NOT NULL)
    ),
    ADD CONSTRAINT ck_orders_checkout_idempotency_key CHECK (
        checkout_idempotency_key IS NULL
        OR (checkout_idempotency_key = btrim(checkout_idempotency_key) AND checkout_idempotency_key <> '')
    ),
    ADD CONSTRAINT ck_orders_checkout_request_hash CHECK (
        checkout_request_hash IS NULL OR checkout_request_hash ~ '^[0-9a-f]{64}$'
    );

CREATE UNIQUE INDEX uq_orders_user_checkout_key
    ON orders(user_id, checkout_idempotency_key)
    WHERE checkout_idempotency_key IS NOT NULL;
