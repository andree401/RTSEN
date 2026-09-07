import { describe, it, expect } from 'vitest';
import { PLANS, isSubscriptionActive, getStripeServer } from '@/lib/stripe';

describe('Stripe Billing Module & Helpers', () => {
  describe('Plans Configuration', () => {
    it('debe tener definidos los planes mensual y anual en colones', () => {
      expect(PLANS.monthly).toBeDefined();
      expect(PLANS.annual).toBeDefined();

      expect(PLANS.monthly.interval).toBe('month');
      expect(PLANS.annual.interval).toBe('year');
      expect(PLANS.monthly.currency).toBe('crc');
      expect(PLANS.annual.currency).toBe('crc');
      expect(PLANS.monthly.price).toBeGreaterThan(0);
      expect(PLANS.annual.price).toBeGreaterThan(PLANS.monthly.price);
    });
  });

  describe('isSubscriptionActive helper', () => {
    it('debe retornar true si el estado es active', () => {
      expect(isSubscriptionActive('active')).toBe(true);
      expect(isSubscriptionActive('ACTIVE ')).toBe(true);
    });

    it('debe retornar false si el estado es null o vacio', () => {
      expect(isSubscriptionActive(null)).toBe(false);
      expect(isSubscriptionActive(undefined)).toBe(false);
      expect(isSubscriptionActive('')).toBe(false);
    });

    it('debe retornar true en trialing si la fecha no ha vencido', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      expect(isSubscriptionActive('trialing', futureDate)).toBe(true);
    });

    it('debe retornar false en trialing si la fecha ya expiró', () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(isSubscriptionActive('trialing', pastDate)).toBe(false);
    });

    it('debe permitir grace period de 3 dias para past_due', () => {
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(isSubscriptionActive('past_due', yesterday)).toBe(true);

      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      expect(isSubscriptionActive('past_due', fiveDaysAgo)).toBe(false);
    });

    it('debe retornar false si el estado es canceled o unpaid', () => {
      expect(isSubscriptionActive('canceled')).toBe(false);
      expect(isSubscriptionActive('unpaid')).toBe(false);
    });
  });

  describe('getStripeServer initialization', () => {
    it('debe inicializar la instancia de Stripe con fallback seguro para build y tests', () => {
      const stripe = getStripeServer();
      expect(stripe).toBeDefined();
      expect(typeof stripe.checkout.sessions.create).toBe('function');
      expect(typeof stripe.billingPortal.sessions.create).toBe('function');
    });
  });
});
