import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '../src/app/api/empleados/route';
import { NextResponse } from 'next/server';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

describe('Empleados API CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('1. GET sin token debe retornar 401', async () => {
    const req = new Request('http://localhost/api/empleados', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('2. POST con PIN inválido debe retornar 400', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    const req = new Request('http://localhost/api/empleados', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: 'Juan',
        rol: 'cajero',
        pin: '123'
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain('PIN');
  });

  it('3. POST con datos válidos debe retornar el empleado creado', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    const mockInsert = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'emp-1', nombre: 'Juan', rol: 'cajero', pin: '12345', negocio_id: 'test-user-id' },
        error: null
      })
    };

    const mockEq2 = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = {
      eq: mockEq1,
    };

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'empleados') {
        return {
          select: vi.fn().mockReturnValue(mockSelect),
          insert: vi.fn().mockReturnValue(mockInsert),
        };
      }
    });

    const req = new Request('http://localhost/api/empleados', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: 'Juan',
        rol: 'cajero',
        pin: '12345'
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.empleado.id).toBe('emp-1');
  });

  it('4. DELETE con id inválido debe retornar error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    const req = new Request('http://localhost/api/empleados', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
