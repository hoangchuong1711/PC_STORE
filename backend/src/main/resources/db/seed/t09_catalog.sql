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

-- 6. Them anh chinh va anh phu gallery cho san pham.
-- Su dung ON CONFLICT de cap nhat anh chinh (sort_order = 0) va bo sung anh phu (sort_order >= 1) an toan.
INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT p.product_id, seed.image_url, seed.is_primary, seed.sort_order
FROM (VALUES
    ('AMD Ryzen 5 5600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-5600-1_cc489afe754e4bee9479a0f465c19ad8_2d93e97db43746a3a0985ec1fe0ed249.png', TRUE, 0),
    ('AMD Ryzen 5 5600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-5600-2_7437042f90ac4859b1d269d62a3394fe_564ae5f60dd24b96b9df90b32aaacc29.png', FALSE, 1),
    ('AMD Ryzen 7 5700X', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-5700x-2_c166a4e5ff604eab87a370e7078896df_4051c248b08344eebfdd0b538eff9c2b.png', TRUE, 0),
    ('AMD Ryzen 7 5700X', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-5700x-1_e49a228eeea242afb12a8848a4746f37_cb3aa982b8034cd6876c2ba6f70ab24b.png', FALSE, 1),
    ('AMD Ryzen 5 7600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-7600-1_fea6e6c8d31a452fb221d1d78261bc47_3169b43038fd4de98a0d0e32feca33a0.png', TRUE, 0),
    ('AMD Ryzen 5 7600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-7600-2_b9ef1fcd62bd40c3a53727c8eb60da6c_49c84e1a94f04de3b0eec3836ed4e262.png', FALSE, 1),
    ('AMD Ryzen 5 7600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-7600-3_b21c74b8c1e446fbb41c0a568072aa2a_14bc09a668fb4aeb88c9d040b3c91cf7.png', FALSE, 2),
    ('AMD Ryzen 5 7600', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-5-7600-4_cba206ed735c49f785a21149e986a4a9_1cc2eb0d384a4bd299e4dd48abd28a84.png', FALSE, 3),
    ('AMD Ryzen 7 7700', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-7700-1_b5fe209e78084b978058d105a7c29ff3_3e536376e6fb40228a3455582b7c5756.png', TRUE, 0),
    ('AMD Ryzen 7 7700', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-7700-2_86af12d393d1469bade4d2245eb4732d_243c9fdf5d1e4dada80a433e9e965b3f.png', FALSE, 1),
    ('AMD Ryzen 7 7700', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-7700-3_971a2a0161fc411f93b0e05d128a41cd_5de1d25fc4d84964a124e1eb25e0160c.png', FALSE, 2),
    ('AMD Ryzen 7 7700', 'https://product.hstatic.net/200000722513/product/gearvn-amd-ryzen-7-7700-4_7e1e856667c34c6b9d6795d4f7e5f1ce_374f6c1c453f4716acf18b6e1adee197.png', FALSE, 3),
    ('AMD Ryzen 5 7600X', 'https://product.hstatic.net/200000722513/product/ryzen_5_-_1_be51e69b02cf4ed78a758a6337e56a27_ae6fad038dff4fa985e2e4b86abc8d85.jpg', TRUE, 0),
    ('AMD Ryzen 5 7600X', 'https://product.hstatic.net/200000722513/product/ryzen_5_-_2_b53ea102cbc34ed78a62d23d14cf83e9_676dfc4e441d41c08dbb3a0b26ab5f15.jpg', FALSE, 1),
    ('AMD Ryzen 5 7600X', 'https://product.hstatic.net/200000722513/product/ryzen_5_-_3_53bef88cf04e407b8d578a2d0c7acbf7_3fcec5467f014f868841da28e8e9d66a.jpg', FALSE, 2),
    ('AMD Ryzen 5 7600X', 'https://product.hstatic.net/200000722513/product/ryzen_5_-_4_851e05a5c72d4a34877e0993c7a44c06_b83d56bddf51402a9bec6e06bb921138.jpg', FALSE, 3),
    ('MSI B550M PRO-VDH', 'https://cdn.hstatic.net/products/200000722513/gearvn-bo-mach-chu-msi-b550m-pro-vdh-1_416082a228c34dd59315f8f75ee30c4b.png', TRUE, 0),
    ('MSI B550M PRO-VDH', 'https://cdn.hstatic.net/products/200000722513/gearvn-bo-mach-chu-msi-b550m-pro-vdh-2_631f3d86c8c449d796e65d401d0cb730.png', FALSE, 1),
    ('MSI B550M PRO-VDH', 'https://cdn.hstatic.net/products/200000722513/gearvn-bo-mach-chu-msi-b550m-pro-vdh-3_41eaed8b3f0d4fa49d457cb82b540855.png', FALSE, 2),
    ('MSI B550M PRO-VDH', 'https://cdn.hstatic.net/products/200000722513/gearvn-bo-mach-chu-msi-b550m-pro-vdh-4_22f884b5bc91431cac7f8241bdedf6f9.png', FALSE, 3),
    ('ASUS TUF GAMING B550M-PLUS', 'https://product.hstatic.net/200000722513/product/gearvn-tuf-gaming-b550m-plus-0212_fa50bab113064b8d9bc3c24922f4d2dc_350de225bc734bb5b9279e656c580f77.jpg', TRUE, 0),
    ('ASUS TUF GAMING B550M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b550m-plus_35e8e353d95544d0899ff92cfc497456_86a07cbed6b44d82a973358afbad2685.jpg', FALSE, 1),
    ('ASUS TUF GAMING B550M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b550m-plus-_bfd612a5f18a4fd1bd6105b33b3ef836_d5856310149a4a99b69e82878e2069dd.jpg', FALSE, 2),
    ('ASUS TUF GAMING B550M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b550m-plus-2_6a27407acc2c4547b03f18a3edf0e272_d3ba48a7c489417281f1699df15047a7.jpg', FALSE, 3),
    ('ASUS TUF GAMING B650-PLUS WIFI', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650-plus-wifi-01_a9f9e1e8aee54cafb13a1de3dc3bfadf_b95911527b4c4d38a71af06317d3cda9.jpg', TRUE, 0),
    ('ASUS TUF GAMING B650-PLUS WIFI', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650-plus-wifi-02_539b2188957e4a6f9eb328927bc1a67f_90f313de24a84b9c8603e68b4bf27c38.jpg', FALSE, 1),
    ('ASUS TUF GAMING B650-PLUS WIFI', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650-plus-wifi-03_7e8bdbbe64384deb9f0b48ef5a0e1481_f7c6e3dc4de544bb96ff87315945c2b0.jpg', FALSE, 2),
    ('ASUS TUF GAMING B650-PLUS WIFI', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650-plus-wifi-04_651207f3917244e1bf3a2c9056199b62_6499b5aaca634d19b5728bf53d6c10f2.jpg', FALSE, 3),
    ('ASUS TUF GAMING B650M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650m-plus-01_5dfde27d6c6041d49086fab5c558f80b_7f5bf3382a6d4037a56b22e8cbd6ce1a.jpg', TRUE, 0),
    ('ASUS TUF GAMING B650M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650m-plus-02_5e943ad61d9f4049b1159b9ecbd348d8_35198aecac994aa287d15d9298b2a9bf.jpg', FALSE, 1),
    ('ASUS TUF GAMING B650M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650m-plus-03_78aef0d232154866a3e9672a20983948_badbdc2152774d40b6bf8501e2bfe54e.jpg', FALSE, 2),
    ('ASUS TUF GAMING B650M-PLUS', 'https://product.hstatic.net/200000722513/product/tuf-gaming-b650m-plus-04_6966ed19fd164316ab5acbacc4f2b6dd_2c31674eec7244a7ae42b61804f1b68d.jpg', FALSE, 3),
    ('ASUS PRIME B650M-A-CSM', 'https://product.hstatic.net/200000722513/product/tai_xuong__5__0262b65a9d5c4fb29139af0c644a10c4.png', TRUE, 0),
    ('ASUS PRIME B650M-A-CSM', 'https://product.hstatic.net/200000722513/product/tai_xuong__1__b69e1a9cc26644aab9aa46241fb2c565.png', FALSE, 1),
    ('ASUS PRIME B650M-A-CSM', 'https://product.hstatic.net/200000722513/product/tai_xuong__2__3d87dc1f11dd4439beef298a7b1512fa.png', FALSE, 2),
    ('ASUS PRIME B650M-A-CSM', 'https://product.hstatic.net/200000722513/product/tai_xuong__3__136aa01549a04fbc9d9f147e00782187.png', FALSE, 3),
    ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 'https://cdn.hstatic.net/products/200000722513/earvn-ram-corsair-vengeance-lpx-16gb-3200mhz-ddr4-cmk16gx4m1e3200c16-1_c13698bde1ce4ba7946fdbbe32cf7fd4.png', TRUE, 0),
    ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 'https://cdn.hstatic.net/products/200000722513/earvn-ram-corsair-vengeance-lpx-16gb-3200mhz-ddr4-cmk16gx4m1e3200c16-2_9c412ad389b14e2fa4f7daca363d352e.png', FALSE, 1),
    ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 'https://cdn.hstatic.net/products/200000722513/earvn-ram-corsair-vengeance-lpx-16gb-3200mhz-ddr4-cmk16gx4m1e3200c16-3_209e3e54b923467cb9c02d038c436499.png', FALSE, 2),
    ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'https://cdn.hstatic.net/products/200000722513/vn-ram-g-skill-trident-z-32gb-2x16gb-3200mhz-ddr4-f4-3200c16d-32gtzr-1_2067aaca117543049deaf6ee1f24c86a.png', TRUE, 0),
    ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'https://cdn.hstatic.net/products/200000722513/vn-ram-g-skill-trident-z-32gb-2x16gb-3200mhz-ddr4-f4-3200c16d-32gtzr-2_5ebca5e285194d818d2cebf13358acbf.png', FALSE, 1),
    ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'https://cdn.hstatic.net/products/200000722513/vn-ram-g-skill-trident-z-32gb-2x16gb-3200mhz-ddr4-f4-3200c16d-32gtzr-3_e7aad3024112493e8c2b245dc3520bb9.jpg', FALSE, 2),
    ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'https://cdn.hstatic.net/products/200000722513/vn-ram-g-skill-trident-z-32gb-2x16gb-3200mhz-ddr4-f4-3200c16d-32gtzr-4_f613892340fa48dd87709333b950d468.jpg', FALSE, 3),
    ('Kingston FURY Beast KF552C40BB-16', 'https://product.hstatic.net/200000722513/product/duct-memory-beast-ddr5-single-1-zm-lg_3bd9db84b0824b6f8dfa02c7db1ebfa4_ac6abfbd759843e58de934450733ae08.jpg', TRUE, 0),
    ('Kingston FURY Beast KF552C40BB-16', 'https://product.hstatic.net/200000722513/product/kingston_d5_1_273538627de24601a4edc0beef305f2f_e3d227a256114e4699ef2353e1e0f2c6.jpg', FALSE, 1),
    ('Kingston FURY Beast KF552C40BB-16', 'https://product.hstatic.net/200000722513/product/kingston_d5_2_8b1515f12e3345d7bbe33d62a53323a0_d3caf772576e41759e443f0c3d29750e.jpg', FALSE, 2),
    ('Kingston FURY Beast KF556C40BBK2-32', 'https://product.hstatic.net/200000722513/product/kingston-fury-beast-2x16gb-bus-5600-1_29263ea664bd4055b66400dbf4782bdd_aeb558f0826a4b65b3ed91ba08d8260e.png', TRUE, 0),
    ('Kingston FURY Beast KF556C40BBK2-32', 'https://product.hstatic.net/200000722513/product/kingston-fury-beast-2x16gb-bus-5600-2_3cd4932fa54749a0ba8c10805ff2c9af_74fa770c17004070941c6fdb6d68fce8.png', FALSE, 1),
    ('Kingston FURY Beast KF556C40BBK2-32', 'https://product.hstatic.net/200000722513/product/duct-memory-beast-ddr5-single-1-zm-lg_3bd9db84b0824b6f8dfa02c7db1ebfa4_ac6abfbd759843e58de934450733ae08.jpg', FALSE, 2),
    ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'https://product.hstatic.net/200000722513/product/gearvn-corsair-vengeance-rgb-ddr-5600-ddr5-6_e6d7b18ac5ef482c9459e38f10add37f.png', TRUE, 0),
    ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'https://product.hstatic.net/200000722513/product/gearvn-corsair-vengeance-rgb-ddr-5600-ddr5-5_6e319950a8e14231b28a416076c94951.png', FALSE, 1),
    ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'https://product.hstatic.net/200000722513/product/gearvn-corsair-vengeance-rgb-ddr-5600-ddr5-1_0e571601b6f34326805ddc6969837940.png', FALSE, 2),
    ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'https://product.hstatic.net/200000722513/product/gearvn-corsair-vengeance-rgb-ddr-5600-ddr5-2_7c998aa6a1514ee08569b82b05c99e53.png', FALSE, 3),
    ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'https://product.hstatic.net/200000722513/product/rtx_4060_ti_ventus_2x_black_8g_oc_a58f8c2f1e184e28b4554bf82a8b1ee7.png', TRUE, 0),
    ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'https://product.hstatic.net/200000722513/product/thiet_ke_chua_co_ten_7c4a5e272a8a4918b14b22f1ff8371d8_55a3f37a454c48d4a487168fce109a65.png', FALSE, 1),
    ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'https://product.hstatic.net/200000722513/product/1024__1__eb13d1a40e3b40a2a12232ba281fcd35_7e7ad0fb5a4d4b80bb86dcf62eb4b20c.png', FALSE, 2),
    ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'https://product.hstatic.net/200000722513/product/1024__2__64a613646a9146b19d3c250d707917a7_2085e10dfffb4bdabfc2043211421ca2.png', FALSE, 3),
    ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'https://product.hstatic.net/200000722513/product/rtx_4070_ventus_2x_12gb_oc_6b2050cb8c6a4cbea2b5e2975cc04c48.png', TRUE, 0),
    ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'https://product.hstatic.net/200000722513/product/1_696883c1ba024e94858955b099c374f6_b0ded062d664409fac15e986dbb27efc.jpg', FALSE, 1),
    ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'https://product.hstatic.net/200000722513/product/2_43506a84594a4d2cbce51279805be03d_ba68803db53a4ce69e0638535250552c.jpg', FALSE, 2),
    ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'https://product.hstatic.net/200000722513/product/3_b1906b61471a49f9aebb8451ba5efc3b_bed173df480e46348afc26b9a3b2a490.jpg', FALSE, 3),
    ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'https://product.hstatic.net/200000722513/product/1024_9f2367d9d41d4fa7870140e7a9f0c85e.png', TRUE, 0),
    ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'https://product.hstatic.net/200000722513/product/1024__2__f5a8a31f03074e61a7af1f38b2008101.png', FALSE, 1),
    ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'https://product.hstatic.net/200000722513/product/1024__1__3e3733f91ade4956b027a5c39db6b41c.png', FALSE, 2),
    ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'https://product.hstatic.net/200000722513/product/1024__3__944bc07157fe42a2a5734210e94582db.png', FALSE, 3),
    ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 'https://cdn.hstatic.net/products/200000722513/gearvn-card-man-hinh-msi-geforce-rtx-5060-ventus-2x-oc-8gb-1_e9b39ab2208346618f66951c5bab8bf0.png', TRUE, 0),
    ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 'https://cdn.hstatic.net/products/200000722513/gearvn-card-man-hinh-msi-geforce-rtx-5060-ventus-2x-oc-8gb-2_d881c7a1286e4497b6d2f607c0892725.png', FALSE, 1),
    ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 'https://cdn.hstatic.net/products/200000722513/gearvn-card-man-hinh-msi-geforce-rtx-5060-ventus-2x-oc-8gb-3_01be6ef884784724bc682f8dfc8c5307.png', FALSE, 2),
    ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 'https://cdn.hstatic.net/products/200000722513/gearvn-card-man-hinh-msi-geforce-rtx-5060-ventus-2x-oc-8gb-4_d6458d64fa5f457589095db1b6d31a2e.png', FALSE, 3),
    ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'https://product.hstatic.net/200000722513/product/1024__15__b75c9235196f49f3b05ec0d7bebebafc.png', TRUE, 0),
    ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'https://product.hstatic.net/200000722513/product/1024__18__566cabf042b544278e9112fac40ba22b.png', FALSE, 1),
    ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'https://product.hstatic.net/200000722513/product/1024__17__559850755de3470094f918b6981f1b6f.png', FALSE, 2),
    ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'https://product.hstatic.net/200000722513/product/1024__16__e49a5818148b4478ba063b3e28d1f59c.png', FALSE, 3),
    ('Samsung 970 EVO Plus 250GB', 'https://product.hstatic.net/200000722513/product/70-evo-plus-250gb-ssd-m.2-nvme-gearvn_ebf82e635e2e4ec685b5b1401bdcd2e3_46e1f62edef94e69a007175b0ef1fe38.jpg', TRUE, 0),
    ('Samsung 970 EVO Plus 250GB', 'https://product.hstatic.net/200000722513/product/970-evo-plus-06-54a4704c-12a9-418a-9926-e37380dd2341_3f5594574f27407a87a7229ac9127d4a.jpg', FALSE, 1),
    ('Samsung 970 EVO Plus 250GB', 'https://product.hstatic.net/200000722513/product/970evo_500gb_plus_gearvn_ba48ea227ab34e799b731eedec5884ba.png', FALSE, 2),
    ('Samsung 970 EVO Plus 500GB', 'https://product.hstatic.net/200000722513/product/970evo_500gb_plus_gearvn_ba48ea227ab34e799b731eedec5884ba.png', TRUE, 0),
    ('Samsung 970 EVO Plus 500GB', 'https://product.hstatic.net/200000722513/product/970-evo-plus-06-54a4704c-12a9-418a-9926-e37380dd2341_3f5594574f27407a87a7229ac9127d4a.jpg', FALSE, 1),
    ('Samsung 970 EVO Plus 500GB', 'https://product.hstatic.net/200000722513/product/70-evo-plus-250gb-ssd-m.2-nvme-gearvn_ebf82e635e2e4ec685b5b1401bdcd2e3_46e1f62edef94e69a007175b0ef1fe38.jpg', FALSE, 2),
    ('Samsung 990 PRO 1TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-1_fbe51100e12d46e48c54086f36c81669.png', TRUE, 0),
    ('Samsung 990 PRO 1TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-2_f1ea018db39342cbb3bc3e4cf05c8c29.png', FALSE, 1),
    ('Samsung 990 PRO 1TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-3_5a69abec26e44c5296ed41a04cfba234.png', FALSE, 2),
    ('Samsung 990 PRO 1TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-4_f40c08c21e774b90a508c80266962c6c.png', FALSE, 3),
    ('Samsung 990 PRO 2TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-2tb-pcie-gen4-nvme-mz-v9p2t0bw-1_c55afd675d144fccb41b146cfb2ef866.png', TRUE, 0),
    ('Samsung 990 PRO 2TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-2_f1ea018db39342cbb3bc3e4cf05c8c29.png', FALSE, 1),
    ('Samsung 990 PRO 2TB', 'https://cdn.hstatic.net/products/200000722513/gearvn-o-cung-ssd-samsung-990-pro-1tb-pcie-gen4-nvme-mz-v9p1t0bw-3_5a69abec26e44c5296ed41a04cfba234.png', FALSE, 2),
    ('Samsung 990 PRO 4TB', 'https://product.hstatic.net/200000722513/product/vn-990pro-nvme-m2-ssd-mz-v9p4t0b_462c6dc3a7f843f4a8a8994fb0cda0dd.png', TRUE, 0),
    ('Samsung 990 PRO 4TB', 'https://product.hstatic.net/200000722513/product/vn-990pro-nvme-m2-ssd-mz-v9p4t0b__1__43f8b6eb6da14eec8789eb0c6355f6ac.png', FALSE, 1),
    ('Samsung 990 PRO 4TB', 'https://product.hstatic.net/200000722513/product/vn-990pro-nvme-m2-ssd-mz-v9p4t0b__2__47fc41796ffa4c20848ccaccfc7d01c7.png', FALSE, 2),
    ('Samsung 990 PRO 4TB', 'https://product.hstatic.net/200000722513/product/vn-990pro-nvme-m2-ssd-mz-v9p4t0b__3__6be2da12adb145f0901041df2b0d723f.png', FALSE, 3),
    ('MSI MAG A650BN', 'https://product.hstatic.net/200000722513/product/1_af69a1451abb4e0e90ef054fae764f35_5339e9f699bd4933b97a1079bc656e3d.jpg', TRUE, 0),
    ('MSI MAG A650BN', 'https://product.hstatic.net/200000722513/product/2_999aced097784b57b593238d90271715_513fbb4b3c8d47e99219a638121e489b.jpg', FALSE, 1),
    ('MSI MAG A650BN', 'https://product.hstatic.net/200000722513/product/3_b88b6cd35d5b4247b87da94be93cb0d5_531a8500a18e4225bda91e4c92753570.jpg', FALSE, 2),
    ('MSI MAG A650BN', 'https://product.hstatic.net/200000722513/product/4_42dc4871043e4a909467ba0be015fc64_e5bb2ec680da4d9eb20b8300972e1ee9.jpg', FALSE, 3),
    ('DeepCool PK750D', 'https://product.hstatic.net/200000722513/product/01_fb064b3bf89d474da16960ca529c7a09.png', TRUE, 0),
    ('DeepCool PK750D', 'https://product.hstatic.net/200000722513/product/02_3ad9d79883f641bbb545aa61cd9dfbff.png', FALSE, 1),
    ('DeepCool PK750D', 'https://product.hstatic.net/200000722513/product/03_7f55f3d9d9634254bb2fc2fcd7359a9b.png', FALSE, 2),
    ('DeepCool PK750D', 'https://product.hstatic.net/200000722513/product/04_66dbda029d274733b424aa2f6b9e41a9.png', FALSE, 3),
    ('MSI MAG A750GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__12__b8053d622a26445d82bce20517424f05.jpg', TRUE, 0),
    ('MSI MAG A750GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__13__0262e35e40514bae8f5dd17b0ef157c3.jpg', FALSE, 1),
    ('MSI MAG A750GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__11__d8db0cbc3b4941fd8d14f026f74ef59a.jpg', FALSE, 2),
    ('MSI MAG A750GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__10__f38a6e31bada487f8130dcb4eafccce4.jpg', FALSE, 3),
    ('MSI MAG A850GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024_0920b4ad0bce4347aec42163de5ee9d6.png', TRUE, 0),
    ('MSI MAG A850GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__3__9edc159210e141b19e14dc98fe5af614.png', FALSE, 1),
    ('MSI MAG A850GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__2__06259bf04ca747fbbb9d9f89444ea893.png', FALSE, 2),
    ('MSI MAG A850GL PCIE5', 'https://product.hstatic.net/200000722513/product/1024__1__7c071f30120248758db28aa8b99bdc8e.png', FALSE, 3),
    ('NZXT C750 Gold NP-C750M', 'https://product.hstatic.net/200000722513/product/c-series-psu-c750-vents-down-right-45_f40e187a63fd40e5b697aeb514f0b34a_67a87cb3bba141878ef10d61f7b69b71.jpg', TRUE, 0),
    ('NZXT C750 Gold NP-C750M', 'https://product.hstatic.net/200000722513/product/c-series-psu-c750-vents-down-left-45_91efdedfa4834526b57433cd99c52e0e_9ee014348f534697b73adec24825c5ab.jpg', FALSE, 1),
    ('NZXT C750 Gold NP-C750M', 'https://product.hstatic.net/200000722513/product/c-series-psu-c750-vents-down-ports_99f965570989466aaea2c7578a1871d7_015038225fcd47ec896c0e74ca9a0f84.jpg', FALSE, 2),
    ('NZXT C750 Gold NP-C750M', 'https://product.hstatic.net/200000722513/product/c-series-psu-ac-panel-1_25381015f4584f69b2b081cadce03f8c_8f51993be6d643d5a2e8811509fa1cbf.jpg', FALSE, 3),
    ('Corsair 3000D AIRFLOW Black', 'https://product.hstatic.net/200000722513/product/11-139-192-07_16c7aeb63df143f1bde5512e8ec2aacd.png', TRUE, 0),
    ('Corsair 3000D AIRFLOW Black', 'https://product.hstatic.net/200000722513/product/3000d_af_black_render_10_fad5d4b0117a4633942349d978bf55c0.png', FALSE, 1),
    ('Corsair 3000D AIRFLOW Black', 'https://product.hstatic.net/200000722513/product/8a49f9a8d2c25a580648fa1200fb99fe_e077677693454a28a78d2b48ef7d89d9.png', FALSE, 2),
    ('Corsair 3000D AIRFLOW Black', 'https://product.hstatic.net/200000722513/product/3000d_af_black_render_12_8bb7b2ab206b4c9295ab818459c638af.png', FALSE, 3),
    ('Corsair 3000D AIRFLOW White', 'https://product.hstatic.net/200000722513/product/images_70176050384d4288a800c8c04f38f1de.jpg', TRUE, 0),
    ('Corsair 3000D AIRFLOW White', 'https://product.hstatic.net/200000722513/product/images__5__9fb720479ab84598a04f542d9d0a5c21.jpg', FALSE, 1),
    ('Corsair 3000D AIRFLOW White', 'https://product.hstatic.net/200000722513/product/images__3__823d4ef94ec941aca392764d44ae5a7c.jpg', FALSE, 2),
    ('Corsair 3000D AIRFLOW White', 'https://product.hstatic.net/200000722513/product/images__2__f3f27fa11c364446ac074f0ae670821e.jpg', FALSE, 3),
    ('NZXT H5 Flow Black C-H51FB-01', 'https://product.hstatic.net/200000722513/product/6138122-h5-flow-left-side-empty-black_137212fac24d4253811ab42ba93f67bc_71332a7549c4443c89373e1f7a9aaade.png', TRUE, 0),
    ('NZXT H5 Flow Black C-H51FB-01', 'https://product.hstatic.net/200000722513/product/1666138916-h5-flow-hero-black_3a74fcbe7b7446f291b06abdb875cc08_faf0d6f488aa49a1a5c6415790f91b35.png', FALSE, 1),
    ('NZXT H5 Flow Black C-H51FB-01', 'https://product.hstatic.net/200000722513/product/1666138967-h5-flow-right-side-black_0ec528fd0aee4f7aa67d047990a057f0_2bab6c25bf3d42e28ac9b07ef7f94833.png', FALSE, 2),
    ('NZXT H5 Flow Black C-H51FB-01', 'https://product.hstatic.net/200000722513/product/1666138946-h5-flow-io-black_d819d09f53ee48c886a10570f6dbddbe_42c5c047fbbd4879a3e47be57e227f6c.png', FALSE, 3),
    ('NZXT H5 Flow White C-H51FW-01', 'https://product.hstatic.net/200000722513/product/6138867-h5-flow-left-side-empty-white_de7212e168724936aa3e6c402d1430bf_7f846edeaa0b4e36ad1783aea29cd5a2.png', TRUE, 0),
    ('NZXT H5 Flow White C-H51FW-01', 'https://product.hstatic.net/200000722513/product/1666138830-h5-flow-hero-white_b07a47e4546048be848148c351a0bb9a_a8377d3a44e54b488d3a2ce298efec60.png', FALSE, 1),
    ('NZXT H5 Flow White C-H51FW-01', 'https://product.hstatic.net/200000722513/product/1666138879-h5-flow-right-side-white_58baf915cf5d4c39871bf038efda190f_476ab0386f9e4b3ea3d2b5125d0a203e.png', FALSE, 2),
    ('NZXT H5 Flow White C-H51FW-01', 'https://product.hstatic.net/200000722513/product/1666138858-h5-flow-io-white_2fba7eed6cd64fadb1e1a70bc082de1e_6c26fda183a44d10987e4b8c021305b8.png', FALSE, 3),
    ('Corsair 3500X Black', 'https://product.hstatic.net/200000722513/product/3500x_blk_01_1f55ef1bec404d95be8d62810eb42ac0.png', TRUE, 0),
    ('Corsair 3500X Black', 'https://product.hstatic.net/200000722513/product/3500x_blk_04_50fec6e58bea4c8aa8747b44acd524a8.png', FALSE, 1),
    ('Corsair 3500X Black', 'https://product.hstatic.net/200000722513/product/3500x_blk_03_a8b2772ab1aa4e3897b7909467447cb4.png', FALSE, 2),
    ('Corsair 3500X Black', 'https://product.hstatic.net/200000722513/product/3500x_blk_02_8c5ec3403ce8488991921006a975582d.png', FALSE, 3),
    ('DeepCool AG400 ARGB', 'https://product.hstatic.net/200000722513/product/01_a39d788b15f5476fa499fc95a3e76e9a_5e9d8e8518f34044b63104368b1aa4f1.jpg', TRUE, 0),
    ('DeepCool AG400 ARGB', 'https://product.hstatic.net/200000722513/product/02_b46c8bb75f914dd3a1132037890595e7_585d3fa6901a4124b8679268ccb86277.jpg', FALSE, 1),
    ('DeepCool AG400 ARGB', 'https://product.hstatic.net/200000722513/product/03_87e699adaad048a2908eebbf01d0e04b_eac29ce2138a4672aad80d149fa9346b.jpg', FALSE, 2),
    ('DeepCool AG400 ARGB', 'https://product.hstatic.net/200000722513/product/04_62f9bacf9b0a42c7b6eaf560be637075_ae1e6752e9394e37b82e41a2a732f072.jpg', FALSE, 3),
    ('DeepCool AG400 ARGB WH', 'https://product.hstatic.net/200000722513/product/01__1__f284ed11b3b8443595ced83cba46182e_9c41665b480b4d4aa18ae556b92108e5.jpg', TRUE, 0),
    ('DeepCool AG400 ARGB WH', 'https://product.hstatic.net/200000722513/product/02__1__8596572447e14f7b9435f7ed6437cf6e_3d00545e10cd4bd59f2ad076b1fd0fb6.jpg', FALSE, 1),
    ('DeepCool AG400 ARGB WH', 'https://product.hstatic.net/200000722513/product/03__1__8f5aa00ce3d94c7c911122b9f4ae1284_9f0ed6d8bd5142609eb6e36b3954d827.jpg', FALSE, 2),
    ('DeepCool AG400 ARGB WH', 'https://product.hstatic.net/200000722513/product/04__1__457bc7db56c64944907fdd0b1e027ece_3ceecbebeeb6409daaae568c1c73127e.jpg', FALSE, 3),
    ('DeepCool AK620', 'https://product.hstatic.net/200000722513/product/p_296855e9a89442398a97fac9cf7fefcc_195402b56f334cbebba942a3cd90c8e6.png', TRUE, 0),
    ('DeepCool AK620', 'https://product.hstatic.net/200000722513/product/d_c1616e60227048319da74df27757a41c_b990a119b8ee4dcb9467d449a54a9883.png', FALSE, 1),
    ('DeepCool AK620', 'https://product.hstatic.net/200000722513/product/k_b79c129810634a7c85f60dbf09615b77_c40b91ab6d3f412bbd597fb52d36a6a2.png', FALSE, 2),
    ('DeepCool AK620 WH', 'https://product.hstatic.net/200000722513/product/zasas_861aeb90681b40a985929d061a430260_9dd666f10ed640c4ac20ea0e6045853f.png', TRUE, 0),
    ('DeepCool AK620 WH', 'https://product.hstatic.net/200000722513/product/sdsdd_2590cc1b9ec54bf1b5faf0c1d0e49f8f_b96c0d5f88b9443581c4ac0f360d2583.png', FALSE, 1),
    ('DeepCool AK620 WH', 'https://product.hstatic.net/200000722513/product/fffff_6584bcc4f4084cbf925eac2b5d393332_f0eb927f957048f4b4aecc6d7c0f8284.png', FALSE, 2),
    ('DeepCool AK620 WH', 'https://product.hstatic.net/200000722513/product/xxxx_6443036910614b98919064a145826b61_b3cbc2bc3541413b9cd0dede39cc2da1.png', FALSE, 3),
    ('DeepCool AK620 ZERO DARK', 'https://product.hstatic.net/200000722513/product/ak620zerodark04_e30359ec525d41a4bba1d388f1bb0a7a.png', TRUE, 0),
    ('DeepCool AK620 ZERO DARK', 'https://product.hstatic.net/200000722513/product/06_7bcd5e7c943f4cc7ac3f010a00adec93.png', FALSE, 1),
    ('DeepCool AK620 ZERO DARK', 'https://product.hstatic.net/200000722513/product/03_340917d81e7c48cd97c2b09473960b66.png', FALSE, 2),
    ('DeepCool AK620 ZERO DARK', 'https://product.hstatic.net/200000722513/product/04_30772b20df6d488ea6e7dd4f98d0b1ec.png', FALSE, 3)
) AS seed(name, image_url, is_primary, sort_order)
JOIN products p ON p.name = seed.name
ON CONFLICT (product_id, sort_order) DO UPDATE
SET image_url = EXCLUDED.image_url,
    is_primary = EXCLUDED.is_primary;


-- Lưu toàn bộ dữ liệu nếu tất cả bước trên thành công.
COMMIT;

