-- T22 Builder specs. Generated from docs/data/t09_catalog.json by scripts/generate_t22_seed.py.
-- Run after Flyway V3+ and t09_catalog.sql; use a disposable DB to validate first.
-- Existing spec rows are preserved. This is demo data, not a migration.
BEGIN;
SET LOCAL client_encoding = 'UTF8';
CREATE TEMP TABLE t22_catalog(name text, brand text, component_type text, spec jsonb, support jsonb) ON COMMIT DROP;
INSERT INTO t22_catalog VALUES
  ('AMD Ryzen 5 5600', 'AMD', 'CPU', '{"socketCode":"AM4","cores":6,"threads":12,"baseClockGhz":3.5,"boostClockGhz":4.4,"tdpWatts":65}', '{}'),
  ('AMD Ryzen 7 5700X', 'AMD', 'CPU', '{"socketCode":"AM4","cores":8,"threads":16,"baseClockGhz":3.4,"boostClockGhz":4.6,"tdpWatts":65}', '{}'),
  ('AMD Ryzen 5 7600', 'AMD', 'CPU', '{"socketCode":"AM5","cores":6,"threads":12,"baseClockGhz":3.8,"boostClockGhz":5.1,"tdpWatts":65}', '{}'),
  ('AMD Ryzen 7 7700', 'AMD', 'CPU', '{"socketCode":"AM5","cores":8,"threads":16,"baseClockGhz":3.8,"boostClockGhz":5.3,"tdpWatts":65}', '{}'),
  ('AMD Ryzen 5 7600X', 'AMD', 'CPU', '{"socketCode":"AM5","cores":6,"threads":12,"baseClockGhz":4.7,"boostClockGhz":5.3,"tdpWatts":105}', '{}'),
  ('MSI B550M PRO-VDH', 'MSI', 'MOTHERBOARD', '{"socketCode":"AM4","chipset":"B550","ramType":"DDR4","pcieVersion":"4.0","formFactorCode":"MICRO_ATX","ramSlots":4,"maxRamGb":128}', '{}'),
  ('ASUS TUF GAMING B550M-PLUS', 'ASUS', 'MOTHERBOARD', '{"socketCode":"AM4","chipset":"B550","ramType":"DDR4","pcieVersion":"4.0","formFactorCode":"MICRO_ATX","ramSlots":4,"maxRamGb":128}', '{}'),
  ('ASUS TUF GAMING B650-PLUS WIFI', 'ASUS', 'MOTHERBOARD', '{"socketCode":"AM5","chipset":"B650","ramType":"DDR5","pcieVersion":"4.0","formFactorCode":"ATX","ramSlots":4,"maxRamGb":256}', '{}'),
  ('ASUS TUF GAMING B650M-PLUS', 'ASUS', 'MOTHERBOARD', '{"socketCode":"AM5","chipset":"B650","ramType":"DDR5","pcieVersion":"4.0","formFactorCode":"MICRO_ATX","ramSlots":4,"maxRamGb":256}', '{}'),
  ('ASUS PRIME B650M-A-CSM', 'ASUS', 'MOTHERBOARD', '{"socketCode":"AM5","chipset":"B650","ramType":"DDR5","pcieVersion":"4.0","formFactorCode":"MICRO_ATX","ramSlots":4,"maxRamGb":128}', '{}'),
  ('Corsair VENGEANCE LPX CMK16GX4M1E3200C16', 'Corsair', 'RAM', '{"ramType":"DDR4","capacityGb":16,"speedMhz":3200,"moduleCount":1}', '{}'),
  ('G.Skill Trident Z RGB F4-3200C16D-32GTZR', 'G.Skill', 'RAM', '{"ramType":"DDR4","capacityGb":32,"speedMhz":3200,"moduleCount":2}', '{}'),
  ('Kingston FURY Beast KF552C40BB-16', 'Kingston', 'RAM', '{"ramType":"DDR5","capacityGb":16,"speedMhz":5200,"moduleCount":1}', '{}'),
  ('Kingston FURY Beast KF556C40BBK2-32', 'Kingston', 'RAM', '{"ramType":"DDR5","capacityGb":32,"speedMhz":5600,"moduleCount":2}', '{}'),
  ('Corsair VENGEANCE RGB CMH32GX5M2B5600C40K', 'Corsair', 'RAM', '{"ramType":"DDR5","capacityGb":32,"speedMhz":5600,"moduleCount":2}', '{}'),
  ('MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC', 'MSI', 'GPU', '{"vramGb":8,"memoryType":"GDDR6","interfaceType":"PCIE_4_0","lengthMm":199,"powerConsumptionW":160,"recommendedPsuW":550}', '{}'),
  ('MSI GeForce RTX 4070 VENTUS 2X 12G OC', 'MSI', 'GPU', '{"vramGb":12,"memoryType":"GDDR6X","interfaceType":"PCIE_4_0","lengthMm":242,"powerConsumptionW":200,"recommendedPsuW":650}', '{}'),
  ('MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC', 'MSI', 'GPU', '{"vramGb":12,"memoryType":"GDDR6X","interfaceType":"PCIE_4_0","lengthMm":242,"powerConsumptionW":220,"recommendedPsuW":650}', '{}'),
  ('MSI GeForce RTX 5060 8G VENTUS 2X OC', 'MSI', 'GPU', '{"vramGb":8,"memoryType":"GDDR7","interfaceType":"PCIE_5_0","lengthMm":197,"powerConsumptionW":145,"recommendedPsuW":550}', '{}'),
  ('MSI GeForce RTX 5060 Ti 8G VENTUS 2X OC PLUS', 'MSI', 'GPU', '{"vramGb":8,"memoryType":"GDDR7","interfaceType":"PCIE_5_0","lengthMm":227,"powerConsumptionW":180,"recommendedPsuW":600}', '{}'),
  ('Samsung 970 EVO Plus 250GB', 'Samsung', 'STORAGE', '{"storageType":"SSD","interfaceType":"PCIE_3_0_X4_NVME","capacityGb":250,"readSpeedMBps":3500,"writeSpeedMBps":2300}', '{}'),
  ('Samsung 970 EVO Plus 500GB', 'Samsung', 'STORAGE', '{"storageType":"SSD","interfaceType":"PCIE_3_0_X4_NVME","capacityGb":500,"readSpeedMBps":3500,"writeSpeedMBps":3200}', '{}'),
  ('Samsung 990 PRO 1TB', 'Samsung', 'STORAGE', '{"storageType":"SSD","interfaceType":"PCIE_4_0_X4_NVME","capacityGb":1000,"readSpeedMBps":7450,"writeSpeedMBps":6900}', '{}'),
  ('Samsung 990 PRO 2TB', 'Samsung', 'STORAGE', '{"storageType":"SSD","interfaceType":"PCIE_4_0_X4_NVME","capacityGb":2000,"readSpeedMBps":7450,"writeSpeedMBps":6900}', '{}'),
  ('Samsung 990 PRO 4TB', 'Samsung', 'STORAGE', '{"storageType":"SSD","interfaceType":"PCIE_4_0_X4_NVME","capacityGb":4000,"readSpeedMBps":7450,"writeSpeedMBps":6900}', '{}'),
  ('MSI MAG A650BN', 'MSI', 'PSU', '{"wattage":650,"efficiencyRating":"80_PLUS_BRONZE","modularType":"NON_MODULAR"}', '{}'),
  ('DeepCool PK750D', 'DeepCool', 'PSU', '{"wattage":750,"efficiencyRating":"80_PLUS_BRONZE","modularType":"NON_MODULAR"}', '{}'),
  ('MSI MAG A750GL PCIE5', 'MSI', 'PSU', '{"wattage":750,"efficiencyRating":"80_PLUS_GOLD","modularType":"FULL_MODULAR"}', '{}'),
  ('MSI MAG A850GL PCIE5', 'MSI', 'PSU', '{"wattage":850,"efficiencyRating":"80_PLUS_GOLD","modularType":"FULL_MODULAR"}', '{}'),
  ('NZXT C750 Gold NP-C750M', 'NZXT', 'PSU', '{"wattage":750,"efficiencyRating":"80_PLUS_GOLD","modularType":"FULL_MODULAR"}', '{}'),
  ('Corsair 3000D AIRFLOW Black', 'Corsair', 'CASE', '{"maxGpuLengthMm":360,"maxCoolerHeightMm":170,"maxRadiatorSizeMm":360}', '{"supportedFormFactorCodes":["ATX","MICRO_ATX","MINI_ITX"]}'),
  ('Corsair 3000D AIRFLOW White', 'Corsair', 'CASE', '{"maxGpuLengthMm":360,"maxCoolerHeightMm":170,"maxRadiatorSizeMm":360}', '{"supportedFormFactorCodes":["ATX","MICRO_ATX","MINI_ITX"]}'),
  ('NZXT H5 Flow Black C-H51FB-01', 'NZXT', 'CASE', '{"maxGpuLengthMm":365,"maxCoolerHeightMm":165,"maxRadiatorSizeMm":280}', '{"supportedFormFactorCodes":["ATX","MICRO_ATX","MINI_ITX"]}'),
  ('NZXT H5 Flow White C-H51FW-01', 'NZXT', 'CASE', '{"maxGpuLengthMm":365,"maxCoolerHeightMm":165,"maxRadiatorSizeMm":280}', '{"supportedFormFactorCodes":["ATX","MICRO_ATX","MINI_ITX"]}'),
  ('Corsair 3500X Black', 'Corsair', 'CASE', '{"maxGpuLengthMm":425,"maxCoolerHeightMm":170,"maxRadiatorSizeMm":360}', '{"supportedFormFactorCodes":["ATX","MICRO_ATX","MINI_ITX"]}'),
  ('DeepCool AG400 ARGB', 'DeepCool', 'COOLER', '{"coolerType":"AIR","maxTdpW":220,"heightMm":150,"radiatorSizeMm":null}', '{"supportedSocketCodes":["AM4","AM5"]}'),
  ('DeepCool AG400 ARGB WH', 'DeepCool', 'COOLER', '{"coolerType":"AIR","maxTdpW":220,"heightMm":150,"radiatorSizeMm":null}', '{"supportedSocketCodes":["AM4","AM5"]}'),
  ('DeepCool AK620', 'DeepCool', 'COOLER', '{"coolerType":"AIR","maxTdpW":260,"heightMm":160,"radiatorSizeMm":null}', '{"supportedSocketCodes":["AM4","AM5"]}'),
  ('DeepCool AK620 WH', 'DeepCool', 'COOLER', '{"coolerType":"AIR","maxTdpW":260,"heightMm":160,"radiatorSizeMm":null}', '{"supportedSocketCodes":["AM4","AM5"]}'),
  ('DeepCool AK620 ZERO DARK', 'DeepCool', 'COOLER', '{"coolerType":"AIR","maxTdpW":260,"heightMm":160,"radiatorSizeMm":null}', '{"supportedSocketCodes":["AM4","AM5"]}');
