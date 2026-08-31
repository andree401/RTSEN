import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Simular límite de seguridad básico
    if (body.message && body.message.length > 500) {
      return NextResponse.json(
        { error: 'Mensaje demasiado largo. Límite de 500 caracteres excedido.' },
        { status: 400 }
      );
    }

    // Mensaje dummy de Gemini
    return NextResponse.json({
      role: 'assistant',
      content: '¡Hola! Soy Gemini, tu asistente financiero. (Esta es una respuesta simulada).'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
