import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { isSubscriptionActive } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  let pgClient: Client | null = null;
  try {
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const url = new URL(req.url);
      token = url.searchParams.get('access_token');
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

    const res = await pgClient.query(
      `SELECT id, nombre, owner_email, stripe_customer_id, stripe_subscription_id, 
              subscription_status, subscription_plan, current_period_end 
       FROM public.negocios 
       WHERE id = $1 LIMIT 1`,
      [user.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const negocio = res.rows[0];
    const active = isSubscriptionActive(negocio.subscription_status, negocio.current_period_end);

    return NextResponse.json({
      active,
      status: negocio.subscription_status || 'trialing',
      plan: negocio.subscription_plan || 'trial',
      currentPeriodEnd: negocio.current_period_end,
      hasCustomerId: !!negocio.stripe_customer_id,
      hasSubscriptionId: !!negocio.stripe_subscription_id,
    });
  } catch (err: any) {
    console.error('Error al consultar estado de suscripción:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  } finally {
    if (pgClient) {
      await pgClient.end().catch(() => {});
    }
  }
}
