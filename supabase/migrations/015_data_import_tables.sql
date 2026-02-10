-- Migration: 015_data_import_tables
-- Description: Data sources table, dynamic import table registry, and management functions
-- Author: Claude
-- Date: 2026-02-10

-- =============================================================================
-- Section 0: Data Sources Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'postgres', 'mysql', 'mssql', 'redshift', 'bigquery', 'snowflake',
    'google_analytics', 'meta_pixel',
    'csv_upload', 'csv_url', 'google_sheets', 'excel',
    'rest_api', 'custom_database'
  )),
  credentials JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  column_config JSONB NOT NULL DEFAULT '{}',
  schedule_config JSONB NOT NULL DEFAULT '{}',
  sync_schedule VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (sync_schedule IN ('manual', 'hourly', 'daily', 'weekly', 'monthly', 'cron')),
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_sync_value TEXT,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'idle'
    CHECK (sync_status IN ('idle', 'syncing', 'success', 'failed')),
  table_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_sources_user ON data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_sync_status ON data_sources(sync_status);

-- Enable RLS
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own data sources"
  ON data_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data sources"
  ON data_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data sources"
  ON data_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data sources"
  ON data_sources FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all data sources"
  ON data_sources FOR ALL
  USING (is_admin());

-- Sync logs table for tracking sync history
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'failed', 'partial')),
  records_imported INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_data_source ON sync_logs(data_source_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync logs"
  ON sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_sources
      WHERE data_sources.id = sync_logs.data_source_id
        AND data_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all sync logs"
  ON sync_logs FOR ALL
  USING (is_admin());

-- =============================================================================
-- Section 1: Import Tables Registry
-- =============================================================================

CREATE TABLE IF NOT EXISTS import_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  table_name VARCHAR(255) NOT NULL UNIQUE,
  column_definitions JSONB NOT NULL DEFAULT '[]',
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_tables_data_source ON import_tables(data_source_id);
CREATE INDEX IF NOT EXISTS idx_import_tables_table_name ON import_tables(table_name);

-- Enable RLS
ALTER TABLE import_tables ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage their own import tables (via data_sources ownership)
CREATE POLICY "Users can read own import tables"
  ON import_tables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_sources
      WHERE data_sources.id = import_tables.data_source_id
        AND data_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own import tables"
  ON import_tables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_sources
      WHERE data_sources.id = import_tables.data_source_id
        AND data_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own import tables"
  ON import_tables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM data_sources
      WHERE data_sources.id = import_tables.data_source_id
        AND data_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own import tables"
  ON import_tables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM data_sources
      WHERE data_sources.id = import_tables.data_source_id
        AND data_sources.user_id = auth.uid()
    )
  );

-- Admins can manage all import tables
CREATE POLICY "Admins can manage all import tables"
  ON import_tables FOR ALL
  USING (is_admin());

-- =============================================================================
-- Section 2: Create Import Table Function
-- =============================================================================

-- Creates a dynamic table with proper RLS and registers it
CREATE OR REPLACE FUNCTION create_import_table(
  p_user_id UUID,
  p_source_name VARCHAR,
  p_columns JSONB
)
RETURNS TEXT AS $$
DECLARE
  v_table_name TEXT;
  v_short_uuid TEXT;
  v_sanitized TEXT;
  v_col JSONB;
  v_col_name TEXT;
  v_col_type TEXT;
  v_sql TEXT;
BEGIN
  -- Generate safe table name
  v_sanitized := regexp_replace(lower(p_source_name), '[^a-z0-9]', '_', 'g');
  v_sanitized := regexp_replace(v_sanitized, '_+', '_', 'g');
  v_sanitized := trim(both '_' from v_sanitized);
  v_short_uuid := left(replace(gen_random_uuid()::text, '-', ''), 8);
  v_table_name := 'import_' || v_sanitized || '_' || v_short_uuid;

  -- Build CREATE TABLE statement
  v_sql := format('CREATE TABLE IF NOT EXISTS %I (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    _import_row_num SERIAL,
    _imported_at TIMESTAMPTZ DEFAULT NOW()', v_table_name);

  -- Add user-defined columns
  FOR v_col IN SELECT * FROM jsonb_array_elements(p_columns)
  LOOP
    v_col_name := v_col->>'target_name';
    v_col_type := CASE v_col->>'type'
      WHEN 'text' THEN 'TEXT'
      WHEN 'number' THEN 'NUMERIC'
      WHEN 'integer' THEN 'INTEGER'
      WHEN 'boolean' THEN 'BOOLEAN'
      WHEN 'date' THEN 'DATE'
      WHEN 'timestamp' THEN 'TIMESTAMPTZ'
      ELSE 'TEXT'
    END;

    -- Only include columns marked as included
    IF (v_col->>'included')::boolean IS TRUE THEN
      v_sql := v_sql || format(', %I %s', v_col_name, v_col_type);
    END IF;
  END LOOP;

  v_sql := v_sql || ')';
  EXECUTE v_sql;

  -- Enable RLS on the new table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);

  -- Create RLS policy for the owner
  EXECUTE format(
    'CREATE POLICY "Owner access" ON %I FOR ALL USING (
      EXISTS (
        SELECT 1 FROM import_tables it
        JOIN data_sources ds ON ds.id = it.data_source_id
        WHERE it.table_name = %L AND ds.user_id = auth.uid()
      )
    )', v_table_name, v_table_name);

  -- Admin access
  EXECUTE format(
    'CREATE POLICY "Admin access" ON %I FOR ALL USING (is_admin())',
    v_table_name);

  RETURN v_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Section 3: Drop Import Table Function
