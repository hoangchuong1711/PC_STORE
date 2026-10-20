-- Destructive maintenance operation for disposable databases only.
-- Select the target schema explicitly and SET pcstore.allow_t10_rollback = 'on'.
-- This is NOT a Flyway forward migration. Never run concurrently with the app/migrations.
-- One DO statement keeps table removal and history adjustment atomic.
DO $$
DECLARE
    target_schema text := current_schema();
    v3_rank integer;
    latest_rank integer;
    tables_to_drop text;
BEGIN
    IF current_setting('pcstore.allow_t10_rollback', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'T10 rollback requires explicit opt-in on a disposable database';
    END IF;
    IF target_schema IS NULL OR target_schema IN ('pg_catalog', 'information_schema') THEN
        RAISE EXCEPTION 'Select a dedicated target schema before rollback';
    END IF;

    EXECUTE format('LOCK TABLE %I.flyway_schema_history IN ACCESS EXCLUSIVE MODE', target_schema);
    EXECUTE format('SELECT installed_rank FROM %I.flyway_schema_history
        WHERE version = ''3'' AND success AND script = ''V3__create_builder_review_setup.sql''', target_schema)
        INTO v3_rank;
    EXECUTE format('SELECT max(installed_rank) FROM %I.flyway_schema_history', target_schema)
        INTO latest_rank;
    IF v3_rank IS NULL OR latest_rank IS DISTINCT FROM v3_rank THEN
        RAISE EXCEPTION 'Rollback requires V3 as the latest applied migration; later migrations must not exist';
    END IF;

    SELECT string_agg(format('%I.%I', target_schema, table_name), ', ')
      INTO tables_to_drop
      FROM unnest(ARRAY[
        'setup_likes', 'setup_post_products', 'setup_images', 'setup_posts',
        'review_likes', 'review_media', 'product_reviews',
        'pc_build_items', 'pc_builds',
        'case_supported_form_factors', 'cooler_supported_sockets',
        'cpu_specs', 'motherboard_specs', 'ram_specs', 'gpu_specs',
        'storage_specs', 'psu_specs', 'case_specs', 'cooler_specs',
        'sockets', 'form_factors'
      ]) AS feature_tables(table_name);
    -- RESTRICT is intentional: unknown dependants must abort the whole operation.
    EXECUTE 'DROP TABLE ' || tables_to_drop || ' RESTRICT';
    EXECUTE format('DELETE FROM %I.flyway_schema_history WHERE installed_rank = $1', target_schema)
        USING v3_rank;
END $$;
