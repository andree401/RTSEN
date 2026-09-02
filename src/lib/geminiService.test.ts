import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from './geminiService';
import { Transaction } from '../types/finance';

// Mock del fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeminiService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('debería calcular el balance correctamente y enviar solo las 5 más recientes', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Respuesta del asistente' }]
        }
      }]
    };
    
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse)
    });

    const transactions: Transaction[] = [
      { id: 1, negocio_id: '1', descripcion: 'Venta 1', tipo: 'Ingreso', monto: 100, fecha: '2026-09-01T10:00:00Z' },
      { id: 2, negocio_id: '1', descripcion: 'Gasto 1', tipo: 'Gasto', monto: 50, fecha: '2026-09-02T10:00:00Z' },
      { id: 3, negocio_id: '1', descripcion: 'Venta 2', tipo: 'Ingreso', monto: 200, fecha: '2026-09-03T10:00:00Z' },
      { id: 4, negocio_id: '1', descripcion: 'Gasto 2', tipo: 'Gasto', monto: 30, fecha: '2026-09-04T10:00:00Z' },
      { id: 5, negocio_id: '1', descripcion: 'Venta 3', tipo: 'Ingreso', monto: 150, fecha: '2026-09-05T10:00:00Z' },
      { id: 6, negocio_id: '1', descripcion: 'Gasto 3', tipo: 'Gasto', monto: 20, fecha: '2026-09-06T10:00:00Z' } // Esta es la más reciente
    ];
    // Ingresos: 100 + 200 + 150 = 450
    // Gastos: 50 + 30 + 20 = 100
    // Balance: 350

    const apiKey = 'test-key';
    const prompt = '¿Cómo van mis ventas?';

    const result = await GeminiService.askFinancialAssistant(transactions, prompt, apiKey);

    expect(result).toBe('Respuesta del asistente');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    const fetchCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const sentPrompt = fetchCallBody.contents[0].parts[0].text;
    
    // Verificamos que incluyó el balance correcto
    expect(sentPrompt).toContain('"balanceTotal":350');
    expect(sentPrompt).toContain('"ingresosTotales":450');
    expect(sentPrompt).toContain('"gastosTotales":100');
    
    // Debería incluir la transacción 6 (la más reciente) y omitir la 1 (la más antigua)
    expect(sentPrompt).toContain('Gasto 3');
    expect(sentPrompt).not.toContain('Venta 1');
  });

  it('debería lanzar error si falta la API key', async () => {
    await expect(GeminiService.askFinancialAssistant([], 'hola', '')).rejects.toThrow('API Key de Gemini es requerida.');
  });

  it('debería lanzar error si el prompt está vacío', async () => {
    await expect(GeminiService.askFinancialAssistant([], '   ', 'key')).rejects.toThrow('El prompt no puede estar vacío.');
  });

  it('debería manejar errores de la API de Gemini', async () => {
    const mockResponse = { error: { message: 'API error limit' } };
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse)
    });

    await expect(GeminiService.askFinancialAssistant([], 'hola', 'key')).rejects.toThrow('API error limit');
  });
});
