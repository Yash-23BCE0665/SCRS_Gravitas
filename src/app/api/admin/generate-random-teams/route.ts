import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_EVENT } from '@/lib/types';

// GET: List unassigned users for a given event key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event') || 'escape-exe-ii';

    // 1) Gather all users from users table
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email');
    if (usersError) {
      return NextResponse.json({ message: 'Error fetching users.' }, { status: 500 });
    }

    // 2) Gather registered users for the event
    const { data: registrations, error: regError } = await supabase
      .from('event_registration')
      .select('user_id')
      .eq('event_key', event);
    if (regError) {
      return NextResponse.json({ message: 'Error fetching event registrations.', supabaseError: regError }, { status: 500 });
    }
    const registeredIds: string[] = (registrations || []).map((r: any) => r.user_id);

    // 3) Find all team member ids for this event
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, members')
      .eq('event', event);
    if (teamsError) {
      return NextResponse.json({ message: 'Error fetching teams.' }, { status: 500 });
    }
    const memberSet = new Set<string>();
    (teams || []).forEach((t: any) => {
      (t.members || []).forEach((m: any) => memberSet.add(m.id));
    });

    // 4) Build list of unassigned user ids (user exists && registered && not in team)
    const unassignedUsers = (allUsers || []).filter((u: any) => registeredIds.includes(u.id) && !memberSet.has(u.id));

    return NextResponse.json({ event, unassignedUsers });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
  }
}

// POST: Generate random teams from participants in the random pool
export async function POST(request: NextRequest) {
  try {
    const { teamSize = 4, event } = await request.json().catch(() => ({ teamSize: 4 }));
    const effectiveEvent = event || DEFAULT_EVENT;

    // 1. Get users from random pool
    const { data: poolUsers, error: poolError } = await supabase
      .from('random_pool')
      .select('*')
      .eq('event', effectiveEvent);

    if (poolError) {
      return NextResponse.json({ message: 'Error fetching random pool users.', error: poolError }, { status: 500 });
    }

    if (!poolUsers || poolUsers.length === 0) {
      return NextResponse.json({ message: 'No users in random pool to assign.' }, { status: 400 });
    }

    // 2. Get all users' details
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', poolUsers.map(pu => pu.user_id));

    if (usersError || !allUsers) {
      return NextResponse.json({ message: 'Error fetching users.' }, { status: 500 });
    }

    // 3. Get all teams for this event
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('event', effectiveEvent);

    if (teamsError) {
      return NextResponse.json({ message: 'Error fetching teams.' }, { status: 500 });
    }

    // Map pool users to their full details
    const unassignedUsers = poolUsers.map(pu => {
      const user = allUsers.find(u => u.id === pu.user_id);
      return user || null;
    }).filter(Boolean);

    const createdTeamIds: string[] = [];
    const assignedToExisting: any[] = [];
    const failed: any[] = [];

    // 4. First try to fill existing teams that have open slots
    for (const team of (teams || [])) {
      const members = team.members || [];
      const slots = teamSize - members.length;
      if (slots <= 0) continue;

      const toAssign = unassignedUsers.splice(0, slots);
      if (!toAssign.length) break;

      const newMembers = [...members, ...toAssign.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email
      }))];

      const { error: updateErr } = await supabase
        .from('teams')
        .update({ members: newMembers })
        .eq('id', team.id);

      if (updateErr) {
        failed.push({ teamId: team.id, error: updateErr });
        unassignedUsers.unshift(...toAssign);
        continue;
      }

      assignedToExisting.push({ teamId: team.id, added: toAssign.map((u: any) => u.id) });

      // Remove assigned users from random pool
      for (const user of toAssign) {
        await supabase
          .from('random_pool')
          .delete()
          .eq('user_id', user.id)
          .eq('event', effectiveEvent);
      }
    }

    // 5. If we have 2 or more users left, create new teams
    if (unassignedUsers.length >= 2) {
      for (let i = 0; i < unassignedUsers.length; i += teamSize) {
        const slice = unassignedUsers.slice(i, i + teamSize);
        if (slice.length < 2) break; // Need at least 2 users for a new team

        const members = slice.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email
        }));

        const leaderIndex = Math.floor(Math.random() * members.length);
        const leaderId = members[leaderIndex].id;
        const teamName = `Team ${Date.now()}-${i / teamSize + 1}`;

        const { data: created, error: insertError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            leader_id: leaderId,
            members,
            score: 0,
            event: effectiveEvent
          })
          .select()
          .single();

        if (insertError || !created) {
          failed.push({ users: slice, error: insertError });
          continue;
        }

        createdTeamIds.push(created.id);

        // Remove these users from random pool
        for (const user of slice) {
          await supabase
            .from('random_pool')
            .delete()
            .eq('user_id', user.id)
            .eq('event', effectiveEvent);
        }
      }
    }

    return NextResponse.json({
      message: 'Random allotment complete.',
      createdTeamIds,
      assignedToExisting,
      failed
    });

  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.', error: String(error) }, { status: 500 });
  }
}