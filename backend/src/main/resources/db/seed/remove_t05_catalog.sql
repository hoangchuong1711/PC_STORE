-- Remove the obsolete T05 API fixtures from the public catalog.
-- Products referenced by immutable business history cannot be deleted safely;
-- archive those rows and remove their available inventory instead.

DELETE FROM cart_items
WHERE product_id IN (
    SELECT product_id FROM products WHERE name LIKE 'T05-DEMO %'
);

UPDATE products p
SET status = 'DISCONTINUED'
WHERE p.name LIKE 'T05-DEMO %'
  AND (
      EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id)
      OR EXISTS (SELECT 1 FROM pc_build_items bi WHERE bi.product_id = p.product_id)
      OR EXISTS (SELECT 1 FROM setup_post_products sp WHERE sp.product_id = p.product_id)
  );

UPDATE inventory i
SET quantity_on_hand = i.reserved_quantity
WHERE EXISTS (
    SELECT 1
    FROM products p
    WHERE p.product_id = i.product_id
      AND p.name LIKE 'T05-DEMO %'
      AND p.status = 'DISCONTINUED'
);

DELETE FROM products p
WHERE p.name LIKE 'T05-DEMO %'
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id)
  AND NOT EXISTS (SELECT 1 FROM pc_build_items bi WHERE bi.product_id = p.product_id)
  AND NOT EXISTS (SELECT 1 FROM setup_post_products sp WHERE sp.product_id = p.product_id);

DELETE FROM categories c
WHERE c.name LIKE 'T05-DEMO %'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.category_id);

DELETE FROM brands b
WHERE b.name LIKE 'T05-DEMO %'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.brand_id);
