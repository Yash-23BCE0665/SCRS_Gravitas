import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_EVENT } from '@/lib/types';

// POST: Generate random teams from random_pool, 4 members each
export async function POST(request: NextRequest) {
  try {
    const { teamSize = 4, event } = await request.json().catch(() => ({ teamSize: 4 }));
    const effectiveEvent = event || DEFAULT_EVENT;

    // Fetch queued users for the event
    const { data: pool, error: poolError } = await supabase
      .from('random_pool')
      .select('*')
      .eq('event', effectiveEvent)
      .order('created_at', { ascending: true });
    if (poolError) {
      return NextResponse.json({ message: 'Error reading random pool.' }, { status: 500 });
    }

    if (!pool || pool.length < 2) {
      return NextResponse.json({ message: 'Not enough participants in the queue.' }, { status: 400 });
    }

    // Shuffle
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    const createdTeamIds: string[] = [];
    const failed: any[] = [];

    // Create teams in batches of teamSize
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const slice = shuffled.slice(i, i + teamSize);
      if (slice.length < 2) break; // ignore trailing 1

      // Build members list
      const members = slice.map((s) => ({ id: s.user_id, name: s.user_name, email: s.user_email }));
      // Randomly assign a leader among them
      const leaderIndex = Math.floor(Math.random() * members.length);
      const leaderId = members[leaderIndex].id;

      const teamName = `Team ${new Date().getTime()}-${i / teamSize + 1}`;

      const { data: created, error: insertError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          leader_id: leaderId,
          members,
          score: 0,
          event: effectiveEvent,
        })
        .select()
        .single();

      if (insertError || !created) {
        failed.push({ slice, error: insertError });
        continue;
      }

      createdTeamIds.push(created.id);

      // Remove these users from the pool
      const userIds = slice.map((s) => s.user_id);
      await supabase
        .from('random_pool')
        .delete()
        .in('user_id', userIds)
        .eq('event', effectiveEvent);
    }

    return NextResponse.json({ message: 'Random teams generated.', createdTeamIds, failed });
  } catch (error) {
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}


