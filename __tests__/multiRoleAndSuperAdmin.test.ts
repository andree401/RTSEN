import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as pinLoginHandler } from '../src/app/api/auth/pin-login/route';
import { POST as superAdminHandler } from '../src/app/api/sys-ops/metrics/route';

// Asegurar variables de entorno requeridas por los endpoints (la conexión real es mockeada)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';
process.env.SUPERADMIN_SECRET_KEY = process.env.SUPERADMIN_SECRET_KEY || '0002341';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock-supabase.local';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';

// Mock de pg Client (used by metrics)
const mockQuery = vi.fn();
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockEnd = vi.fn().mockResolvedValue(undefined);

vi.mock('pg', () => {
  return {
    Client: vi.fn().mockImplementation(function() {
      return {
        connect: mockConnect,
        query: mockQuery,
        end: mockEnd,
      };
    }),
  };
});

// Mock Supabase
const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockEq4 = vi.fn().mockReturnValue({ limit: mockLimit, maybeSingle: mockMaybeSingle, order: mockOrder });
const mockEq3 = vi.fn().mockReturnValue({ eq: mockEq4, limit: mockLimit, maybeSingle: mockMaybeSingle, order: mockOrder });
const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3, limit: mockLimit, maybeSingle: mockMaybeSingle, order: mockOrder });
const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2, limit: mockLimit, maybeSingle: mockMaybeSingle, order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1, order: mockOrder, limit: mockLimit });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, update: vi.fn(), delete: vi.fn() });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Sistema Multi-Rol: Endpoint /api/auth/pin-login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe rechazar la solicitud si el PIN está vacío o no se envía', async () => {
    const req = new Request('http://localhost:3000/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '' }),
    });

    const res = await pinLoginHandler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('PIN requerido');
  });

  it('debe rechazar con 401 si el PIN no existe en la base de datos', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const req = new Request('http://localhost:3000/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '99999' }),
    });

    const res = await pinLoginHandler(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error).toContain('PIN inválido');
  });

  it('debe autenticar con éxito a un empleado si el PIN es correcto', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'emp-123',
        nombre: 'María Cajera',
        pin: '12345',
        negocio_id: 'negocio-uuid-1',
        rol: 'cajero',
        negocios: { nombre: 'Pizzería Napolitana' },
      },
      error: null,
    });

    const req = new Request('http://localhost:3000/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '12345' }),
    });

    const res = await pinLoginHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.employee.nombre).toBe('María Cajera');
    expect(json.employee.rol).toBe('cajero');
    expect(json.employee.negocio_id).toBe('negocio-uuid-1');
  });
});

