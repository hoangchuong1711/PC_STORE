-- T20-B: Support VNPay payment method, payment expiration, and payment_attempts history

-- 1. Update orders status constraint to include EXPIRED_PENDING_RECONCILIATION
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'orders'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%status%'
          AND pg_get_constraintdef(c.oid) NOT LIKE '%delivered_at%'
    ) LOOP
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE orders
    ADD CONSTRAINT ck_orders_status
    CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'EXPIRED_PENDING_RECONCILIATION'));

-- 2. Add payment_expires_at column to orders (null for historical/COD orders; populated for online payment orders)
ALTER TABLE orders
    ADD COLUMN payment_expires_at TIMESTAMP WITHOUT TIME ZONE;

-- 3. Update payments method constraint to include VNPAY
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'payments'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%method%'
    ) LOOP
        EXECUTE 'ALTER TABLE payments DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

UPDATE payments SET method = 'VNPAY' WHERE method = 'BANK_TRANSFER';

ALTER TABLE payments
    ADD CONSTRAINT ck_payments_method
    CHECK (method IN ('COD', 'VNPAY'));

-- 4. Create payment_attempts table
CREATE TABLE payment_attempts (
    attempt_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(payment_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    reference_code VARCHAR(64) NOT NULL UNIQUE,
    amount NUMERIC(19, 0) NOT NULL CHECK (amount >= 0 AND amount <> 'NaN'::numeric),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'UNKNOWN')),
    vnp_transaction_no VARCHAR(64),
    vnp_bank_code VARCHAR(32),
    verified_result TEXT,
    last_reconciled_at TIMESTAMP WITHOUT TIME ZONE,
    next_retry_at TIMESTAMP WITHOUT TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    error_message TEXT,
    requires_admin_review BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_payment_attempts_order ON payment_attempts(order_id);
CREATE INDEX ix_payment_attempts_payment ON payment_attempts(payment_id);
CREATE INDEX ix_payment_attempts_reconcile ON payment_attempts(status, next_retry_at)
    WHERE status IN ('INITIATED', 'PENDING', 'UNKNOWN');
CREATE INDEX ix_payment_attempts_admin ON payment_attempts(requires_admin_review)
    WHERE requires_admin_review = TRUE;
CREATE INDEX ix_orders_expired_reconcile ON orders(status, payment_expires_at)
    WHERE status = 'PENDING';
