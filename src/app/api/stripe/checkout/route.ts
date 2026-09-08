import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeServer, PLANS, PlanKey } from '@/lib/stripe';

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

    const planKey = (body.plan || 'monthly') as PlanKey;
    const plan = PLANS[planKey];
    if (!plan) {
      return NextResponse.json({ error: 'Plan seleccionado no válido' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: negocio, error: negError } = await supabaseAdmin
      .from('negocios')
      .select('id, nombre, owner_email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (negError || !negocio) {
      return NextResponse.json({ error: 'Registro de negocio no encontrado' }, { status: 404 });
    }

    let customerId = negocio.stripe_customer_id;

    const stripe = getStripeServer();

    // Crear cliente de Stripe si no existe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || negocio.owner_email || undefined,
        name: negocio.nombre || 'Restaurante',
        metadata: {
          negocio_id: user.id,
        },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('negocios')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const priceId = process.env[plan.priceEnvVar];

    const sessionParams: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: plan.currency,
                product_data: {
                  name: plan.name,
                  description: plan.description,
                },
                unit_amount: plan.price * 100,
                recurring: {
                  interval: plan.interval,
                },
              },
              quantity: 1,
            },
          ],
      success_url: `${origin}/owner?session_id={CHECKOUT_SESSION_ID}&billing=success`,
      cancel_url: `${origin}/owner?billing=cancelled`,
      metadata: {
        negocio_id: user.id,
        plan: planKey,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('Error en checkout session:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
