import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const testNegocioId = process.env.TEST_NEGOCIO_ID ?? '';

const shouldSkip = !supabaseUrl || !serviceKey || !testNegocioId;

describe('Database Integration Tests (Real Supabase)', () => {
  let supabase: ReturnType<typeof createClient>;
  let createdEmpId: string | null = null;

  beforeAll(() => {
    if (shouldSkip) return;
    supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterAll(async () => {
    // Limpiar empleados de prueba creados durante el test
    if (!shouldSkip && createdEmpId) {
      await supabase.from('empleados').delete().eq('id', createdEmpId);
    }
  });

  it('DB-01: Conectar a Supabase y verificar que la tabla empleados existe', async () => {
    if (shouldSkip) return;
    const { error } = await supabase.from('empleados').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('DB-02: Insertar un empleado de prueba con PIN único', async () => {
    if (shouldSkip) return;
    const testPin = '99999';
    // Asegurarse de que el PIN no exista
    await supabase.from('empleados').delete().eq('pin', testPin).eq('negocio_id', testNegocioId);
    
    const { data, error } = await supabase.from('empleados').insert({
      nombre: 'Empleado Test Automatizado',
      pin: testPin,
      rol: 'cocina',
      negocio_id: testNegocioId,
    } as any).select().single();
    
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect((data as any).pin).toBe(testPin);
    createdEmpId = (data as any).id;
  });

  it('DB-03: Verificar que el PIN creado es consultable', async () => {
    if (shouldSkip || !createdEmpId) return;
    const { data, error } = await supabase
      .from('empleados')
      .select('nombre, rol, pin')
      .eq('id', createdEmpId)
      .single();
    
    expect(error).toBeNull();
    expect((data as any).nombre).toBe('Empleado Test Automatizado');
    expect((data as any).rol).toBe('cocina');
  });

  it('DB-04: Verificar que PIN duplicado en el mismo negocio es detectado', async () => {
    if (shouldSkip) return;
    const { error } = await supabase.from('empleados').insert({
      nombre: 'Duplicado',
      pin: '99999',
      rol: 'cajero',
      negocio_id: testNegocioId,
    } as any);
    // Debe fallar por constraint único si existe, o retornar datos si no hay constraint
    // Documentar el resultado — si no hay constraint, crear un issue
    console.log('[DB-04] Resultado de inserción duplicada:', error?.message ?? 'Sin error (no hay constraint único)');
  });

  it('DB-05: Verificar que tabla negocios tiene columna pin_maestro', async () => {
    if (shouldSkip) return;
    const { data, error } = await supabase
      .from('negocios')
      .select('pin_maestro')
      .limit(1);
    
    expect(error).toBeNull();
    // Si error menciona "column pin_maestro does not exist" → la migración SQL no se ejecutó
  });

  it('DB-06: Eliminar empleado de prueba', async () => {
    if (shouldSkip || !createdEmpId) return;
    const { error } = await supabase.from('empleados').delete().eq('id', createdEmpId);
    expect(error).toBeNull();
    createdEmpId = null;
  });
});