DO $check$ BEGIN
  IF EXISTS (SELECT 1 FROM t22_catalog s LEFT JOIN products p ON p.name=s.name
    LEFT JOIN brands b ON b.brand_id=p.brand_id LEFT JOIN categories c ON c.category_id=p.category_id
    GROUP BY s.name,s.brand,s.component_type HAVING count(p.product_id)<>1
      OR bool_or(b.name IS DISTINCT FROM s.brand OR c.name IS DISTINCT FROM s.component_type
        OR c.component_type::text IS DISTINCT FROM s.component_type)) THEN
    RAISE EXCEPTION 'T22: T09 catalog missing, ambiguous, or changed';
  END IF;
END $check$;
INSERT INTO sockets(socket_code,name) SELECT DISTINCT spec->>'socketCode', spec->>'socketCode'
  FROM t22_catalog WHERE component_type IN ('CPU','MOTHERBOARD') ON CONFLICT DO NOTHING;
INSERT INTO form_factors(form_factor_code,name)
  SELECT DISTINCT f.code,f.code FROM t22_catalog s
  CROSS JOIN LATERAL jsonb_array_elements_text(s.support->'supportedFormFactorCodes') f(code)
  WHERE s.component_type='CASE' ON CONFLICT DO NOTHING;
INSERT INTO cpu_specs(product_id,socket_code,cores,threads,base_clock_ghz,boost_clock_ghz,tdp_watts)
  SELECT p.product_id,s.spec->>'socketCode',(s.spec->>'cores')::integer,(s.spec->>'threads')::integer,(s.spec->>'baseClockGhz')::double precision,(s.spec->>'boostClockGhz')::double precision,(s.spec->>'tdpWatts')::integer
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='CPU' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO motherboard_specs(product_id,socket_code,chipset,ram_type,pcie_version,form_factor_code,ram_slots,max_ram_gb)
  SELECT p.product_id,s.spec->>'socketCode',s.spec->>'chipset',s.spec->>'ramType',s.spec->>'pcieVersion',s.spec->>'formFactorCode',(s.spec->>'ramSlots')::integer,(s.spec->>'maxRamGb')::integer
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='MOTHERBOARD' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO ram_specs(product_id,ram_type,capacity_gb,speed_mhz,module_count)
  SELECT p.product_id,s.spec->>'ramType',(s.spec->>'capacityGb')::integer,(s.spec->>'speedMhz')::integer,(s.spec->>'moduleCount')::integer
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='RAM' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO gpu_specs(product_id,vram_gb,memory_type,interface_type,length_mm,power_consumption_w,recommended_psu_w)
  SELECT p.product_id,(s.spec->>'vramGb')::integer,s.spec->>'memoryType',s.spec->>'interfaceType',(s.spec->>'lengthMm')::integer,(s.spec->>'powerConsumptionW')::integer,(s.spec->>'recommendedPsuW')::integer
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='GPU' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO storage_specs(product_id,storage_type,interface_type,capacity_gb,read_speed_mbps,write_speed_mbps)
  SELECT p.product_id,s.spec->>'storageType',s.spec->>'interfaceType',(s.spec->>'capacityGb')::integer,(s.spec->>'readSpeedMBps')::integer,(s.spec->>'writeSpeedMBps')::integer
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='STORAGE' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO psu_specs(product_id,wattage,efficiency_rating,modular_type)
  SELECT p.product_id,(s.spec->>'wattage')::integer,s.spec->>'efficiencyRating',s.spec->>'modularType'
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='PSU' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO case_specs(product_id,max_gpu_length_mm,max_cooler_height_mm,max_radiator_size_mm)
  SELECT p.product_id,(s.spec->>'maxGpuLengthMm')::integer,(s.spec->>'maxCoolerHeightMm')::integer,(s.spec->>'maxRadiatorSizeMm')::integer
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='CASE' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO cooler_specs(product_id,cooler_type,max_tdp_w,height_mm,radiator_size_mm)
  SELECT p.product_id,s.spec->>'coolerType',(s.spec->>'maxTdpW')::integer,(s.spec->>'heightMm')::integer,(s.spec->>'radiatorSizeMm')::integer
  FROM t22_catalog s JOIN products p ON p.name=s.name
  WHERE s.component_type='COOLER' ON CONFLICT (product_id) DO NOTHING;
INSERT INTO case_supported_form_factors(case_product_id,form_factor_code)
  SELECT p.product_id, f.code FROM t22_catalog s JOIN products p ON p.name=s.name
  CROSS JOIN LATERAL jsonb_array_elements_text(s.support->'supportedFormFactorCodes') f(code)
  WHERE s.component_type='CASE' ON CONFLICT DO NOTHING;
INSERT INTO cooler_supported_sockets(cooler_product_id,socket_code)
  SELECT p.product_id, sk.code FROM t22_catalog s JOIN products p ON p.name=s.name
  CROSS JOIN LATERAL jsonb_array_elements_text(s.support->'supportedSocketCodes') sk(code)
  WHERE s.component_type='COOLER' ON CONFLICT DO NOTHING;
COMMIT;
