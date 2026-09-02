import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, transactions, geminiApiKey } = body;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'No se proporcionó la API Key de Gemini.' },
        { status: 401 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    let systemInstruction = "Eres un asesor financiero agresivo y experto para dueños de restaurantes. Analiza estos números y dame 3 consejos rápidos y duros para ganar más dinero.";
    if (transactions) {
      systemInstruction += `\n\nContexto de transacciones:\n${JSON.stringify(transactions)}`;
    }

    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Analiza mis finanzas.' }] });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
      }
    });

    return NextResponse.json({
      role: 'assistant',
      content: response.text
    });
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
