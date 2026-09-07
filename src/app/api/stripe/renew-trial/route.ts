import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let pgClient: Client | null = null;
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

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 });
    }

    pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await pgClient.connect();

    // Días de extensión (default: 30 días de prueba gratuita)
    const days = Number(body.days) || 30;

    const res = await pgClient.query(
      `UPDATE public.negocios
       SET subscription_status = 'trialing',
           subscription_plan = 'trial',
           current_period_end = (NOW() + ($1 || ' days')::interval)
       WHERE id = $2
       RETURNING id, nombre, subscription_status, subscription_plan, current_period_end`,
      [days.toString(), user.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const updated = res.rows[0];

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
  } finally {
    if (pgClient) {
      await pgClient.end().catch(() => {});
    }
  }
}
