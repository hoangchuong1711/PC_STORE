-- Demo purchases and verified reviews. Run only after demo accounts and catalog.
-- Stable checkout keys make this safe to run repeatedly without overwriting real edits.

WITH seed_orders(order_key, email, days_ago, status, recipient, phone, address) AS (VALUES
    ('demo-order-01', 'demo.minhanh@pcstore.test', 5, 'DELIVERED', 'Nguyễn Minh Anh', '0901234567', '12 Nguyễn Trãi, Hà Nội'),
    ('demo-order-02', 'demo.giahuy@pcstore.test', 3, 'DELIVERED', 'Trần Gia Huy', '0902345678', '25 Lê Lợi, Đà Nẵng'),
    ('demo-order-03', 'demo.thuha@pcstore.test', 1, 'PENDING', 'Lê Thu Hà', '0903456789', '18 Pasteur, TP Hồ Chí Minh'),
    ('demo-order-04', 'demo.quocbao@pcstore.test', 2, 'SHIPPING', 'Phạm Quốc Bảo', '0904567890', '40 Trần Phú, Hải Phòng'),
    ('demo-order-05', 'user@gmail.com', 4, 'CANCELLED', 'Demo Customer', '0905678901', '9 Hùng Vương, Huế'),
    ('demo-order-06', 'demo.minhanh@pcstore.test', 0, 'CONFIRMED', 'Nguyễn Minh Anh', '0901234567', '12 Nguyễn Trãi, Hà Nội')
), seed_lines(order_key, product_name, quantity) AS (VALUES
    ('demo-order-01', 'AMD Ryzen 5 5600', 1),
    ('demo-order-01', 'MSI B550M PRO-VDH', 1),
    ('demo-order-01', 'Kingston FURY Beast KF552C40BB-16', 1),
    ('demo-order-02', 'Samsung 990 PRO 1TB', 1),
    ('demo-order-02', 'MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 1),
    ('demo-order-03', 'DeepCool AG400 ARGB', 1),
    ('demo-order-04', 'Corsair 3000D AIRFLOW Black', 1),
    ('demo-order-05', 'MSI MAG A650BN', 1),
    ('demo-order-06', 'AMD Ryzen 5 7600', 1)
), totals AS (
    SELECT line.order_key, sum(p.price * line.quantity) AS total
    FROM seed_lines line JOIN products p ON p.name = line.product_name
    GROUP BY line.order_key
)
INSERT INTO orders (user_id, order_date, status, total_amount, shipping_name,
                    shipping_phone, shipping_address_text, delivered_at,
                    checkout_idempotency_key, checkout_request_hash)
SELECT u.user_id, CURRENT_TIMESTAMP - make_interval(days => seed.days_ago), seed.status,
       totals.total, seed.recipient, seed.phone, seed.address,
       CASE WHEN seed.status = 'DELIVERED'
            THEN CURRENT_TIMESTAMP - make_interval(days => seed.days_ago - 1)
            ELSE NULL END,
       seed.order_key, repeat('a', 64)
FROM seed_orders seed
JOIN users u ON u.email = seed.email
JOIN totals ON totals.order_key = seed.order_key
WHERE NOT EXISTS (
    SELECT 1 FROM orders existing
    WHERE existing.user_id = u.user_id AND existing.checkout_idempotency_key = seed.order_key
);

WITH seed_lines(order_key, product_name, quantity) AS (VALUES
    ('demo-order-01', 'AMD Ryzen 5 5600', 1),
    ('demo-order-01', 'MSI B550M PRO-VDH', 1),
    ('demo-order-01', 'Kingston FURY Beast KF552C40BB-16', 1),
    ('demo-order-02', 'Samsung 990 PRO 1TB', 1),
    ('demo-order-02', 'MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 1),
    ('demo-order-03', 'DeepCool AG400 ARGB', 1),
    ('demo-order-04', 'Corsair 3000D AIRFLOW Black', 1),
    ('demo-order-05', 'MSI MAG A650BN', 1),
    ('demo-order-06', 'AMD Ryzen 5 7600', 1)
)
INSERT INTO order_items (order_id, product_id, quantity, base_unit_price, unit_price)
SELECT o.order_id, p.product_id, seed.quantity, p.price, p.price
FROM seed_lines seed
JOIN orders o ON o.checkout_idempotency_key = seed.order_key
JOIN products p ON p.name = seed.product_name
ON CONFLICT (order_id, product_id) DO NOTHING;

INSERT INTO payments (order_id, method, amount, status, paid_at)
SELECT o.order_id, 'COD', o.total_amount,
       CASE WHEN o.status = 'DELIVERED' THEN 'PAID' ELSE 'PENDING' END,
       CASE WHEN o.status = 'DELIVERED' THEN o.delivered_at ELSE NULL END
FROM orders o
WHERE o.checkout_idempotency_key LIKE 'demo-order-%'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.order_id);

WITH seed_reviews(order_key, product_name, rating, content) AS (VALUES
    ('demo-order-01', 'AMD Ryzen 5 5600', 5, 'Chạy ổn định, nhiệt độ tốt với cấu hình dùng hằng ngày.'),
    ('demo-order-01', 'MSI B550M PRO-VDH', 4, 'Bo mạch dễ lắp đặt và đủ cổng kết nối cần thiết.'),
    ('demo-order-01', 'Kingston FURY Beast KF552C40BB-16', 5, 'Bộ nhớ hoạt động đúng thông số, đóng gói cẩn thận.'),
    ('demo-order-02', 'Samsung 990 PRO 1TB', 5, 'Tốc độ đọc ghi nhanh và cài đặt đơn giản.'),
    ('demo-order-02', 'MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 4, 'Hiệu năng chơi game tốt, quạt chạy khá êm.')
)
INSERT INTO product_reviews (order_item_id, rating, content, status)
SELECT i.order_item_id, seed.rating, seed.content, 'PUBLISHED'
FROM seed_reviews seed
JOIN orders o ON o.checkout_idempotency_key = seed.order_key AND o.status = 'DELIVERED'
JOIN products p ON p.name = seed.product_name
JOIN order_items i ON i.order_id = o.order_id AND i.product_id = p.product_id
ON CONFLICT (order_item_id) DO NOTHING;
