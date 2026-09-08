import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env vars missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    const body = await req.json().catch(() => ({}));
    if (!token && body.access_token) {
      token = body.access_token;
    }

    if (!token) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión no válida o expirada' }, { status: 401 });
    }

    // Días de extensión (default: 30 días de prueba gratuita)
    const days = Number(body.days) || 30;

    const supabaseAdmin = getSupabaseAdmin();

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const { data: updated, error } = await supabaseAdmin
      .from('negocios')
      .update({
        subscription_status: 'trialing',
        subscription_plan: 'trial',
        current_period_end: endDate.toISOString()
      })
      .eq('id', user.id)
      .select('id, nombre, subscription_status, subscription_plan, current_period_end')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Prueba gratuita renovada con éxito por ${days} días adicionales.`,
      status: updated.subscription_status,
      plan: updated.subscription_plan,
      currentPeriodEnd: updated.current_period_end,
    });
  } catch (err: any) {
    console.error('Error al renovar prueba gratuita:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
