import { NextResponse } from 'next/server';
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

interface PinLoginBody {
  pin?: unknown;
  role?: unknown;
  negocio_id?: unknown;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as PinLoginBody;
    const cleanPin = (body.pin?.toString() ?? '').trim();

    if (!cleanPin) {
      return NextResponse.json({ error: 'PIN requerido' }, { status: 400 });
    }
    if (!/^\d{5}$/.test(cleanPin)) {
      return NextResponse.json(
        { error: 'Formato de PIN inválido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('empleados')
      .select('id, nombre, pin, negocio_id, rol, negocios!inner(nombre)')
      .eq('pin', cleanPin);

    const role = typeof body.role === 'string' ? body.role : null;
    if (role && role !== 'all') query = query.eq('rol', role);

    const negocioId = typeof body.negocio_id === 'string' ? body.negocio_id : null;
    if (negocioId) query = query.eq('negocio_id', negocioId);

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: 'PIN inválido o no registrado para este rol.' },
        { status: 401 }
      );
    }

    type NegocioRef = { nombre: string };
    const restaurante = (data.negocios as unknown as NegocioRef)?.nombre ?? '';

    return NextResponse.json({
      success: true,
      employee: {
        id: data.id,
        nombre: data.nombre,
        pin: cleanPin,
        negocio_id: data.negocio_id,
        rol: (data.rol as string) ?? 'cajero',
        restaurante,
      },
    });
  } catch (error: unknown) {
    console.error('[pin-login] Error:', error);
    return NextResponse.json({ error: 'Error interno al validar PIN' }, { status: 500 });
  }
}
