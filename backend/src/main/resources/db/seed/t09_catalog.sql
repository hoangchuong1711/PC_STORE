-- Dữ liệu mẫu: 40 sản phẩm, 9 hãng, 8 danh mục (5 sản phẩm mỗi loại).
-- Giá và tồn kho dùng cho demo; đơn vị giá là VND.
-- Thông số và nguồn sản phẩm: docs/data/t09_catalog.json.
-- Chạy sau migration V1 + V2. SQL chỉ thêm dữ liệu còn thiếu.
-- Chạy lại giữ nguyên giá, tồn kho, mô tả, trạng thái và ảnh đã nhập.
-- SKU lưu trong JSON; bảng products hiện đối chiếu bằng tên + hãng + danh mục.
-- PowerShell tại thư mục gốc dự án:
-- docker compose cp backend/src/main/resources/db/seed/t09_catalog.sql db:/tmp/t09_catalog.sql
-- docker compose exec -T db psql -U pc_store_app -d pc_store -v ON_ERROR_STOP=1 -f /tmp/t09_catalog.sql

BEGIN;
SET LOCAL client_encoding = 'UTF8';

-- 1. Kiểm tra xung đột trước khi chèn.
-- T03 chưa có UNIQUE cho tên hãng/danh mục hoặc cột SKU.
-- Nếu không xác định được đúng bản ghi, dừng lại để tránh gắn nhầm sản phẩm.
DO $checks$
BEGIN
    IF EXISTS (
        SELECT 1 FROM brands
        WHERE name IN ('AMD', 'ASUS', 'Corsair', 'DeepCool', 'G.Skill', 'Kingston', 'MSI', 'NZXT', 'Samsung')
        GROUP BY name HAVING count(*) > 1
    ) THEN RAISE EXCEPTION 'T09: duplicate brand name; resolve existing data first'; END IF;

    IF EXISTS (
        SELECT 1 FROM categories
        WHERE name IN ('CASE', 'COOLER', 'CPU', 'GPU', 'MOTHERBOARD', 'PSU', 'RAM', 'STORAGE')
        GROUP BY name HAVING count(*) > 1
    ) THEN RAISE EXCEPTION 'T09: duplicate category name; resolve existing data first'; END IF;

    IF EXISTS (
        SELECT 1 FROM categories c
        JOIN (VALUES
            ('CASE', 'CASE'),
            ('COOLER', 'COOLER'),
            ('CPU', 'CPU'),
            ('GPU', 'GPU'),
            ('MOTHERBOARD', 'MOTHERBOARD'),
            ('PSU', 'PSU'),
            ('RAM', 'RAM'),
            ('STORAGE', 'STORAGE')
        ) AS seed(category_name, component_type) ON c.name = seed.category_name
        WHERE c.component_type IS DISTINCT FROM seed.component_type
    ) THEN RAISE EXCEPTION 'T09: existing category has a conflicting component type'; END IF;

    -- Tên sản phẩm là khóa đối chiếu tạm thời khi CORE chưa có SKU.
    IF EXISTS (
        SELECT 1 FROM products
        WHERE name IN ('AMD Ryzen 5 5600', 'AMD Ryzen 7 5700X', 'AMD Ryzen 5 7600', 'AMD Ryzen 7 7700', 'AMD Ryzen 5 7600X', 'MSI B550M PRO-VDH', 'ASUS TUF GAMING B550M-PLUS', 'ASUS TUF GAMING B650-PLUS WIFI', 'ASUS TUF GAMING B650M-PLUS', 'ASUS PRIME B650M-A-CSM', 'Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 'G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'Kingston FURY Beast KF552C40BB-16', 'Kingston FURY Beast KF556C40BBK2-32', 'Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'MSI GeForce RTX 5060 8G VENTUS 2X OC', 'MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'Samsung 970 EVO Plus 250GB', 'Samsung 970 EVO Plus 500GB', 'Samsung 990 PRO 1TB', 'Samsung 990 PRO 2TB', 'Samsung 990 PRO 4TB', 'MSI MAG A650BN', 'DeepCool PK750D', 'MSI MAG A750GL PCIE5', 'MSI MAG A850GL PCIE5', 'NZXT C750 Gold NP-C750M', 'Corsair 3000D AIRFLOW Black', 'Corsair 3000D AIRFLOW White', 'NZXT H5 Flow Black C-H51FB-01', 'NZXT H5 Flow White C-H51FW-01', 'Corsair 3500X Black', 'DeepCool AG400 ARGB', 'DeepCool AG400 ARGB WH', 'DeepCool AK620', 'DeepCool AK620 WH', 'DeepCool AK620 ZERO DARK')
        GROUP BY name HAVING count(*) > 1
    ) THEN RAISE EXCEPTION 'T09: duplicate product name; resolve existing data first'; END IF;

    IF EXISTS (
        SELECT 1 FROM products p
        JOIN brands b USING (brand_id)
        JOIN categories c USING (category_id)
        JOIN (VALUES
            ('AMD Ryzen 5 5600', 'AMD', 'CPU', 'CPU'),
            ('AMD Ryzen 7 5700X', 'AMD', 'CPU', 'CPU'),
            ('AMD Ryzen 5 7600', 'AMD', 'CPU', 'CPU'),
            ('AMD Ryzen 7 7700', 'AMD', 'CPU', 'CPU'),
            ('AMD Ryzen 5 7600X', 'AMD', 'CPU', 'CPU'),
            ('MSI B550M PRO-VDH', 'MSI', 'MOTHERBOARD', 'MOTHERBOARD'),
            ('ASUS TUF GAMING B550M-PLUS', 'ASUS', 'MOTHERBOARD', 'MOTHERBOARD'),
            ('ASUS TUF GAMING B650-PLUS WIFI', 'ASUS', 'MOTHERBOARD', 'MOTHERBOARD'),
            ('ASUS TUF GAMING B650M-PLUS', 'ASUS', 'MOTHERBOARD', 'MOTHERBOARD'),
            ('ASUS PRIME B650M-A-CSM', 'ASUS', 'MOTHERBOARD', 'MOTHERBOARD'),
            ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 'Corsair', 'RAM', 'RAM'),
            ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'G.Skill', 'RAM', 'RAM'),
            ('Kingston FURY Beast KF552C40BB-16', 'Kingston', 'RAM', 'RAM'),
            ('Kingston FURY Beast KF556C40BBK2-32', 'Kingston', 'RAM', 'RAM'),
            ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'Corsair', 'RAM', 'RAM'),
            ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'MSI', 'GPU', 'GPU'),
            ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'MSI', 'GPU', 'GPU'),
            ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'MSI', 'GPU', 'GPU'),
            ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 'MSI', 'GPU', 'GPU'),
            ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'MSI', 'GPU', 'GPU'),
            ('Samsung 970 EVO Plus 250GB', 'Samsung', 'STORAGE', 'STORAGE'),
            ('Samsung 970 EVO Plus 500GB', 'Samsung', 'STORAGE', 'STORAGE'),
            ('Samsung 990 PRO 1TB', 'Samsung', 'STORAGE', 'STORAGE'),
            ('Samsung 990 PRO 2TB', 'Samsung', 'STORAGE', 'STORAGE'),
            ('Samsung 990 PRO 4TB', 'Samsung', 'STORAGE', 'STORAGE'),
            ('MSI MAG A650BN', 'MSI', 'PSU', 'PSU'),
            ('DeepCool PK750D', 'DeepCool', 'PSU', 'PSU'),
            ('MSI MAG A750GL PCIE5', 'MSI', 'PSU', 'PSU'),
            ('MSI MAG A850GL PCIE5', 'MSI', 'PSU', 'PSU'),
            ('NZXT C750 Gold NP-C750M', 'NZXT', 'PSU', 'PSU'),
            ('Corsair 3000D AIRFLOW Black', 'Corsair', 'CASE', 'CASE'),
            ('Corsair 3000D AIRFLOW White', 'Corsair', 'CASE', 'CASE'),
            ('NZXT H5 Flow Black C-H51FB-01', 'NZXT', 'CASE', 'CASE'),
            ('NZXT H5 Flow White C-H51FW-01', 'NZXT', 'CASE', 'CASE'),
            ('Corsair 3500X Black', 'Corsair', 'CASE', 'CASE'),
            ('DeepCool AG400 ARGB', 'DeepCool', 'COOLER', 'COOLER'),
            ('DeepCool AG400 ARGB WH', 'DeepCool', 'COOLER', 'COOLER'),
            ('DeepCool AK620', 'DeepCool', 'COOLER', 'COOLER'),
            ('DeepCool AK620 WH', 'DeepCool', 'COOLER', 'COOLER'),
            ('DeepCool AK620 ZERO DARK', 'DeepCool', 'COOLER', 'COOLER')
        ) AS seed(product_name, brand_name, category_name, component_type)
            ON p.name = seed.product_name
        WHERE b.name IS DISTINCT FROM seed.brand_name
           OR c.name IS DISTINCT FROM seed.category_name
           OR c.component_type IS DISTINCT FROM seed.component_type
    ) THEN RAISE EXCEPTION 'T09: product name collision with a different brand or category'; END IF;
