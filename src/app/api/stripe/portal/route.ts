import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeServer } from '@/lib/stripe';

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

    const supabaseAdmin = getSupabaseAdmin();

    const { data: negocio } = await supabaseAdmin
      .from('negocios')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const customerId = negocio?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: 'Aún no tienes un perfil de facturación activo en Stripe. Inicia una suscripción primero.' },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/owner`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error('Error al generar Customer Portal:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
