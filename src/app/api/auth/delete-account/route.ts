import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

export async function POST(req: Request) {
  let client: Client | null = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Extraer token del header Authorization o del body
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const body = await req.json().catch(() => ({}));
      token = body.access_token || null;
    }

    if (!token) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado o sesión expirada' }, { status: 401 });
    }

    const userId = user.id;

    // Conexión a la base de datos para ejecutar el borrado irreversible
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('DATABASE_URL no configurada');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    client = new Client({ connectionString });
    await client.connect();

    // Iniciar transacción atómica para borrado en cascada integral
    await client.query('BEGIN');

    // 1. Borrar items de comandas asociadas a comandas del negocio
    await client.query(`
      DELETE FROM comandas_items 
      WHERE comanda_id IN (
        SELECT id FROM comandas WHERE negocio_id = $1
      )
    `, [userId]).catch(() => {
      // Ignorar si la tabla aún no existe en este entorno
    });

    // 2. Borrar comandas del negocio
    await client.query('DELETE FROM comandas WHERE negocio_id = $1', [userId]).catch(() => {});

    // 3. Borrar recetas e ingredientes si existen tablas
    await client.query(`
      DELETE FROM recetas_ingredientes 
      WHERE receta_id IN (
        SELECT id FROM recetas WHERE negocio_id = $1
      )
    `, [userId]).catch(() => {});
    await client.query('DELETE FROM recetas WHERE negocio_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM ingredientes WHERE negocio_id = $1', [userId]).catch(() => {});

    // 4. Borrar empleados registrados bajo este negocio
    await client.query('DELETE FROM empleados WHERE negocio_id = $1', [userId]).catch(() => {});

    // 5. Borrar platillos del menú
    await client.query('DELETE FROM menu_items WHERE negocio_id = $1', [userId]);

    // 6. Borrar registros financieros
    await client.query('DELETE FROM finanzas_registros WHERE negocio_id = $1', [userId]);

    // 7. Borrar negocio raíz
    await client.query('DELETE FROM negocios WHERE id = $1', [userId]);

    // 8. Borrar usuario maestro de autenticación (auth.users)
    await client.query('DELETE FROM auth.users WHERE id = $1', [userId]);

    // Confirmar transacción
    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: 'Cuenta y todos los registros asociados eliminados irreversiblemente en cascada' 
    }, { status: 200 });

  } catch (error: unknown) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error al borrar usuario y datos en cascada:', error);
    return NextResponse.json({ error: 'Error interno al eliminar la cuenta. Contacte soporte.' }, { status: 500 });
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}
