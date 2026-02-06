-- DANGER: This will delete ALL data and tables in the public schema
-- Use this before re-running database_master_setup.sql to ensure a clean slate.

-- Option 1: Nuke everything (Easiest for full reset)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Standard permissions (Supabase Roles)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Option 2: Drop specific tables (If you want to keep extensions/functions)
-- DROP TABLE IF EXISTS 
--     public.active_cart_items,
--     public.active_carts,
--     public.staff_logs,
--     public.store_settings,
--     public.reward_redemptions,
--     public.rewards,
--     public.news,
--     public.coupons,
--     public.promotion_products,
--     public.promotions,
--     public.held_bill_items,
--     public.held_bills,
--     public.sale_items,
--     public.sales,
--     public.stock_transactions,
--     public.product_images,
--     public.products,
--     public.customers,
--     public.categories,
--     public.admins
-- CASCADE;
