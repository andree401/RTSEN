import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_API_URL ?? 'http://localhost:3000';
const shouldSkip = !process.env.TEST_API_URL && !process.env.RUN_API_TESTS;

describe('API Real Tests (requiere servidor corriendo)', () => {
  it('API-01: POST /api/auth/pin-login sin PIN → 400', async () => {
    if (shouldSkip) return;
    const res = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('PIN');
  });

  it('API-02: POST /api/auth/pin-login con PIN de letras → 400', async () => {
    if (shouldSkip) return;
    const res = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: 'abcde' }),
    });
    expect(res.status).toBe(400);
  });

  it('API-03: POST /api/auth/pin-login con PIN inexistente → 401', async () => {
    if (shouldSkip) return;
    const res = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '00000' }),
    });
    expect(res.status).toBe(401);
  });

  it('API-04: GET /api/empleados sin token → 401', async () => {
    if (shouldSkip) return;
    const res = await fetch(`${BASE_URL}/api/empleados`);
    expect(res.status).toBe(401);
  });

  it('API-05: POST /api/empleados sin token → 401', async () => {
    if (shouldSkip) return;
    const res = await fetch(`${BASE_URL}/api/empleados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test', rol: 'cajero' }),
    });
    expect(res.status).toBe(401);
  });

  it('API-06: GET /api/stripe/status sin token → 401 o error manejado', async () => {
    if (shouldSkip) return;
    const res = await fetch(`${BASE_URL}/api/stripe/status`);
    expect([401, 400, 500]).toContain(res.status);
  });
});
