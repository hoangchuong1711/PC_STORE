-- Loaded after Flyway when DEMO_SEED_ENABLED=true.
-- Re-running this script keeps existing demo rows and stock quantities unchanged.

INSERT INTO brands (name, description)
SELECT seed.name, seed.description
FROM (VALUES
    ('T05-DEMO AMD', 'Brand for T05 catalog API demo'),
    ('T05-DEMO NVIDIA', 'Brand for T05 catalog API demo')
) AS seed(name, description)
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.name = seed.name);

INSERT INTO categories (name, description, component_type)
SELECT seed.name, seed.description, seed.component_type
FROM (VALUES
    ('T05-DEMO CPU', 'CPU category for T05 catalog API demo', 'CPU'),
    ('T05-DEMO GPU', 'GPU category for T05 catalog API demo', 'GPU')
) AS seed(name, description, component_type)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = seed.name);

INSERT INTO products (name, description, price, status, category_id, brand_id)
SELECT seed.name, seed.description, seed.price, 'ACTIVE', c.category_id, b.brand_id
FROM (VALUES
    ('T05-DEMO Ryzen 5 7600', 'Sample CPU with stock', 5490000, 'T05-DEMO CPU', 'T05-DEMO AMD'),
    ('T05-DEMO RTX 4060', 'Sample GPU with stock', 8290000, 'T05-DEMO GPU', 'T05-DEMO NVIDIA'),
    ('T05-DEMO Ryzen 7 7700', 'Sample CPU without stock', 7490000, 'T05-DEMO CPU', 'T05-DEMO AMD')
) AS seed(name, description, price, category_name, brand_name)
JOIN categories c ON c.name = seed.category_name
JOIN brands b ON b.name = seed.brand_name
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = seed.name);

INSERT INTO inventory (product_id, quantity_on_hand, reserved_quantity)
SELECT p.product_id, seed.quantity_on_hand, 0
FROM (VALUES
    ('T05-DEMO Ryzen 5 7600', 10),
    ('T05-DEMO RTX 4060', 5),
    ('T05-DEMO Ryzen 7 7700', 0)
) AS seed(name, quantity_on_hand)
JOIN products p ON p.name = seed.name
WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.product_id);
