-- ========================================================
-- ADDITIONAL SEED DATA (Tables previously missed)
-- ========================================================

DO $$
DECLARE
    i INTEGER;
    cust_id BIGINT;
    promo_id BIGINT;
    prod_id BIGINT;
BEGIN
    -- 2.7 CUSTOMERS (50 items)
    FOR i IN 1..50 LOOP
        INSERT INTO public.customers (shop_id, name, phone, points, total_spent, birthday, image_url)
        VALUES (
            'SHOP-MLAM4TC6-JHD',
            'ลูกค้าทดสอบ ' || i,
            '08' || LPAD(i::text, 8, '0'),
            (random() * 500)::INTEGER,
            (random() * 10000)::DECIMAL(10,2),
            NOW() - (random() * INTERVAL '10000 days'),
            'https://placehold.co/200x200?text=User' || i
        ) ON CONFLICT (phone) DO NOTHING;
    END LOOP;

    -- 2.8 NEWS (10 items)
    FOR i IN 1..10 LOOP
        INSERT INTO public.news (shop_id, title, content, image_url, is_published)
        VALUES (
            'SHOP-MLAM4TC6-JHD',
            'ข่าวสารประชาสัมพันธ์ที่ ' || i,
            'รายละเอียดข่าวสารกิจกรรมร้านค้า... โปรโมชั่นพิเศษต้อนรับเทศกาลต่างๆ',
            'https://placehold.co/600x400?text=News' || i,
            TRUE
        );
    END LOOP;

    -- 2.9 STAFF LOGS (20 items)
    FOR i IN 1..20 LOOP
        INSERT INTO public.staff_logs (shop_id, staff_id, action, details)
        VALUES (
            'SHOP-MLAM4TC6-JHD',
            (SELECT id FROM public.admins LIMIT 1),
            CASE WHEN i % 2 = 0 THEN 'LOGIN' ELSE 'CREATE_SALE' END,
            '{"ip": "127.0.0.1", "device": "chrome"}'::jsonb
        );
    END LOOP;

    -- 2.10 PROMOTION PRODUCTS (Link Products to Promotions)
    -- Randomly link 3 products to each promotion
    FOR promo_id IN (SELECT id FROM public.promotions) LOOP
        FOR i IN 1..3 LOOP
             prod_id := (SELECT id FROM public.products ORDER BY random() LIMIT 1);
             BEGIN
                INSERT INTO public.promotion_products (promotion_id, product_id)
                VALUES (promo_id, prod_id);
             EXCEPTION WHEN unique_violation THEN
                -- Ignore duplicate links
             END;
        END LOOP;
    END LOOP;

    -- 2.11 SALES (Update customer_id for existing sales to simulate member purchases)
    -- Randomly assign 50% of sales to customers
    UPDATE public.sales
    SET customer_id = (SELECT id FROM public.customers ORDER BY random() LIMIT 1)
    WHERE random() > 0.5;

END $$;
