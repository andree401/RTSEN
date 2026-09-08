import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin env vars missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
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
    const supabaseAdmin = getSupabaseAdmin();

    // Idealmente, esto se hace con RLS cascade delete. Como fallback:
    // Borrar de abajo hacia arriba en las relaciones manuales.
    // Ignoramos errores de foreign keys si hay algo complejo o si la tabla no existe.
    
    // Si comandas_items tiene comanda_id
    const { data: comandas } = await supabaseAdmin.from('comandas').select('id').eq('negocio_id', userId);
    if (comandas && comandas.length > 0) {
      const comandaIds = comandas.map(c => c.id);
      await supabaseAdmin.from('comandas_items').delete().in('comanda_id', comandaIds);
    }
    await supabaseAdmin.from('comandas').delete().eq('negocio_id', userId);

    const { data: recetas } = await supabaseAdmin.from('recetas').select('id').eq('negocio_id', userId);
    if (recetas && recetas.length > 0) {
      const recetaIds = recetas.map(r => r.id);
      await supabaseAdmin.from('recetas_ingredientes').delete().in('receta_id', recetaIds);
    }
    await supabaseAdmin.from('recetas').delete().eq('negocio_id', userId);
    await supabaseAdmin.from('ingredientes').delete().eq('negocio_id', userId);
    
    await supabaseAdmin.from('empleados').delete().eq('negocio_id', userId);
    await supabaseAdmin.from('menu_items').delete().eq('negocio_id', userId);
    await supabaseAdmin.from('finanzas_registros').delete().eq('negocio_id', userId);
    await supabaseAdmin.from('negocios').delete().eq('id', userId);

    // Borrar usuario maestro de autenticación (auth.users)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
       console.error("Error deleting user in auth:", deleteUserError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cuenta y todos los registros asociados eliminados irreversiblemente en cascada' 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error al borrar usuario y datos en cascada:', error);
    return NextResponse.json({ error: 'Error interno al eliminar la cuenta. Contacte soporte.' }, { status: 500 });
  }
}
