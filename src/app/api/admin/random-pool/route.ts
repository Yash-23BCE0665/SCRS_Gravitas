import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_EVENT } from '@/lib/types';

// GET: Return random pool stats for the default event
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const event = (searchParams.get('event') as any) || DEFAULT_EVENT;

  const { count, error } = await supabase
    .from('random_pool')
    .select('id', { count: 'exact', head: true })
    .eq('event', event);

  if (error) {
    return NextResponse.json({ message: 'Error fetching random pool count.' }, { status: 500 });
  }

  const total = count || 0;
  const groupsAvailable = Math.floor(total / 4);

  return NextResponse.json({ event, count: total, groupsAvailable });
}


