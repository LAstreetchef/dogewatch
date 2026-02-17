import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple admin check - in production, use proper auth
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dogewatch-admin';

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${ADMIN_SECRET}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key) {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }
    return NextResponse.json({ setting: data });
  }

  // Return all public settings
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('key, value');

  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key and value are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('platform_settings')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      setting: data,
      message: `Setting '${key}' updated to ${value}` 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
