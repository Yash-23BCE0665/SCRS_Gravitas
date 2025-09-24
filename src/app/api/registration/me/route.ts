import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_EVENT } from '@/lib/types';

// GET ?userEmail=... -> returns { event_date }
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userEmail = searchParams.get('userEmail');
  const event = searchParams.get('event') || DEFAULT_EVENT;

  if (!userEmail) {
    return NextResponse.json({ message: 'Missing userEmail.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('event_registration')
    .select('event_date')
    .eq('event_key', event)
    .eq('user_email', userEmail)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: 'Error fetching registration.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: 'Registration not found.' }, { status: 404 });
  }

  return NextResponse.json({ event_date: data.event_date });
}


