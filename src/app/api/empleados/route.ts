import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractToken(req: Request): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') ?? null;
}

export async function GET(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: userAuth, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userAuth?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocio_id = userAuth.user.id;

    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('negocio_id', negocio_id)
      .order('nombre', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, empleados: data });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: userAuth, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userAuth?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocio_id = userAuth.user.id;
    const body = await req.json();
    const { nombre, rol } = body;
    let pin = body.pin;

    if (!nombre || !rol) {
      return NextResponse.json({ error: 'Nombre y rol son requeridos' }, { status: 400 });
    }

    if (pin) {
      if (!/^\d{5}$/.test(pin)) {
        return NextResponse.json({ error: 'PIN debe ser exactamente de 5 dígitos' }, { status: 400 });
      }
    } else {
      pin = Math.floor(10000 + Math.random() * 90000).toString();
    }

    const { data, error } = await supabase
      .from('empleados')
      .insert([{ nombre, rol, pin, negocio_id }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El PIN ya está en uso en este negocio' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, empleado: data });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: userAuth, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userAuth?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocio_id = userAuth.user.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id)
      .eq('negocio_id', negocio_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: userAuth, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userAuth?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocio_id = userAuth.user.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const body = await req.json();
    const updateData: Record<string, string | number | boolean> = {};

    if (body.nombre) updateData.nombre = body.nombre;
    if (body.pin) {
      if (!/^\d{5}$/.test(body.pin)) {
        return NextResponse.json({ error: 'PIN debe ser exactamente de 5 dígitos' }, { status: 400 });
      }
      updateData.pin = body.pin;
    }
    if (body.rol) updateData.rol = body.rol;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('empleados')
      .update(updateData)
      .eq('id', id)
      .eq('negocio_id', negocio_id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El PIN ya está en uso en este negocio' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, empleado: data });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