-- =============================================================================

CREATE OR REPLACE FUNCTION drop_import_table(p_table_name VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Validate table name starts with 'import_' to prevent dropping system tables
  IF NOT p_table_name LIKE 'import_%' THEN
    RAISE EXCEPTION 'Can only drop import tables (prefix: import_)';
  END IF;

  -- Drop the table
  EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', p_table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Section 4: Truncate Import Table Function
-- =============================================================================

CREATE OR REPLACE FUNCTION truncate_import_table(p_table_name VARCHAR)
RETURNS VOID AS $$
BEGIN
  IF NOT p_table_name LIKE 'import_%' THEN
    RAISE EXCEPTION 'Can only truncate import tables (prefix: import_)';
  END IF;

  EXECUTE format('TRUNCATE TABLE %I', p_table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Section 5: Query Import Table Function
-- =============================================================================

CREATE OR REPLACE FUNCTION query_import_table(
  p_table_name VARCHAR,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_order_by VARCHAR DEFAULT NULL,
  p_order_direction VARCHAR DEFAULT 'desc',
  p_filters JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_sql TEXT;
  v_count_sql TEXT;
  v_total_count INTEGER;
  v_rows JSONB;
  v_key TEXT;
  v_value TEXT;
BEGIN
  IF NOT p_table_name LIKE 'import_%' THEN
    RAISE EXCEPTION 'Can only query import tables (prefix: import_)';
  END IF;

  -- Count query
  v_count_sql := format('SELECT COUNT(*) FROM %I', p_table_name);
  EXECUTE v_count_sql INTO v_total_count;

  -- Data query
  v_sql := format('SELECT jsonb_agg(row_to_json(t.*)) FROM (SELECT * FROM %I', p_table_name);

  -- Apply filters
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_filters)
  LOOP
    v_sql := v_sql || format(' WHERE %I::text ILIKE %L', v_key, '%' || v_value || '%');
  END LOOP;

  -- Apply ordering
  IF p_order_by IS NOT NULL THEN
    v_sql := v_sql || format(' ORDER BY %I %s NULLS LAST',
      p_order_by,
      CASE WHEN lower(p_order_direction) = 'asc' THEN 'ASC' ELSE 'DESC' END);
  ELSE
    v_sql := v_sql || ' ORDER BY _import_row_num ASC';
  END IF;

  -- Apply pagination
  v_sql := v_sql || format(' LIMIT %s OFFSET %s) t', p_limit, p_offset);

  EXECUTE v_sql INTO v_rows;

  RETURN jsonb_build_object(
    'rows', COALESCE(v_rows, '[]'::jsonb),
    'total_count', v_total_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Section 6: Insert Import Rows Function
-- =============================================================================

CREATE OR REPLACE FUNCTION insert_import_rows(
  p_table_name VARCHAR,
  p_rows JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_row JSONB;
  v_keys TEXT[];
  v_values TEXT[];
  v_sql TEXT;
  v_key TEXT;
  v_inserted INTEGER := 0;
BEGIN
  IF NOT p_table_name LIKE 'import_%' THEN
    RAISE EXCEPTION 'Can only insert into import tables (prefix: import_)';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_keys := ARRAY[]::TEXT[];
    v_values := ARRAY[]::TEXT[];

    FOR v_key IN SELECT * FROM jsonb_object_keys(v_row)
    LOOP
      v_keys := array_append(v_keys, format('%I', v_key));
      IF v_row->>v_key IS NULL THEN
        v_values := array_append(v_values, 'NULL');
      ELSE
        v_values := array_append(v_values, format('%L', v_row->>v_key));
      END IF;
    END LOOP;

    v_sql := format(
      'INSERT INTO %I (%s) VALUES (%s)',
      p_table_name,
      array_to_string(v_keys, ', '),
      array_to_string(v_values, ', ')
    );

    EXECUTE v_sql;
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Section 7: Get Import Table Columns Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_import_table_columns(p_table_name VARCHAR)
RETURNS TABLE (
  name TEXT,
  type TEXT,
  nullable BOOLEAN
) AS $$
BEGIN
  IF NOT p_table_name LIKE 'import_%' THEN
    RAISE EXCEPTION 'Can only inspect import tables (prefix: import_)';
  END IF;

  RETURN QUERY
  SELECT
    c.column_name::TEXT AS name,
    c.data_type::TEXT AS type,
    (c.is_nullable = 'YES')::BOOLEAN AS nullable
  FROM information_schema.columns c
  WHERE c.table_name = p_table_name
    AND c.table_schema = 'public'
    AND c.column_name NOT IN ('id', '_import_row_num', '_imported_at')
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Section 8: Add Column to Import Table Function
-- =============================================================================

CREATE OR REPLACE FUNCTION add_import_table_column(
  p_table_name VARCHAR,
  p_column_name VARCHAR,
  p_column_type VARCHAR
)
RETURNS VOID AS $$
DECLARE
  v_type TEXT;
BEGIN
  IF NOT p_table_name LIKE 'import_%' THEN
    RAISE EXCEPTION 'Can only modify import tables (prefix: import_)';
  END IF;

  -- Map type names
  v_type := CASE lower(p_column_type)
    WHEN 'text' THEN 'TEXT'
    WHEN 'number' THEN 'NUMERIC'
    WHEN 'integer' THEN 'INTEGER'
    WHEN 'boolean' THEN 'BOOLEAN'
    WHEN 'date' THEN 'DATE'
    WHEN 'timestamp' THEN 'TIMESTAMPTZ'
    ELSE 'TEXT'
  END;

  EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', p_table_name, p_column_name, v_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
