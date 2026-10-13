
DO $demo_accounts$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users
        WHERE (email = 'admin@gmail.com' AND role <> 'ADMIN')
           OR (email IN ('user@gmail.com', 'demo.minhanh@pcstore.test',
                         'demo.giahuy@pcstore.test', 'demo.thuha@pcstore.test',
                         'demo.quocbao@pcstore.test') AND role <> 'CUSTOMER')
    ) THEN
        RAISE EXCEPTION 'Demo account email has an unexpected role';
    END IF;
END $demo_accounts$;

INSERT INTO users (full_name, email, password_hash, role, status)
VALUES ('Demo Admin', 'admin@gmail.com', current_setting('pcstore.demo_admin_hash'), 'ADMIN', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role, status)
VALUES ('Demo Customer', 'user@gmail.com', current_setting('pcstore.demo_customer_hash'), 'CUSTOMER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role, status)
VALUES
    ('Nguyễn Minh Anh', 'demo.minhanh@pcstore.test', current_setting('pcstore.demo_customer_hash'), 'CUSTOMER', 'ACTIVE'),
    ('Trần Gia Huy', 'demo.giahuy@pcstore.test', current_setting('pcstore.demo_customer_hash'), 'CUSTOMER', 'ACTIVE'),
    ('Lê Thu Hà', 'demo.thuha@pcstore.test', current_setting('pcstore.demo_customer_hash'), 'CUSTOMER', 'ACTIVE'),
    ('Phạm Quốc Bảo', 'demo.quocbao@pcstore.test', current_setting('pcstore.demo_customer_hash'), 'CUSTOMER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;
