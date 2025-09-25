import { NextResponse, type NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_EVENT } from '@/lib/types';

// GET ?userEmail=... -> returns { event_date }
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userEmail = searchParams.get('userEmail');
  const event = searchParams.get('event') || DEFAULT_EVENT;

  if (!userEmail) {
    return NextResponse.json({ message: 'Missing userEmail.' }, { status: 400 });
  }

  const client = supabaseAdmin || supabase;
  const normalized = userEmail.toLowerCase().trim();

  // Try exact email first
  let { data, error } = await client
    .from('event_registration')
    .select('event_date')
    .eq('event_key', event)
    .ilike('user_email', normalized)
    .maybeSingle();

  // Fallback across VIT domains (vit.ac.in <-> vitstudent.ac.in)
  if (!data && !error) {
    const alt = normalized.endsWith('@vit.ac.in')
      ? normalized.replace('@vit.ac.in', '@vitstudent.ac.in')
      : normalized.endsWith('@vitstudent.ac.in')
        ? normalized.replace('@vitstudent.ac.in', '@vit.ac.in')
        : null;
    if (alt) {
      const res = await client
        .from('event_registration')
        .select('event_date')
        .eq('event_key', event)
        .ilike('user_email', alt)
        .maybeSingle();
      data = res.data as any;
    }
  }

  if (error) {
    return NextResponse.json({ message: 'Error fetching registration.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: 'Registration not found.' }, { status: 404 });
  }

  return NextResponse.json({ event_date: data.event_date });
}


