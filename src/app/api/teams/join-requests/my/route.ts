import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch join requests made by a user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ message: 'Missing userId.' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ message: 'Error fetching join requests.' }, { status: 500 });
  }
  return NextResponse.json(data);
}
