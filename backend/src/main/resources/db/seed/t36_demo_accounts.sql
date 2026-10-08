
INSERT INTO users (full_name, email, password_hash, role, status)
VALUES ('Demo Admin', 'admin@gmail.com', current_setting('pcstore.demo_admin_hash'), 'ADMIN', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role, status)
VALUES ('Demo Customer', 'user@gmail.com', current_setting('pcstore.demo_customer_hash'), 'CUSTOMER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;
