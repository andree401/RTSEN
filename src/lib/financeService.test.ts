import { describe, it, expect, vi } from 'vitest';
import { FinanceService } from './financeService';
import { supabase } from './supabaseClient';

vi.mock('./supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn(),
        delete: vi.fn().mockReturnThis()
      }))
    }
  };
});

describe('FinanceService', () => {
  describe('getTransactionsByOwner', () => {
    it('debería retornar transacciones si no hay error', async () => {
      const mockData = [{ id: 1, negocio_id: '123', descripcion: 'Venta', monto: 100, tipo: 'Ingreso' }];
      
      const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq })
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await FinanceService.getTransactionsByOwner('123');
      expect(result).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('finanzas_registros');
      expect(mockEq).toHaveBeenCalledWith('negocio_id', '123');
    });

    it('debería lanzar error si Supabase falla', async () => {
      const mockError = { message: 'DB Error' };
      
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: mockError });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq })
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(FinanceService.getTransactionsByOwner('123')).rejects.toThrow('Error al obtener transacciones: DB Error');
    });
  });

  describe('deleteTransaction', () => {
    it('debería retornar true si la eliminación es exitosa', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: mockEq })
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await FinanceService.deleteTransaction(1);
      expect(result).toBe(true);
      expect(mockEq).toHaveBeenCalledWith('id', 1);
    });

    it('debería lanzar error si falla la eliminación', async () => {
      const mockError = { message: 'Delete Failed' };
      const mockEq = vi.fn().mockResolvedValue({ error: mockError });
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: mockEq })
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(FinanceService.deleteTransaction(1)).rejects.toThrow('Error al eliminar transacción: Delete Failed');
    });
  });
});
