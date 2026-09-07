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
   * para ahorrar tokens, calculando el balance general y enviando las 5 transacciones
   * más recientes. Maneja cuotas, errores de clave y caídas de red de forma robusta.
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
    const trimmedKey = (apiKey || '').trim();
    if (!trimmedKey) {
      throw new Error('API Key de Gemini es requerida.');
    }

    const trimmedPrompt = (prompt || '').trim();
    if (!trimmedPrompt) {
      throw new Error('El prompt no puede estar vacío.');
    }

    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    const parseMonto = (m: unknown): number => {
      const val = Number(m);
      return Number.isFinite(val) ? val : 0;
    };

    // Calcular ingresos, gastos y balance
    const ingresosTotales = safeTransactions
      .filter(t => t && t.tipo === 'Ingreso')
      .reduce((acc, t) => acc + parseMonto(t.monto), 0);
      
    const gastosTotales = safeTransactions
      .filter(t => t && t.tipo === 'Gasto')
      .reduce((acc, t) => acc + parseMonto(t.monto), 0);
      
    const balance = ingresosTotales - gastosTotales;

    // Ordenar por fecha descendente y tomar las 5 más recientes
    const recientes = [...safeTransactions]
      .sort((a, b) => {
        const timeA = new Date(a.fecha || a.created_at || 0).getTime();
        const timeB = new Date(b.fecha || b.created_at || 0).getTime();
        const validA = Number.isFinite(timeA) ? timeA : 0;
        const validB = Number.isFinite(timeB) ? timeB : 0;
        return validB - validA;
      })
      .slice(0, 5);

    // Crear un contexto condensado para optimizar cuota de tokens
    const contextoCondensado = {
      balanceTotal: balance,
      ingresosTotales,
      gastosTotales,
      ultimasTransacciones: recientes.map(t => ({
        descripcion: t.descripcion,
        tipo: t.tipo,
        monto: parseMonto(t.monto),
        fecha: t.fecha || t.created_at
      }))
    };

    const contextPrompt = `Eres un asesor financiero experto y conciso para un negocio en Costa Rica. Las cifras monetarias son en Colones costarricenses (₡). Datos financieros del usuario (resumen): ${JSON.stringify(contextoCondensado)}. Pregunta del usuario: ${trimmedPrompt}`;

    try {
      // Intentar primero con el nuevo modelo Gemini 3.8 Flash
      let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${trimmedKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }]
        })
      });

      // Cadena de respaldo moderna si 3.8 Flash no responde (Gemini 3.7 Flash y Gemini 3.1 Flash-Lite)
      if (!res.ok && (res.status === 404 || res.status === 400)) {
        const fallbacks = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];
        for (const modelFallback of fallbacks) {
          const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelFallback}:generateContent?key=${trimmedKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: contextPrompt }] }]
            })
          });
          if (fallbackRes.ok) {
            res = fallbackRes;
            break;
          }
        }
      }

      let data: GeminiResponse;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Error al procesar la respuesta de Gemini (Código HTTP ${res.status}).`);
      }

      if (data.error) {
        const errMsg = data.error.message || 'Error de la API de Gemini';
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted')) {
          throw new Error('Cuota de Gemini excedida. Has alcanzado el límite gratuito temporal. Espera unos momentos o usa otra API Key.');
        }
        if (errMsg.toLowerCase().includes('api_key_invalid') || errMsg.toLowerCase().includes('not valid')) {
          throw new Error('API Key de Gemini no válida. Verifica tu clave en Google AI Studio.');
        }
        throw new Error(errMsg);
      }

      if (res.ok === false) {
        if (res.status === 429) {
          throw new Error('Cuota de Gemini excedida. Has alcanzado el límite gratuito temporal. Espera unos momentos o usa otra API Key.');
        }
        if (res.status === 400 || res.status === 403) {
          throw new Error('API Key de Gemini no válida. Verifica tu clave en Google AI Studio.');
        }
        throw new Error(`Error de la API de Gemini (${res.status}).`);
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
      throw new Error('Error de conexión al conectar con Gemini.');
    }
  }
}
