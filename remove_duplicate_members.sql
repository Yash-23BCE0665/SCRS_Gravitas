-- Query to identify and remove duplicate members from teams
-- This will keep the user in their most recently created team and remove them from older teams

-- Step 1: First, let's see all the duplicates
WITH duplicate_members AS (
  SELECT 
    member_id,
    member_name,
    member_email,
    team_id,
    team_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY member_id 
      ORDER BY created_at DESC, team_id DESC
    ) as rn
  FROM (
    SELECT 
      t.id as team_id,
      t.name as team_name,
      t.created_at,
      jsonb_array_elements(t.members)->>'id' as member_id,
      jsonb_array_elements(t.members)->>'name' as member_name,
      jsonb_array_elements(t.members)->>'email' as member_email
    FROM teams t
    WHERE t.members IS NOT NULL
  ) expanded_members
),
-- Step 2: Get the teams that need to be updated (teams with duplicates to remove)
teams_to_update AS (
  SELECT 
    team_id,
    team_name,
    array_agg(
      jsonb_build_object(
        'id', member_id,
        'name', member_name,
        'email', member_email
      )
    ) as new_members
  FROM duplicate_members
  WHERE rn = 1  -- Keep only the most recent team for each member
  GROUP BY team_id, team_name
),
-- Step 3: Get teams that have members to remove
teams_with_duplicates AS (
  SELECT DISTINCT team_id
  FROM duplicate_members
  WHERE rn > 1  -- These are the duplicates to remove
)

-- Step 4: Update teams to remove duplicate members
UPDATE teams 
SET members = COALESCE(
  (
    SELECT to_jsonb(new_members) 
    FROM teams_to_update 
    WHERE teams_to_update.team_id = teams.id
  ),
  '[]'::jsonb
)
WHERE id IN (SELECT team_id FROM teams_with_duplicates);

-- Step 5: Show summary of what was cleaned up
SELECT 
  'Summary' as action,
  COUNT(DISTINCT member_id) as unique_members_kept,
  COUNT(*) - COUNT(DISTINCT member_id) as duplicate_entries_removed
FROM (
  SELECT 
    jsonb_array_elements(t.members)->>'id' as member_id
  FROM teams t
  WHERE t.members IS NOT NULL
) all_members;
