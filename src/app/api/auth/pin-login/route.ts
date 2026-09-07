import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(req: Request) {
  let client: Client | null = null;
  try {
    const { pin, role, negocio_id } = await req.json();

    const cleanPin = (pin || '').toString().trim();
    if (!cleanPin) {
      return NextResponse.json({ error: 'PIN requerido' }, { status: 400 });
    }

    if (!/^\d{5}$/.test(cleanPin)) {
      return NextResponse.json(
        { error: 'Formato de PIN inválido: debe contener exactamente 5 dígitos numéricos sin letras ni espacios' },
        { status: 400 }
      );
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('DATABASE_URL no configurada');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    client = new Client({ connectionString });
    await client.connect();

    let query = 'SELECT e.id, e.nombre, e.pin, e.negocio_id, e.rol, n.nombre as restaurante FROM public.empleados e JOIN public.negocios n ON e.negocio_id = n.id WHERE e.pin = $1';
    const params: (string | null)[] = [cleanPin];

    if (role && role !== 'all') {
      params.push(role);
      query += ` AND e.rol = $${params.length}`;
    }

    if (negocio_id) {
      params.push(negocio_id);
      query += ` AND e.negocio_id = $${params.length}`;
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'PIN inválido o no registrado para este rol.' }, { status: 401 });
    }

    const emp = result.rows[0];

    return NextResponse.json({
      success: true,
      employee: {
        id: emp.id,
        nombre: emp.nombre,
        pin: cleanPin,
        negocio_id: emp.negocio_id,
        rol: emp.rol || 'cajero',
        restaurante: emp.restaurante
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error en /api/auth/pin-login:', err);
    return NextResponse.json({ error: 'Error interno al validar PIN' }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {}
    }
  }
}