describe('Portal Secreto SuperAdmin: Endpoint /api/sys-ops/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe responder 404 (Zero-Knowledge) si la clave maestra falta o es incorrecta', async () => {
    const req = new Request('http://localhost:3000/api/sys-ops/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey: 'clave-falsa-123' }),
    });

    const res = await superAdminHandler(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('Not found');
  });

  it('debe retornar métricas globales de toda la plataforma si se provee la clave correcta', async () => {
    // Mock responses for the 5 global queries
    mockSelect
      .mockResolvedValueOnce({ count: 14, data: null, error: null }) // negocios count
      .mockResolvedValueOnce({ data: [ { rol: 'cajero' }, { rol: 'cajero' }, { rol: 'cajero' }, { rol: 'cajero' }, { rol: 'cajero' }, { rol: 'admin' }, { rol: 'admin' }, { rol: 'cocina' } ], error: null }) // empleados
      .mockResolvedValueOnce({ data: Array(34).fill({ total: 0 }).concat({ total: 450000 }), error: null }) // comandas
      .mockResolvedValueOnce({ data: [ { tipo: 'Ingreso', monto: 750000 }, { tipo: 'Gasto', monto: 200000 } ], error: null }); // finanzas
      
    mockLimit.mockResolvedValueOnce({
      data: [
        {
          id: 'negocio-1',
          nombre: 'Café Central',
          owner_email: 'cafe@owner.com',
          created_at: new Date().toISOString(),
        },
      ],
      error: null
    }); // topNegocios

    // Mock responses for the 3 subqueries per topNegocio
    mockEq1
      .mockResolvedValueOnce({ count: 15, data: null, error: null }) // comandas count
      .mockResolvedValueOnce({ count: 3, data: null, error: null }) // empleados count
      .mockResolvedValueOnce({ count: 20, data: null, error: null }); // menu count

    const validKey = process.env.SUPERADMIN_SECRET_KEY || '0002341';

    const req = new Request('http://localhost:3000/api/sys-ops/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-superadmin-secret': validKey,
      },
      body: JSON.stringify({ secretKey: validKey }),
    });

    const res = await superAdminHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.summary.totalNegocios).toBe(14);
    expect(json.summary.totalEmpleados).toBe(8);
    expect(json.summary.totalComandas).toBe(35);
    expect(json.summary.volumenComandas).toBe(450000);
    expect(json.restaurantes.length).toBe(1);
    expect(json.restaurantes[0].nombre).toBe('Café Central');
  });

  it('debe rechazar métodos HTTP indebidos (GET, PUT, DELETE) con status 405 Method Not Allowed', async () => {
    const { GET, PUT, DELETE } = await import('../src/app/api/sys-ops/metrics/route');

    const resGet = await GET();
    expect(resGet.status).toBe(405);
    const jsonGet = await resGet.json();
    expect(jsonGet.error).toContain('Método no permitido');

    const resPut = await PUT();
    expect(resPut.status).toBe(405);
    const jsonPut = await resPut.json();
    expect(jsonPut.error).toContain('Método no permitido');

    const resDelete = await DELETE();
    expect(resDelete.status).toBe(405);
    const jsonDelete = await resDelete.json();
    expect(jsonDelete.error).toContain('Método no permitido');
  });

  it('debe mitigar cabeceras maliciosas (SQLi, XSS, Path Traversal, Buffer Overflow) respondiendo 404 sin consultar BD', async () => {
    const maliciousHeadersList: Record<string, string>[] = [
      { 'x-superadmin-secret': "' OR '1'='1" },
      { 'x-superadmin-secret': '<script>alert("XSS")</script>' },
      { 'x-superadmin-secret': '../../../../etc/shadow' },
      { 'x-superadmin-secret': 'A'.repeat(5000) },
      { 'x-superadmin-secret': 'rtsen-master-saas-super-secret-2026!%00exploit' },
      { 'authorization': 'Bearer malicious_token_attempt' },
    ];

    for (const badHeaders of maliciousHeadersList) {
      const req = new Request('http://localhost:3000/api/sys-ops/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...badHeaders,
        },
        body: JSON.stringify({ secretKey: 'invalid' }),
      });

      const res = await superAdminHandler(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not found');
    }

    // Verificar independencia y que jamás tocó la base de datos
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('Auditoría Edge Cases: Validación Estricta de PIN (5 Dígitos Numéricos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe rechazar PINs que contengan letras con código 400', async () => {
    const invalidPins = ['12a45', 'abcde', 'PIN12', '1234F', '0000x'];

    for (const pin of invalidPins) {
      const req = new Request('http://localhost:3000/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const res = await pinLoginHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Formato de PIN inválido');
    }
    // No debe consultar base de datos si el formato es inválido
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it('debe rechazar PINs con espacios intermedios o espacios internos con código 400', async () => {
    const spacedPins = ['12 45', '1 2 3 4 5', '123 4', ' 12 34 '];

    for (const pin of spacedPins) {
      const req = new Request('http://localhost:3000/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const res = await pinLoginHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Formato de PIN inválido');
    }
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('debe rechazar PINs con longitud distinta a exactamente 5 dígitos con código 400', async () => {
    const wrongLengthPins = ['1', '12', '123', '1234', '123456', '123456789'];

    for (const pin of wrongLengthPins) {
      const req = new Request('http://localhost:3000/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const res = await pinLoginHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Formato de PIN inválido');
    }
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('debe rechazar PINs con caracteres especiales o intentos de inyección SQL con código 400', async () => {
    const dangerousPins = ["12'34", '12;34', '12-34', '12#45', '1234!'];

    for (const pin of dangerousPins) {
      const req = new Request('http://localhost:3000/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const res = await pinLoginHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Formato de PIN inválido');
    }
    expect(mockQuery).not.toHaveBeenCalled();
  });
});