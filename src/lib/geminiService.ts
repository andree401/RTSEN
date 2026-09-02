import { Transaction } from '../types/finance';

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
  error?: {
    message?: string;
  };
}

export class GeminiService {
  /**
   * Envía un prompt al asistente financiero de Gemini con un contexto reducido
   * para ahorrar tokens, calculando el balance general y enviando solo las
   * 5 transacciones más recientes.
   * 
   * @param transactions Lista completa de transacciones
   * @param prompt Pregunta del usuario
   * @param apiKey Clave de API de Gemini
   * @returns Respuesta del asistente
   */
  static async askFinancialAssistant(
    transactions: Transaction[],
    prompt: string,
    apiKey: string
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('API Key de Gemini es requerida.');
    }

    if (!prompt.trim()) {
      throw new Error('El prompt no puede estar vacío.');
    }

    // Calcular ingresos, gastos y balance
    const ingresosTotales = transactions
      .filter(t => t.tipo === 'Ingreso')
      .reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
      
    const gastosTotales = transactions
      .filter(t => t.tipo === 'Gasto')
      .reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
      
    const balance = ingresosTotales - gastosTotales;

    // Ordenar por fecha descendente y tomar las 5 más recientes
    const recientes = [...transactions]
      .sort((a, b) => {
        const dateA = new Date(a.fecha || a.created_at || 0).getTime();
        const dateB = new Date(b.fecha || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    // Crear un contexto condensado
    const contextoCondensado = {
      balanceTotal: balance,
      ingresosTotales,
      gastosTotales,
      ultimasTransacciones: recientes.map(t => ({
        descripcion: t.descripcion,
        tipo: t.tipo,
        monto: t.monto,
        fecha: t.fecha || t.created_at
      }))
    };

    const contextPrompt = `Eres un asistente financiero. Datos financieros del usuario (resumen): ${JSON.stringify(contextoCondensado)}. Pregunta del usuario: ${prompt}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }]
        })
      });

      const data: GeminiResponse = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Error de la API de Gemini');
      }

      if (
        data.candidates && 
        data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0 &&
        data.candidates[0].content.parts[0].text
      ) {
        return data.candidates[0].content.parts[0].text;
      }

      throw new Error('Respuesta inesperada de Gemini.');
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error('Error de red al conectar con Gemini.');
    }
  }
}
