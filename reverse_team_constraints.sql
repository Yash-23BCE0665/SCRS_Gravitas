-- Script to reverse all team constraints and functions added
-- This will remove all the constraints, triggers, functions, indexes, and views

-- Step 1: Drop triggers first
DROP TRIGGER IF EXISTS check_duplicate_members_trigger ON teams;
DROP TRIGGER IF EXISTS check_no_duplicate_members_in_team_trigger ON teams;

-- Step 2: Drop the check constraint
ALTER TABLE teams DROP CONSTRAINT IF EXISTS check_members_is_array;

-- Step 3: Drop the functional index
DROP INDEX IF EXISTS idx_teams_member_ids;

-- Step 4: Drop the view
DROP VIEW IF EXISTS team_members_view;

-- Step 5: Drop all functions
DROP FUNCTION IF EXISTS check_duplicate_members();
DROP FUNCTION IF EXISTS check_no_duplicate_members_in_team();
DROP FUNCTION IF EXISTS extract_member_ids(jsonb);
DROP FUNCTION IF EXISTS find_teams_with_member(text);
DROP FUNCTION IF EXISTS move_member_to_team(text, uuid, uuid);

-- Step 6: Verify everything is removed
SELECT 
  'Triggers' as object_type,
  count(*) as remaining_count
FROM information_schema.triggers 
WHERE trigger_name LIKE '%duplicate%' OR trigger_name LIKE '%member%'

UNION ALL

SELECT 
  'Functions' as object_type,
  count(*) as remaining_count
FROM information_schema.routines 
WHERE routine_name LIKE '%duplicate%' 
   OR routine_name LIKE '%member%' 
   OR routine_name LIKE '%extract%'

UNION ALL

SELECT 
  'Indexes' as object_type,
  count(*) as remaining_count
FROM pg_indexes 
WHERE indexname LIKE '%member%'

UNION ALL

SELECT 
  'Views' as object_type,
  count(*) as remaining_count
FROM information_schema.views 
WHERE table_name LIKE '%member%'

UNION ALL

SELECT 
  'Constraints' as object_type,
  count(*) as remaining_count
FROM information_schema.table_constraints 
WHERE constraint_name LIKE '%member%' OR constraint_name LIKE '%array%';

-- Step 7: Show current table structure
SELECT 
  'Table teams is back to original state' as status,
  'All constraints, triggers, functions, and indexes have been removed' as message;