END
$checks$;

-- 2. Thêm hãng chưa có (9 hãng).
INSERT INTO brands (name, description)
SELECT seed.name, seed.description
FROM (VALUES
    ('AMD', 'Linh kiện máy tính thương hiệu AMD.'),
    ('ASUS', 'Linh kiện máy tính thương hiệu ASUS.'),
    ('Corsair', 'Linh kiện máy tính thương hiệu Corsair.'),
    ('DeepCool', 'Linh kiện máy tính thương hiệu DeepCool.'),
    ('G.Skill', 'Linh kiện máy tính thương hiệu G.Skill.'),
    ('Kingston', 'Linh kiện máy tính thương hiệu Kingston.'),
    ('MSI', 'Linh kiện máy tính thương hiệu MSI.'),
    ('NZXT', 'Linh kiện máy tính thương hiệu NZXT.'),
    ('Samsung', 'Linh kiện máy tính thương hiệu Samsung.')
) AS seed(name, description)
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.name = seed.name);

-- 3. Thêm danh mục chưa có (8 loại linh kiện).
INSERT INTO categories (name, description, component_type)
SELECT seed.name, seed.description, seed.component_type
FROM (VALUES
    ('CASE', 'Vỏ máy tính.', 'CASE'),
    ('COOLER', 'Tản nhiệt CPU.', 'COOLER'),
    ('CPU', 'Bộ xử lý trung tâm.', 'CPU'),
    ('GPU', 'Card đồ họa.', 'GPU'),
    ('MOTHERBOARD', 'Bo mạch chủ.', 'MOTHERBOARD'),
    ('PSU', 'Bộ nguồn máy tính.', 'PSU'),
    ('RAM', 'Bộ nhớ RAM.', 'RAM'),
    ('STORAGE', 'Ổ lưu trữ SSD.', 'STORAGE')
) AS seed(name, description, component_type)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = seed.name);

