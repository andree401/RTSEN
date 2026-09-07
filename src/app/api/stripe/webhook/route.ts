import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Client } from 'pg';
import Stripe from 'stripe';
import { getStripeServer } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let pgClient: Client | null = null;
  const rawBody = await req.text();
  const signature = (await headers()).get('stripe-signature');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeServer();

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // Fallback para entornos de desarrollo / pruebas locales sin webhook secret estricto
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Error al verificar firma del Webhook de Stripe:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
      await pgClient.connect();
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const negocioId = session.metadata?.negocio_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (pgClient && negocioId) {
          await pgClient.query(
            `UPDATE public.negocios 
             SET stripe_customer_id = COALESCE($1, stripe_customer_id),
                 stripe_subscription_id = COALESCE($2, stripe_subscription_id),
                 subscription_status = 'active',
                 subscription_plan = COALESCE($3, subscription_plan)
             WHERE id = $4`,
            [customerId, subscriptionId, session.metadata?.plan || 'monthly', negocioId]
          );
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status; // 'active', 'past_due', 'canceled', 'unpaid', etc.
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

        if (pgClient && customerId) {
          await pgClient.query(
            `UPDATE public.negocios 
             SET subscription_status = $1,
                 stripe_subscription_id = $2,
                 current_period_end = $3
             WHERE stripe_customer_id = $4`,
            [status, subscription.id, currentPeriodEnd, customerId]
          );
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (pgClient && customerId) {
          await pgClient.query(
            `UPDATE public.negocios 
             SET subscription_status = 'active'
             WHERE stripe_customer_id = $1`,
            [customerId]
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (pgClient && customerId) {
          await pgClient.query(
            `UPDATE public.negocios 
             SET subscription_status = 'past_due'
             WHERE stripe_customer_id = $1`,
            [customerId]
          );
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
  } finally {
    if (pgClient) {
      await pgClient.end().catch(() => {});
    }
  }
}
