import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(req: Request) {
  let client: Client | null = null;
  try {
    const authHeader = req.headers.get('x-superadmin-secret') || '';
    const body = await req.json().catch(() => ({}));
    const providedKey = (authHeader || body.secretKey || '').toString().trim();

    const expectedKey = (process.env.SUPERADMIN_SECRET_KEY || 'rtsen-master-saas-super-secret-2026!').trim();

    // Seguridad Zero-Knowledge: Si no es la clave secreta exacta, responder 404 para no revelar la existencia de la API
    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const connectionString = process.env.DATABASE_URL ||
      'postgresql://postgres:Hocxoq-7gunji-moxgop@db.bbjjmcuiwlebqljmwbms.supabase.co:5432/postgres';

    client = new Client({ connectionString });
    await client.connect();

    // Métricas agregadas de toda la plataforma
    const [negsRes, empsRes, cmdRes, txRes, topNegocios] = await Promise.all([
      client.query('SELECT count(*) as total FROM public.negocios;'),
      client.query('SELECT count(*) as total, count(CASE WHEN rol = \'cajero\' THEN 1 END) as cajeros, count(CASE WHEN rol = \'admin\' THEN 1 END) as admins, count(CASE WHEN rol = \'cocina\' THEN 1 END) as cocineros FROM public.empleados;'),
      client.query('SELECT count(*) as total, coalesce(sum(total), 0) as volumen_comandas FROM public.comandas;'),
      client.query('SELECT count(*) as total, coalesce(sum(CASE WHEN tipo = \'Ingreso\' THEN monto ELSE 0 END), 0) as ingresos_globales, coalesce(sum(CASE WHEN tipo = \'Gasto\' THEN monto ELSE 0 END), 0) as gastos_globales FROM public.finanzas_registros;'),
      client.query(`
        SELECT 
          n.id, 
          n.nombre, 
          n.owner_email, 
          n.created_at,
          (SELECT count(*) FROM public.comandas c WHERE c.negocio_id = n.id) as comandas_count,
          (SELECT count(*) FROM public.empleados e WHERE e.negocio_id = n.id) as empleados_count,
          (SELECT count(*) FROM public.menu_items m WHERE m.negocio_id = n.id) as menu_count
        FROM public.negocios n
        ORDER BY n.created_at DESC
        LIMIT 50;
      `)
    ]);

    const totalNegocios = Number(negsRes.rows[0]?.total || 0);
    const totalEmpleados = Number(empsRes.rows[0]?.total || 0);
    const totalComandas = Number(cmdRes.rows[0]?.total || 0);
    const volumenComandas = Number(cmdRes.rows[0]?.volumen_comandas || 0);
    const totalFinanzas = Number(txRes.rows[0]?.total || 0);
    const ingresosGlobales = Number(txRes.rows[0]?.ingresos_globales || 0);
    const gastosGlobales = Number(txRes.rows[0]?.gastos_globales || 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalNegocios,
        totalEmpleados,
        empleadosDesglose: {
          cajeros: Number(empsRes.rows[0]?.cajeros || 0),
          admins: Number(empsRes.rows[0]?.admins || 0),
          cocineros: Number(empsRes.rows[0]?.cocineros || 0)
        },
        totalComandas,
        volumenComandas,
        totalFinanzas,
        ingresosGlobales,
        gastosGlobales
      },
      restaurantes: topNegocios.rows
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error en /api/sys-ops/metrics:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {}
    }
  }
}
