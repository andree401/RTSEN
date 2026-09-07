import Stripe from 'stripe';

export const PLANS = {
  monthly: {
    id: 'pro_monthly',
    name: 'Plan Pro Mensual',
    description: 'Acceso completo e ilimitado a Finanzas, POS, KDS e Inventario.',
    price: 19900,
    currency: 'crc',
    displayPrice: '₡19,900 / mes',
    interval: 'month' as const,
    priceEnvVar: 'STRIPE_PRICE_MONTHLY_ID',
  },
  annual: {
    id: 'pro_annual',
    name: 'Plan Pro Anual (2 meses gratis)',
    description: 'Acceso empresarial con ahorro del 17% y soporte preferencial.',
    price: 199000,
    currency: 'crc',
    displayPrice: '₡199,000 / año',
    interval: 'year' as const,
    priceEnvVar: 'STRIPE_PRICE_ANNUAL_ID',
  },
} as const;

export type PlanKey = keyof typeof PLANS;

let stripeInstance: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build';
  
  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2026-08-26.dahlia' as unknown as Stripe.LatestApiVersion,
    appInfo: {
      name: 'Finanzas Web Pro SaaS',
      version: '5.0.0',
      url: 'https://finanzas-web-pro.local',
    },
  });

  return stripeInstance;
}

export function isSubscriptionActive(status: string | null | undefined, periodEnd?: string | Date | null): boolean {
  if (!status) return false;
  
  const normalized = status.toLowerCase().trim();
  if (normalized === 'active') return true;

  if (normalized === 'trialing') {
    if (!periodEnd) return true;
    const expiry = new Date(periodEnd).getTime();
    return expiry > Date.now();
  }

  if (normalized === 'past_due' && periodEnd) {
    const gracePeriodEnd = new Date(periodEnd).getTime() + (3 * 24 * 60 * 60 * 1000);
    return gracePeriodEnd > Date.now();
  }

  return false;
}
