import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase admin env vars not configured');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('x-superadmin-secret') || '';
    const body = await req.json().catch(() => ({}));
    const providedKey = (authHeader || body.secretKey || '').toString().trim();

    const expectedKey = (process.env.SUPERADMIN_SECRET_KEY || '0002341').trim();

    const providedBuffer = Buffer.from(providedKey);
    const expectedBuffer = Buffer.from(expectedKey);
    const isMatch = providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);

    // Seguridad Zero-Knowledge: Si no es la clave secreta exacta, responder 404 para no revelar la existencia de la API
    if (!providedKey || !isMatch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    const [
      { count: totalNegocios },
      { data: empleadosData },
      { data: comandasData },
      { data: finanzasData },
      { data: topNegociosData }
    ] = await Promise.all([
      supabase.from('negocios').select('*', { count: 'exact', head: true }),
      supabase.from('empleados').select('rol'),
      supabase.from('comandas').select('total'),
      supabase.from('finanzas_registros').select('tipo, monto'),
      supabase.from('negocios').select('id, nombre, owner_email, created_at').order('created_at', { ascending: false }).limit(50)
    ]);

    const totalEmpleados = empleadosData?.length || 0;
    const empleadosDesglose = { cajeros: 0, admins: 0, cocineros: 0 };
    empleadosData?.forEach(e => {
      if (e.rol === 'cajero') empleadosDesglose.cajeros++;
      if (e.rol === 'admin') empleadosDesglose.admins++;
      if (e.rol === 'cocina') empleadosDesglose.cocineros++;
    });

    const totalComandas = comandasData?.length || 0;
    const volumenComandas = comandasData?.reduce((acc, c) => acc + (Number(c.total) || 0), 0) || 0;

    const totalFinanzas = finanzasData?.length || 0;
    let ingresosGlobales = 0;
    let gastosGlobales = 0;
    finanzasData?.forEach(f => {
      if (f.tipo === 'Ingreso') ingresosGlobales += Number(f.monto) || 0;
      if (f.tipo === 'Gasto') gastosGlobales += Number(f.monto) || 0;
    });

    // Para comandas_count, empleados_count y menu_count necesitamos hacer map
    // Para no exceder el timeout, haremos conteos rápidos o dejaremos en 0 si es complejo,
    // pero idealmente deberíamos tener una vista. Haremos subconsultas con Promise.all
    const restaurantes = await Promise.all((topNegociosData || []).map(async (n) => {
      const [{ count: cCount }, { count: eCount }, { count: mCount }] = await Promise.all([
        supabase.from('comandas').select('*', { count: 'exact', head: true }).eq('negocio_id', n.id),
        supabase.from('empleados').select('*', { count: 'exact', head: true }).eq('negocio_id', n.id),
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('negocio_id', n.id)
      ]);
      return {
        ...n,
        comandas_count: cCount || 0,
        empleados_count: eCount || 0,
        menu_count: mCount || 0
      };
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalNegocios: totalNegocios || 0,
        totalEmpleados,
        empleadosDesglose,
        totalComandas,
        volumenComandas,
        totalFinanzas,
        ingresosGlobales,
        gastosGlobales
      },
      restaurantes
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error en /api/sys-ops/metrics:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido. sys-ops/metrics requiere POST con autorización Zero-Knowledge.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. sys-ops/metrics requiere POST con autorización Zero-Knowledge.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. sys-ops/metrics requiere POST con autorización Zero-Knowledge.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
