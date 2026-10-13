-- Purchasable catalog records for legacy community showcase posts.
-- Loaded only when DEMO_SEED_ENABLED=true. Re-running this script preserves
-- existing catalog edits and stock movements.

DO $checks$
BEGIN
    IF EXISTS (
        SELECT 1 FROM brands
        WHERE name IN ('PC Store', 'ASUS', 'Kingston', 'Samsung', 'LG', 'Keychron')
        GROUP BY name HAVING count(*) > 1
    ) THEN RAISE EXCEPTION 'Community catalog: duplicate brand name'; END IF;

    IF EXISTS (
        SELECT 1 FROM categories
        WHERE name IN ('Laptop', 'PC Gaming', 'Linh kiện', 'Phụ kiện')
        GROUP BY name HAVING count(*) > 1
    ) THEN RAISE EXCEPTION 'Community catalog: duplicate category name'; END IF;

    IF EXISTS (
        SELECT 1 FROM products
        WHERE name IN (
            'PC Creator Pro X',
            'ROG Strix G16 2025',
            'TUF Gaming A15',
            'Kingston Fury 32GB DDR5-6000',
            'Samsung 990 Pro NVMe 2TB',
            'Ultrawide Monitor 34',
            'Keychron Q1 Pro Custom QMK',
            'RTX 4070 Super Dual 12GB'
        )
        GROUP BY name HAVING count(*) > 1
    ) THEN RAISE EXCEPTION 'Community catalog: duplicate product name'; END IF;
END
$checks$;

INSERT INTO brands (name, description)
SELECT seed.name, seed.description
FROM (VALUES
    ('PC Store', 'Máy tính lắp ráp và thiết bị PC Store.'),
    ('ASUS', 'Máy tính và linh kiện ASUS.'),
    ('Kingston', 'Bộ nhớ và thiết bị lưu trữ Kingston.'),
    ('Samsung', 'Thiết bị lưu trữ Samsung.'),
    ('LG', 'Màn hình và thiết bị hiển thị LG.'),
    ('Keychron', 'Bàn phím cơ và phụ kiện Keychron.')
) AS seed(name, description)
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.name = seed.name);

-- These showcase categories intentionally have no builder component_type.
-- They are regular store products and do not require builder-spec rows.
INSERT INTO categories (name, description, component_type)
SELECT seed.name, seed.description, NULL
FROM (VALUES
    ('Laptop', 'Máy tính xách tay.'),
    ('PC Gaming', 'Máy tính để bàn lắp ráp sẵn.'),
    ('Linh kiện', 'Linh kiện và nâng cấp máy tính.'),
    ('Phụ kiện', 'Màn hình và phụ kiện máy tính.')
) AS seed(name, description)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = seed.name);

INSERT INTO products (name, description, price, status, category_id, brand_id)
SELECT seed.name, seed.description, seed.price, 'ACTIVE', c.category_id, b.brand_id
FROM (VALUES
    ('PC Creator Pro X', 'Workstation dành cho sáng tạo nội dung và tác vụ chuyên nghiệp.', 52990000, 'PC Gaming', 'PC Store'),
    ('ROG Strix G16 2025', 'Laptop gaming ROG Strix G16 thế hệ 2025.', 38990000, 'Laptop', 'ASUS'),
    ('TUF Gaming A15', 'Laptop gaming ASUS TUF Gaming A15.', 24990000, 'Laptop', 'ASUS'),
    ('Kingston Fury 32GB DDR5-6000', 'Bộ nhớ Kingston Fury DDR5 dung lượng 32GB, tốc độ 6000MT/s.', 2190000, 'Linh kiện', 'Kingston'),
    ('Samsung 990 Pro NVMe 2TB', 'SSD NVMe Samsung 990 Pro dung lượng 2TB.', 4590000, 'Linh kiện', 'Samsung'),
    ('Ultrawide Monitor 34', 'Màn hình ultrawide 34 inch.', 11990000, 'Phụ kiện', 'LG'),
    ('Keychron Q1 Pro Custom QMK', 'Bàn phím cơ không dây hỗ trợ QMK/VIA.', 4390000, 'Phụ kiện', 'Keychron'),
    ('RTX 4070 Super Dual 12GB', 'Card đồ họa GeForce RTX 4070 Super Dual 12GB.', 16990000, 'Linh kiện', 'ASUS')
) AS seed(name, description, price, category_name, brand_name)
JOIN categories c ON c.name = seed.category_name
JOIN brands b ON b.name = seed.brand_name
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = seed.name);

INSERT INTO inventory (product_id, quantity_on_hand, reserved_quantity)
SELECT p.product_id, seed.quantity_on_hand, 0
FROM (VALUES
    ('PC Creator Pro X', 3),
    ('ROG Strix G16 2025', 8),
    ('TUF Gaming A15', 5),
    ('Kingston Fury 32GB DDR5-6000', 18),
    ('Samsung 990 Pro NVMe 2TB', 2),
    ('Ultrawide Monitor 34', 4),
    ('Keychron Q1 Pro Custom QMK', 5),
    ('RTX 4070 Super Dual 12GB', 5)
) AS seed(name, quantity_on_hand)
JOIN products p ON p.name = seed.name
WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.product_id);