-- 4. Thêm 40 sản phẩm. JOIN lấy ID hãng/danh mục theo tên, không gán ID cố định.
-- Nhận diện theo tên sản phẩm; không đưa mã công việc vào mô tả.
-- Nếu sản phẩm đã có, giữ nguyên tên, mô tả, giá và trạng thái hiện tại.
INSERT INTO products (name, description, price, status, category_id, brand_id)
SELECT seed.name, seed.description, seed.price, 'ACTIVE', c.category_id, b.brand_id
FROM (VALUES
    ('AMD Ryzen 5 5600',
        'CPU 6 nhân/12 luồng, socket AM4, TDP mặc định 65W.', 2790000, 'CPU', 'AMD'),
    ('AMD Ryzen 7 5700X',
        'CPU 8 nhân/16 luồng, socket AM4, TDP mặc định 65W.', 3990000, 'CPU', 'AMD'),
    ('AMD Ryzen 5 7600',
        'CPU 6 nhân/12 luồng, socket AM5, TDP mặc định 65W.', 4990000, 'CPU', 'AMD'),
    ('AMD Ryzen 7 7700',
        'CPU 8 nhân/16 luồng, socket AM5, TDP mặc định 65W.', 6990000, 'CPU', 'AMD'),
    ('AMD Ryzen 5 7600X',
        'CPU 6 nhân/12 luồng, socket AM5, TDP mặc định 105W.', 5490000, 'CPU', 'AMD'),
    ('MSI B550M PRO-VDH',
        'Mainboard B550, socket AM4, DDR4, 4 khe RAM.', 2290000, 'MOTHERBOARD', 'MSI'),
    ('ASUS TUF GAMING B550M-PLUS',
        'Mainboard B550, socket AM4, DDR4, 4 khe RAM.', 3290000, 'MOTHERBOARD', 'ASUS'),
    ('ASUS TUF GAMING B650-PLUS WIFI',
        'Mainboard B650, socket AM5, DDR5, 4 khe RAM.', 5490000, 'MOTHERBOARD', 'ASUS'),
    ('ASUS TUF GAMING B650M-PLUS',
        'Mainboard B650, socket AM5, DDR5, 4 khe RAM.', 4590000, 'MOTHERBOARD', 'ASUS'),
    ('ASUS PRIME B650M-A-CSM',
        'Mainboard B650, socket AM5, DDR5, 4 khe RAM.', 3590000, 'MOTHERBOARD', 'ASUS'),
    ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16',
        'RAM DDR4 16GB (1 thanh), tốc độ công bố 3200MT/s.', 890000, 'RAM', 'Corsair'),
    ('G.Skill Trident Z RGB F4-3200C16D-32GTZR',
        'RAM DDR4 32GB (2 thanh), tốc độ công bố 3200MT/s.', 1990000, 'RAM', 'G.Skill'),
    ('Kingston FURY Beast KF552C40BB-16',
        'RAM DDR5 16GB (1 thanh), tốc độ công bố 5200MT/s.', 1190000, 'RAM', 'Kingston'),
    ('Kingston FURY Beast KF556C40BBK2-32',
        'RAM DDR5 32GB (2 thanh), tốc độ công bố 5600MT/s.', 2390000, 'RAM', 'Kingston'),
    ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K',
        'RAM DDR5 32GB (2 thanh), tốc độ công bố 5600MT/s.', 2690000, 'RAM', 'Corsair'),
    ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC',
        'GPU 8GB GDDR6, dài 199mm, PSU khuyến nghị 550W.', 10490000, 'GPU', 'MSI'),
    ('MSI GeForce RTX 4070 VENTUS 2X 12G OC',
        'GPU 12GB GDDR6X, dài 242mm, PSU khuyến nghị 650W.', 15490000, 'GPU', 'MSI'),
    ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC',
        'GPU 12GB GDDR6X, dài 242mm, PSU khuyến nghị 650W.', 17990000, 'GPU', 'MSI'),
    ('MSI GeForce RTX 5060 8G VENTUS 2X OC',
        'GPU 8GB GDDR7, dài 197mm, PSU khuyến nghị 550W.', 8990000, 'GPU', 'MSI'),
    ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS',
        'GPU 8GB GDDR7, dài 227mm, PSU khuyến nghị 600W.', 10990000, 'GPU', 'MSI'),
    ('Samsung 970 EVO Plus 250GB',
        'SSD M.2 2280 NVMe 250GB, đọc/ghi tuần tự tối đa 3500/2300MB/s.', 790000, 'STORAGE', 'Samsung'),
    ('Samsung 970 EVO Plus 500GB',
        'SSD M.2 2280 NVMe 500GB, đọc/ghi tuần tự tối đa 3500/3200MB/s.', 1190000, 'STORAGE', 'Samsung'),
    ('Samsung 990 PRO 1TB',
        'SSD M.2 2280 NVMe 1000GB, đọc/ghi tuần tự tối đa 7450/6900MB/s.', 2390000, 'STORAGE', 'Samsung'),
    ('Samsung 990 PRO 2TB',
        'SSD M.2 2280 NVMe 2000GB, đọc/ghi tuần tự tối đa 7450/6900MB/s.', 4290000, 'STORAGE', 'Samsung'),
    ('Samsung 990 PRO 4TB',
        'SSD M.2 2280 NVMe 4000GB, đọc/ghi tuần tự tối đa 7450/6900MB/s.', 7990000, 'STORAGE', 'Samsung'),
    ('MSI MAG A650BN',
        'Nguồn 650W, 80 PLUS BRONZE, non modular.', 1190000, 'PSU', 'MSI'),
    ('DeepCool PK750D',
        'Nguồn 750W, 80 PLUS BRONZE, non modular.', 1190000, 'PSU', 'DeepCool'),
    ('MSI MAG A750GL PCIE5',
        'Nguồn 750W, 80 PLUS GOLD, full modular.', 2390000, 'PSU', 'MSI'),
    ('MSI MAG A850GL PCIE5',
        'Nguồn 850W, 80 PLUS GOLD, full modular.', 2790000, 'PSU', 'MSI'),
    ('NZXT C750 Gold NP-C750M',
        'Nguồn 750W, 80 PLUS GOLD, full modular.', 2590000, 'PSU', 'NZXT'),
    ('Corsair 3000D AIRFLOW Black',
        'Vỏ máy hỗ trợ GPU dài tối đa 360mm, tản khí cao 170mm, radiator tối đa 360mm.', 1590000, 'CASE', 'Corsair'),
    ('Corsair 3000D AIRFLOW White',
        'Vỏ máy hỗ trợ GPU dài tối đa 360mm, tản khí cao 170mm, radiator tối đa 360mm.', 1690000, 'CASE', 'Corsair'),
    ('NZXT H5 Flow Black C-H51FB-01',
        'Vỏ máy hỗ trợ GPU dài tối đa 365mm, tản khí cao 165mm, radiator tối đa 280mm.', 2190000, 'CASE', 'NZXT'),
    ('NZXT H5 Flow White C-H51FW-01',
        'Vỏ máy hỗ trợ GPU dài tối đa 365mm, tản khí cao 165mm, radiator tối đa 280mm.', 2290000, 'CASE', 'NZXT'),
    ('Corsair 3500X Black',
        'Vỏ máy hỗ trợ GPU dài tối đa 425mm, tản khí cao 170mm, radiator tối đa 360mm.', 1990000, 'CASE', 'Corsair'),
    ('DeepCool AG400 ARGB',
        'Tản khí cao 150mm, hỗ trợ AM4/AM5, công suất tản công bố 220W.', 690000, 'COOLER', 'DeepCool'),
    ('DeepCool AG400 ARGB WH',
        'Tản khí cao 150mm, hỗ trợ AM4/AM5, công suất tản công bố 220W.', 790000, 'COOLER', 'DeepCool'),
    ('DeepCool AK620',
        'Tản khí cao 160mm, hỗ trợ AM4/AM5, công suất tản công bố 260W.', 1290000, 'COOLER', 'DeepCool'),
    ('DeepCool AK620 WH',
        'Tản khí cao 160mm, hỗ trợ AM4/AM5, công suất tản công bố 260W.', 1390000, 'COOLER', 'DeepCool'),
    ('DeepCool AK620 ZERO DARK',
        'Tản khí cao 160mm, hỗ trợ AM4/AM5, công suất tản công bố 260W.', 1490000, 'COOLER', 'DeepCool')
) AS seed(name, description, price, category_name, brand_name)
JOIN categories c ON c.name = seed.category_name
JOIN brands b ON b.name = seed.brand_name
WHERE NOT EXISTS (
    SELECT 1 FROM products p
    WHERE p.name = seed.name
);

