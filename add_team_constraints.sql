-- Add constraints to ensure a member can only be in one team
-- Since members is JSONB, we need to use triggers and functional indexes

-- Step 1: Create a function to extract all member IDs from a team's members JSONB
CREATE OR REPLACE FUNCTION extract_member_ids(members_jsonb jsonb)
RETURNS text[] AS $$
BEGIN
  IF members_jsonb IS NULL OR jsonb_typeof(members_jsonb) != 'array' THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  RETURN ARRAY(
    SELECT jsonb_array_elements(members_jsonb)->>'id'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create a function to check for duplicate members across teams
CREATE OR REPLACE FUNCTION check_duplicate_members()
RETURNS TRIGGER AS $$
DECLARE
  member_ids text[];
  conflicting_team_id uuid;
  conflicting_team_name text;
BEGIN
  -- Extract member IDs from the new/updated team
  member_ids := extract_member_ids(NEW.members);
  
  -- Check if any of these members exist in other teams
  SELECT t.id, t.name INTO conflicting_team_id, conflicting_team_name
  FROM teams t
  WHERE t.id != NEW.id
    AND t.members IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(t.members) AS member
      WHERE member->>'id' = ANY(member_ids)
    )
  LIMIT 1;
  
  -- If we found a conflict, raise an error
  IF conflicting_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Member(s) already exist in team "%" (ID: %). Each member can only be in one team.', 
      conflicting_team_name, conflicting_team_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to enforce the constraint
DROP TRIGGER IF EXISTS check_duplicate_members_trigger ON teams;
CREATE TRIGGER check_duplicate_members_trigger
  BEFORE INSERT OR UPDATE OF members ON teams
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_members();

-- Step 4: Create a functional index for better performance
CREATE INDEX IF NOT EXISTS idx_teams_member_ids 
ON teams USING GIN (extract_member_ids(members));

-- Step 5: Create a function to find teams containing a specific member
CREATE OR REPLACE FUNCTION find_teams_with_member(member_id text)
RETURNS TABLE(team_id uuid, team_name text, member_data jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    member.value as member_data
  FROM teams t,
       jsonb_array_elements(t.members) AS member
  WHERE member->>'id' = member_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a function to safely move a member from one team to another
CREATE OR REPLACE FUNCTION move_member_to_team(
  member_id text,
  from_team_id uuid,
  to_team_id uuid
)
RETURNS boolean AS $$
DECLARE
  member_data jsonb;
  from_team_members jsonb;
  to_team_members jsonb;
  updated_from_members jsonb;
  updated_to_members jsonb;
BEGIN
  -- Get member data from source team
  SELECT member.value INTO member_data
  FROM teams t,
       jsonb_array_elements(t.members) AS member
  WHERE t.id = from_team_id AND member->>'id' = member_id;
  
  IF member_data IS NULL THEN
    RAISE EXCEPTION 'Member % not found in team %', member_id, from_team_id;
  END IF;
  
  -- Get current members of both teams
  SELECT members INTO from_team_members FROM teams WHERE id = from_team_id;
  SELECT members INTO to_team_members FROM teams WHERE id = to_team_id;
  
  -- Remove member from source team
  updated_from_members := (
    SELECT jsonb_agg(member)
    FROM jsonb_array_elements(from_team_members) AS member
    WHERE member->>'id' != member_id
  );
  
  -- Add member to destination team
  updated_to_members := COALESCE(to_team_members, '[]'::jsonb) || jsonb_build_array(member_data);
  
  -- Update both teams
  UPDATE teams SET members = updated_from_members WHERE id = from_team_id;
  UPDATE teams SET members = updated_to_members WHERE id = to_team_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create a view to easily see all member-team relationships
CREATE OR REPLACE VIEW team_members_view AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.event,
  t.event_date,
  member.value->>'id' as member_id,
  member.value->>'name' as member_name,
  member.value->>'email' as member_email
FROM teams t,
     jsonb_array_elements(t.members) AS member
WHERE t.members IS NOT NULL;

-- Step 8: Add a check constraint to ensure members is always an array
ALTER TABLE teams 
ADD CONSTRAINT check_members_is_array 
CHECK (members IS NULL OR jsonb_typeof(members) = 'array');

-- Step 9: Add a check constraint to ensure no duplicate member IDs within a team
CREATE OR REPLACE FUNCTION check_no_duplicate_members_in_team()
RETURNS TRIGGER AS $$
DECLARE
  member_count integer;
  unique_count integer;
BEGIN
  IF NEW.members IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count total members
  member_count := jsonb_array_length(NEW.members);
  
  -- Count unique member IDs
  SELECT COUNT(DISTINCT member->>'id') INTO unique_count
  FROM jsonb_array_elements(NEW.members) AS member;
  
  -- If counts don't match, there are duplicates within the team
  IF member_count != unique_count THEN
    RAISE EXCEPTION 'Team cannot have duplicate members. Found % total members but only % unique IDs.', 
      member_count, unique_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_no_duplicate_members_in_team_trigger ON teams;
CREATE TRIGGER check_no_duplicate_members_in_team_trigger
  BEFORE INSERT OR UPDATE OF members ON teams
  FOR EACH ROW
  EXECUTE FUNCTION check_no_duplicate_members_in_team();

-- Step 10: Test the constraints
-- This should fail:
-- INSERT INTO teams (name, leader_id, members, event) 
-- VALUES ('Test Team 1', '00000000-0000-0000-0000-000000000001', 
--         '[{"id": "user1", "name": "User 1", "email": "user1@test.com"}]', 'escape-exe-ii');

-- INSERT INTO teams (name, leader_id, members, event) 
-- VALUES ('Test Team 2', '00000000-0000-0000-0000-000000000002', 
--         '[{"id": "user1", "name": "User 1", "email": "user1@test.com"}]', 'escape-exe-ii');
