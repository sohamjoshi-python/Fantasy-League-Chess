-- ========================================
-- FANTASY CHESS DATABASE SCHEMA ANALYSIS
-- This script will identify all tables and their columns
-- ========================================

-- Get all tables in the public schema
SELECT 
    'TABLE_LIST' as analysis_type,
    table_name,
    'Table' as object_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Get all columns for each table with detailed information
SELECT 
    'COLUMN_DETAILS' as analysis_type,
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    CASE 
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY'
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FOREIGN KEY'
        WHEN tc.constraint_type = 'UNIQUE' THEN 'UNIQUE'
        ELSE 'NONE'
    END as constraint_type,
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
            (SELECT table_name FROM information_schema.table_constraints 
             WHERE constraint_name = tc.constraint_name)
        ELSE NULL
    END as foreign_table
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN information_schema.key_column_usage kcu 
    ON c.table_name = kcu.table_name 
    AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- Get foreign key relationships
SELECT 
    'FOREIGN_KEYS' as analysis_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Get indexes for each table
SELECT 
    'INDEXES' as analysis_type,
    t.table_name,
    i.indexname as index_name,
    i.indexdef as index_definition
FROM information_schema.tables t
JOIN pg_indexes i ON t.table_name = i.tablename
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
AND i.schemaname = 'public'
ORDER BY t.table_name, i.indexname;

-- Get functions that reference tables
SELECT 
    'FUNCTIONS' as analysis_type,
    p.proname as function_name,
    p.prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosrc LIKE '%FROM %'
ORDER BY p.proname;

-- Get triggers
SELECT 
    'TRIGGERS' as analysis_type,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name; 