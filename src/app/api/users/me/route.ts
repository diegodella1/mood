import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select()
    .eq('id', session.userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}