-- 5. Thêm tồn kho cho sản phẩm chưa có dòng inventory.
-- quantity_on_hand: số lượng trong kho; reserved_quantity: số đã giữ chỗ.
-- Số có thể mua = quantity_on_hand - reserved_quantity.
-- Khi chạy lại, không ghi đè tồn kho đã được chỉnh sửa.
INSERT INTO inventory (product_id, quantity_on_hand, reserved_quantity)
SELECT p.product_id, seed.quantity_on_hand, seed.reserved_quantity
FROM (VALUES
    ('AMD Ryzen 5 5600', 10, 0), -- AMD Ryzen 5 5600
    ('AMD Ryzen 7 5700X', 10, 0), -- AMD Ryzen 7 5700X
    ('AMD Ryzen 5 7600', 10, 0), -- AMD Ryzen 5 7600
    ('AMD Ryzen 7 7700', 10, 0), -- AMD Ryzen 7 7700
    ('AMD Ryzen 5 7600X', 10, 0), -- AMD Ryzen 5 7600X
    ('MSI B550M PRO-VDH', 10, 0), -- MSI B550M PRO-VDH
    ('ASUS TUF GAMING B550M-PLUS', 10, 0), -- ASUS TUF GAMING B550M-PLUS
    ('ASUS TUF GAMING B650-PLUS WIFI', 10, 0), -- ASUS TUF GAMING B650-PLUS WIFI
    ('ASUS TUF GAMING B650M-PLUS', 10, 0), -- ASUS TUF GAMING B650M-PLUS
    ('ASUS PRIME B650M-A-CSM', 10, 0), -- ASUS PRIME B650M-A-CSM
    ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 10, 0), -- Corsair VENGEANCE LPX CMK16GX4M1E3200C16
    ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 10, 0), -- G.Skill Trident Z RGB F4-3200C16D-32GTZR
    ('Kingston FURY Beast KF552C40BB-16', 10, 0), -- Kingston FURY Beast KF552C40BB-16
    ('Kingston FURY Beast KF556C40BBK2-32', 10, 0), -- Kingston FURY Beast KF556C40BBK2-32
    ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 10, 0), -- Corsair VENGEANCE RGB CMH32GX5M2B5600C40K
    ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 10, 0), -- MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC
    ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 10, 0), -- MSI GeForce RTX 4070 VENTUS 2X 12G OC
    ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 10, 0), -- MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC
    ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 10, 0), -- MSI GeForce RTX 5060 8G VENTUS 2X OC
    ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 0, 0), -- MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS
    ('Samsung 970 EVO Plus 250GB', 10, 0), -- Samsung 970 EVO Plus 250GB
    ('Samsung 970 EVO Plus 500GB', 10, 0), -- Samsung 970 EVO Plus 500GB
    ('Samsung 990 PRO 1TB', 10, 0), -- Samsung 990 PRO 1TB
    ('Samsung 990 PRO 2TB', 10, 0), -- Samsung 990 PRO 2TB
    ('Samsung 990 PRO 4TB', 0, 0), -- Samsung 990 PRO 4TB
    ('MSI MAG A650BN', 10, 0), -- MSI MAG A650BN
    ('DeepCool PK750D', 10, 0), -- DeepCool PK750D
    ('MSI MAG A750GL PCIE5', 10, 0), -- MSI MAG A750GL PCIE5
    ('MSI MAG A850GL PCIE5', 10, 0), -- MSI MAG A850GL PCIE5
    ('NZXT C750 Gold NP-C750M', 10, 0), -- NZXT C750 Gold NP-C750M
    ('Corsair 3000D AIRFLOW Black', 10, 0), -- Corsair 3000D AIRFLOW Black
    ('Corsair 3000D AIRFLOW White', 10, 0), -- Corsair 3000D AIRFLOW White
    ('NZXT H5 Flow Black C-H51FB-01', 10, 0), -- NZXT H5 Flow Black C-H51FB-01
    ('NZXT H5 Flow White C-H51FW-01', 10, 0), -- NZXT H5 Flow White C-H51FW-01
    ('Corsair 3500X Black', 10, 0), -- Corsair 3500X Black
    ('DeepCool AG400 ARGB', 10, 0), -- DeepCool AG400 ARGB
    ('DeepCool AG400 ARGB WH', 10, 0), -- DeepCool AG400 ARGB WH
    ('DeepCool AK620', 10, 0), -- DeepCool AK620
    ('DeepCool AK620 WH', 10, 0), -- DeepCool AK620 WH
    ('DeepCool AK620 ZERO DARK', 10, 0) -- DeepCool AK620 ZERO DARK
) AS seed(name, quantity_on_hand, reserved_quantity)
JOIN products p ON p.name = seed.name
WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.product_id);

