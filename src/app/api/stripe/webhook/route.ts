import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripeServer } from '@/lib/stripe';
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
  const rawBody = await req.text();
  const signature = (await headers()).get('stripe-signature');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeServer();

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Error al verificar firma del Webhook de Stripe:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseAdmin();
    } catch {
      supabaseAdmin = null;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const negocioId = session.metadata?.negocio_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (supabaseAdmin && negocioId) {
          const { data: neg } = await supabaseAdmin.from('negocios').select('*').eq('id', negocioId).single();
          if (neg) {
            await supabaseAdmin.from('negocios').update({
              stripe_customer_id: customerId || neg.stripe_customer_id,
              stripe_subscription_id: subscriptionId || neg.stripe_subscription_id,
              subscription_status: 'active',
              subscription_plan: session.metadata?.plan || neg.subscription_plan || 'monthly'
            }).eq('id', negocioId);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status; // 'active', 'past_due', 'canceled', 'unpaid', etc.
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

        if (supabaseAdmin && customerId) {
          await supabaseAdmin.from('negocios').update({
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            current_period_end: currentPeriodEnd
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (supabaseAdmin && customerId) {
          await supabaseAdmin.from('negocios').update({
            subscription_status: 'active'
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (supabaseAdmin && customerId) {
          await supabaseAdmin.from('negocios').update({
            subscription_status: 'past_due'
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      default:
        // Evento no manejado específicamente pero recibido
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Error al procesar evento del webhook:', err);
    return NextResponse.json({ error: 'Error interno en procesamiento' }, { status: 500 });
  }
}
