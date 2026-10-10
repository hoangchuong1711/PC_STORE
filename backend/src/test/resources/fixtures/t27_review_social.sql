-- Only loaded into the random schema owned by ReviewSocialIT.
-- Users 1/2/4 (CUSTOMER) and 3 (ADMIN) are inserted by the test with a real password hash.
INSERT INTO brands(name) VALUES ('T27 brand');
INSERT INTO categories(name) VALUES ('T27 category');
INSERT INTO products(name,price,brand_id,category_id) VALUES
    ('CPU',100,1,1),('RAM',100,1,1),('SSD',100,1,1);
INSERT INTO orders(user_id,order_date,status,total_amount,shipping_name,shipping_phone,shipping_address_text,delivered_at) VALUES
    (1,'2026-10-01 10:00','DELIVERED',300,'Customer A','0901234567','Test address','2026-10-03 10:00'),
    (2,'2026-10-01 10:00','DELIVERED',100,'Customer B','0901234568','Test address','2026-10-03 10:00');
INSERT INTO order_items(order_id,product_id,quantity,base_unit_price,unit_price) VALUES
    (1,1,1,100,100),(2,1,1,100,100),(1,2,1,100,100),(1,3,1,100,100);
INSERT INTO product_reviews(order_item_id,rating,content,status,moderation_reason,moderated_by,moderated_at) VALUES
    (1,5,'Published review by A','PUBLISHED',NULL,NULL,NULL),
    (2,4,'Published review by B','PUBLISHED',NULL,NULL,NULL),
    (3,3,'Hidden review by A','HIDDEN','Fixture moderation',3,'2026-10-04 10:00'),
    (4,2,'Deleted review by A','DELETED',NULL,NULL,NULL);
INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,created_at,expires_at,attached_at) VALUES
    ('27000000-0000-0000-0000-000000000001',1,'REVIEW','ATTACHED','pcstore/temp/review/t27-fixture','t27-fixture-asset','image/jpeg',100,4,4,'2026-10-03 10:00','2026-10-03 12:00','2026-10-03 10:01');
INSERT INTO review_media(review_id,media_type,storage_key,mime_type,size_bytes,sort_order,media_asset_id) VALUES
    (1,'IMAGE','media:27000000-0000-0000-0000-000000000001','image/jpeg',100,0,'27000000-0000-0000-0000-000000000001');
