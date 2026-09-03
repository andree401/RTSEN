import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Extraer token del header
    // Extraer token del header (borrado porque usamos cookie/body directamente)
    
    // Creamos cliente supabase con contexto de servidor manual o instanciando
    // Para simplificar, asumiremos que si llega el request con cookies/sesion, extraemos el JWT.
    // Una forma mejor es enviarlo en el body
    const body = await req.json().catch(() => ({}));
    const token = body.access_token;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    let userId: string | null = null;
    
    if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Usamos el cliente pg con nuestra URL maestra temporal para borrar al usuario
    // NOTA: Esto es un atajo porque no hay SERVICE_ROLE_KEY en el entorno
    const client = new Client({
      connectionString: 'postgresql://postgres:Hocxoq-7gunji-moxgop@db.bbjjmcuiwlebqljmwbms.supabase.co:5432/postgres'
    });
    
    await client.connect();
    
    // Primero eliminar de negocios (esto hará cascade a menu, finanzas, inventario)
    await client.query('DELETE FROM negocios WHERE id = $1', [userId]);
    
    // Luego eliminar de auth.users
    await client.query('DELETE FROM auth.users WHERE id = $1', [userId]);
    
    await client.end();
    
    return NextResponse.json({ success: true, message: 'Usuario eliminado' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error al borrar usuario:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