-- 6. Thêm một ảnh chính cho sản phẩm chưa có ảnh nào.
-- Nếu đã có ảnh, giữ nguyên toàn bộ ảnh hiện tại.
INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT p.product_id, seed.image_url, TRUE, 0
FROM (VALUES
    ('AMD Ryzen 5 5600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-5600-1_cc489afe754e4bee9479a0f465c19ad8_2d93e97db43746a3a0985ec1fe0ed249.png'), -- AMD Ryzen 5 5600
    ('AMD Ryzen 7 5700X', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-5700x-2_c166a4e5ff604eab87a370e7078896df_4051c248b08344eebfdd0b538eff9c2b.png'), -- AMD Ryzen 7 5700X
    ('AMD Ryzen 5 7600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-7600-1_fea6e6c8d31a452fb221d1d78261bc47_3169b43038fd4de98a0d0e32feca33a0.png'), -- AMD Ryzen 5 7600
    ('AMD Ryzen 7 7700', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-7700-1_b5fe209e78084b978058d105a7c29ff3_3e536376e6fb40228a3455582b7c5756.png'), -- AMD Ryzen 7 7700
    ('AMD Ryzen 5 7600X', 'https://product.hstatic.net/200000722513/product/ryzen_5_-_1_be51e69b02cf4ed78a758a6337e56a27_ae6fad038dff4fa985e2e4b86abc8d85.jpg'), -- AMD Ryzen 5 7600X
    ('MSI B550M PRO-VDH', 'https://cdn.hstatic.net/products/200000722513/gearvn-bo-mach-chu-msi-b550m-pro-vdh-1_416082a228c34dd59315f8f75ee30c4b.png'), -- MSI B550M PRO-VDH
    ('ASUS TUF GAMING B550M-PLUS', 'https://product.hstatic.net/200000722513/product/gearvn-tuf-gaming-b550m-plus-0212_fa50bab113064b8d9bc3c24922f4d2dc_350de225bc734bb5b9279e656c580f77.jpg'), -- ASUS TUF GAMING B550M-PLUS
    ('ASUS TUF GAMING B650-PLUS WIFI', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650-plus-wifi-01_a9f9e1e8aee54cafb13a1de3dc3bfadf_b95911527b4c4d38a71af06317d3cda9.jpg'), -- ASUS TUF GAMING B650-PLUS WIFI
    ('ASUS TUF GAMING B650M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650m-plus-01_5dfde27d6c6041d49086fab5c558f80b_7f5bf3382a6d4037a56b22e8cbd6ce1a.jpg'), -- ASUS TUF GAMING B650M-PLUS
    ('ASUS PRIME B650M-A-CSM', 'https://product.hstatic.net/200000722513/product/tai_xuong__5__0262b65a9d5c4fb29139af0c644a10c4.png'), -- ASUS PRIME B650M-A-CSM
    ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 'https://cdn.hstatic.net/products/200000722513/earvn-ram-corsair-vengeance-lpx-16gb-3200mhz-ddr4-cmk16gx4m1e3200c16-1_c13698bde1ce4ba7946fdbbe32cf7fd4.png'), -- Corsair VENGEANCE LPX CMK16GX4M1E3200C16
    ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'https://cdn.hstatic.net/products/200000722513/vn-ram-g-skill-trident-z-32gb-2x16gb-3200mhz-ddr4-f4-3200c16d-32gtzr-1_2067aaca117543049deaf6ee1f24c86a.png'), -- G.Skill Trident Z RGB F4-3200C16D-32GTZR
    ('Kingston FURY Beast KF552C40BB-16', 'https://product.hstatic.net/200000722513/product/duct-memory-beast-ddr5-single-1-zm-lg_3bd9db84b0824b6f8dfa02c7db1ebfa4_ac6abfbd759843e58de934450733ae08.jpg'), -- Kingston FURY Beast KF552C40BB-16
    ('Kingston FURY Beast KF556C40BBK2-32', 'https://product.hstatic.net/200000722513/product/kingston-fury-beast-2x16gb-bus-5600-1_29263ea664bd4055b66400dbf4782bdd_aeb558f0826a4b65b3ed91ba08d8260e.png'), -- Kingston FURY Beast KF556C40BBK2-32
    ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'https://product.hstatic.net/200000722513/product/gearvn-corsair-vengeance-rgb-ddr-5600-ddr5-6_e6d7b18ac5ef482c9459e38f10add37f.png'), -- Corsair VENGEANCE RGB CMH32GX5M2B5600C40K
    ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'https://product.hstatic.net/200000722513/product/rtx_4060_ti_ventus_2x_black_8g_oc_a58f8c2f1e184e28b4554bf82a8b1ee7.png'), -- MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC
    ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'https://product.hstatic.net/200000722513/product/rtx_4070_ventus_2x_12gb_oc_6b2050cb8c6a4cbea2b5e2975cc04c48.png'), -- MSI GeForce RTX 4070 VENTUS 2X 12G OC
    ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'https://product.hstatic.net/200000722513/product/1024_9f2367d9d41d4fa7870140e7a9f0c85e.png'), -- MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC
    ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 'https://cdn.hstatic.net/products/200000722513/gearvn-card-man-hinh-msi-geforce-rtx-5060-ventus-2x-oc-8gb-1_e9b39ab2208346618f66951c5bab8bf0.png'), -- MSI GeForce RTX 5060 8G VENTUS 2X OC
    ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'https://product.hstatic.net/200000722513/product/1024__15__b75c9235196f49f3b05ec0d7bebebafc.png'), -- MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS
    ('Samsung 970 EVO Plus 250GB', 'https://product.hstatic.net/200000722513/product/70-evo-plus-250gb-ssd-m.2-nvme-gearvn_ebf82e635e2e4ec685b5b1401bdcd2e3_46e1f62edef94e69a007175b0ef1fe38.jpg'), -- Samsung 970 EVO Plus 250GB
    ('Samsung 970 EVO Plus 500GB', 'https://product.hstatic.net/200000722513/product/970evo_500gb_plus_gearvn_ba48ea227ab34e799b731eedec5884ba.png'), -- Samsung 970 EVO Plus 500GB
    ('Samsung 990 PRO 1TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-1_fbe51100e12d46e48c54086f36c81669.png'), -- Samsung 990 PRO 1TB
    ('Samsung 990 PRO 2TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-2tb-pcie-gen4-nvme-mz-v9p2t0bw-1_c55afd675d144fccb41b146cfb2ef866.png'), -- Samsung 990 PRO 2TB
    ('Samsung 990 PRO 4TB', 'https://product.hstatic.net/200000722513/product/vn-990pro-nvme-m2-ssd-mz-v9p4t0b_462c6dc3a7f843f4a8a8994fb0cda0dd.png'), -- Samsung 990 PRO 4TB
    ('MSI MAG A650BN', 'https://product.hstatic.net/200000722513/product/1_af69a1451abb4e0e90ef054fae764f35_5339e9f699bd4933b97a1079bc656e3d.jpg'), -- MSI MAG A650BN
    ('DeepCool PK750D', 'https://product.hstatic.net/200000722513/product/01_fb064b3bf89d474da16960ca529c7a09.png'), -- DeepCool PK750D
    ('MSI MAG A750GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__12__b8053d622a26445d82bce20517424f05.jpg'), -- MSI MAG A750GL PCIE5
    ('MSI MAG A850GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024_0920b4ad0bce4347aec42163de5ee9d6.png'), -- MSI MAG A850GL PCIE5
    ('NZXT C750 Gold NP-C750M', 'https://product.hstatic.net/200000722513/product/c-series-psu-c750-vents-down-right-45_f40e187a63fd40e5b697aeb514f0b34a_67a87cb3bba141878ef10d61f7b69b71.jpg'), -- NZXT C750 Gold NP-C750M
    ('Corsair 3000D AIRFLOW Black', 'https://product.hstatic.net/200000722513/product/11-139-192-07_16c7aeb63df143f1bde5512e8ec2aacd.png'), -- Corsair 3000D AIRFLOW Black
    ('Corsair 3000D AIRFLOW White', 'https://product.hstatic.net/200000722513/product/images_70176050384d4288a800c8c04f38f1de.jpg'), -- Corsair 3000D AIRFLOW White
    ('NZXT H5 Flow Black C-H51FB-01', 'https://product.hstatic.net/200000722513/product/6138122-h5-flow-left-side-empty-black_137212fac24d4253811ab42ba93f67bc_71332a7549c4443c89373e1f7a9aaade.png'), -- NZXT H5 Flow Black C-H51FB-01
    ('NZXT H5 Flow White C-H51FW-01', 'https://product.hstatic.net/200000722513/product/6138867-h5-flow-left-side-empty-white_de7212e168724936aa3e6c402d1430bf_7f846edeaa0b4e36ad1783aea29cd5a2.png'), -- NZXT H5 Flow White C-H51FW-01
    ('Corsair 3500X Black', 'https://product.hstatic.net/200000722513/product/3500x_blk_01_1f55ef1bec404d95be8d62810eb42ac0.png'), -- Corsair 3500X Black
    ('DeepCool AG400 ARGB', 'https://product.hstatic.net/200000722513/product/01_a39d788b15f5476fa499fc95a3e76e9a_5e9d8e8518f34044b63104368b1aa4f1.jpg'), -- DeepCool AG400 ARGB
    ('DeepCool AG400 ARGB WH', 'https://product.hstatic.net/200000722513/product/01__1__f284ed11b3b8443595ced83cba46182e_9c41665b480b4d4aa18ae556b92108e5.jpg'), -- DeepCool AG400 ARGB WH
    ('DeepCool AK620', 'https://product.hstatic.net/200000722513/product/p_296855e9a89442398a97fac9cf7fefcc_195402b56f334cbebba942a3cd90c8e6.png'), -- DeepCool AK620
    ('DeepCool AK620 WH', 'https://product.hstatic.net/200000722513/product/zasas_861aeb90681b40a985929d061a430260_9dd666f10ed640c4ac20ea0e6045853f.png'), -- DeepCool AK620 WH
    ('DeepCool AK620 ZERO DARK', 'https://product.hstatic.net/200000722513/product/ak620zerodark04_e30359ec525d41a4bba1d388f1bb0a7a.png') -- DeepCool AK620 ZERO DARK
) AS seed(name, image_url)
JOIN products p ON p.name = seed.name
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.product_id);

-- Lưu toàn bộ dữ liệu nếu tất cả bước trên thành công.
COMMIT;
