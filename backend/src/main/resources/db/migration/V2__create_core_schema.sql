-- T03 CORE, following docs/data-model.md. Keep V1 immutable for existing databases.
ALTER TABLE brands ALTER COLUMN brand_id SET GENERATED ALWAYS;
ALTER TABLE brands ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE brands ALTER COLUMN status TYPE VARCHAR(32);
ALTER TABLE brands ADD CONSTRAINT ck_brands_name CHECK (name = btrim(name) AND name <> '');
ALTER TABLE brands ADD CONSTRAINT ck_brands_description CHECK (description IS NULL OR (description = btrim(description) AND description <> ''));
ALTER TABLE brands ADD CONSTRAINT ck_brands_logo CHECK (logo_url IS NULL OR (logo_url = btrim(logo_url) AND logo_url <> ''));

CREATE TABLE users (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL CHECK (full_name = btrim(full_name) AND full_name <> ''),
    email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND email <> ''),
    password_hash VARCHAR(255) NOT NULL CHECK (password_hash = btrim(password_hash) AND password_hash <> ''),
    phone VARCHAR(32) CHECK (phone IS NULL OR (phone = btrim(phone) AND phone <> '')),
    role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER','ADMIN')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE TABLE addresses (
    address_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    address_detail TEXT NOT NULL CHECK (address_detail = btrim(address_detail) AND address_detail <> ''),
    user_id INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX uq_addresses_default ON addresses(user_id) WHERE is_default;
CREATE INDEX ix_addresses_user ON addresses(user_id);

CREATE TABLE categories (
    category_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL CHECK (name = btrim(name) AND name <> ''),
    description TEXT CHECK (description IS NULL OR (description = btrim(description) AND description <> '')),
    component_type VARCHAR(32) CHECK (component_type IN ('CPU','MOTHERBOARD','RAM','GPU','STORAGE','PSU','CASE','COOLER')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE TABLE products (
    product_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL CHECK (name = btrim(name) AND name <> ''),
    description TEXT CHECK (description IS NULL OR (description = btrim(description) AND description <> '')),
    price NUMERIC(19,0) NOT NULL CHECK (price >= 0 AND price <> 'NaN'::numeric),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE','INACTIVE','DRAFT','OUT_OF_STOCK','DISCONTINUED','HIDDEN')),
    category_id INTEGER NOT NULL REFERENCES categories ON DELETE RESTRICT ON UPDATE RESTRICT,
    brand_id INTEGER NOT NULL REFERENCES brands ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX ix_products_category ON products(category_id);
CREATE INDEX ix_products_brand ON products(brand_id);
CREATE TABLE product_images (
    image_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    image_url VARCHAR(2048) NOT NULL CHECK (image_url = btrim(image_url) AND image_url <> ''),
    is_primary BOOLEAN NOT NULL,
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    UNIQUE(product_id, sort_order)
);
CREATE UNIQUE INDEX uq_product_images_primary ON product_images(product_id) WHERE is_primary;
CREATE TABLE inventory (
    inventory_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products ON DELETE CASCADE ON UPDATE RESTRICT,
    CHECK (quantity_on_hand >= 0 AND reserved_quantity >= 0 AND reserved_quantity <= quantity_on_hand)
);
CREATE TABLE carts (
    cart_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE TABLE cart_items (
    cart_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products ON DELETE RESTRICT ON UPDATE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cart_id INTEGER NOT NULL REFERENCES carts ON DELETE CASCADE ON UPDATE RESTRICT,
    UNIQUE(cart_id, product_id)
);
CREATE INDEX ix_cart_items_product ON cart_items(product_id);
CREATE TABLE orders (
    order_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE RESTRICT,
    order_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED')),
    total_amount NUMERIC(19,0) NOT NULL CHECK (total_amount >= 0 AND total_amount <> 'NaN'::numeric),
    shipping_name VARCHAR(255) NOT NULL CHECK (shipping_name = btrim(shipping_name) AND shipping_name <> ''),
    shipping_phone VARCHAR(32) NOT NULL CHECK (shipping_phone = btrim(shipping_phone) AND shipping_phone <> ''),
    shipping_address_text TEXT NOT NULL CHECK (shipping_address_text = btrim(shipping_address_text) AND shipping_address_text <> ''),
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    CHECK ((status = 'DELIVERED' AND delivered_at IS NOT NULL) OR (status <> 'DELIVERED' AND delivered_at IS NULL))
);
CREATE INDEX ix_orders_user_date ON orders(user_id, order_date, order_id);
CREATE TABLE order_items (
    order_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders ON DELETE RESTRICT ON UPDATE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products ON DELETE RESTRICT ON UPDATE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    base_unit_price NUMERIC(19,0) NOT NULL,
    unit_price NUMERIC(19,0) NOT NULL,
    CHECK (base_unit_price >= 0 AND base_unit_price <> 'NaN'::numeric AND unit_price >= 0 AND unit_price <= base_unit_price),
    UNIQUE(order_id, product_id)
);
CREATE INDEX ix_order_items_product ON order_items(product_id);
CREATE TABLE payments (
    payment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders ON DELETE RESTRICT ON UPDATE RESTRICT,
    method VARCHAR(32) NOT NULL CHECK (method IN ('COD','BANK_TRANSFER')),
    amount NUMERIC(19,0) NOT NULL CHECK (amount >= 0 AND amount <> 'NaN'::numeric),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED')),
    transaction_id VARCHAR(255) CHECK (transaction_id IS NULL OR (transaction_id = btrim(transaction_id) AND transaction_id <> '')),
    paid_at TIMESTAMP WITHOUT TIME ZONE,
    CHECK ((status = 'PAID' AND paid_at IS NOT NULL) OR (status <> 'PAID' AND paid_at IS NULL))
);
