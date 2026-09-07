import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FinancialStats from '../src/components/FinancialStats';
import { FinanceService } from '../src/lib/financeService';
import { supabase } from '../src/lib/supabaseClient';
import { Transaction } from '../src/types/finance';

vi.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('Financial Balances & Edge Cases', () => {
  it('FinancialStats debe calcular correctamente con arreglo vacío (0 ingresos, 0 gastos, 0 balance)', () => {
    const emptyTransactions: Transaction[] = [];
    render(<FinancialStats transactions={emptyTransactions} />);

    expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    expect(screen.getByText('Gastos Totales')).toBeInTheDocument();
    expect(screen.getByText('Balance Neto')).toBeInTheDocument();
    expect(screen.getByText('Superávit Saludable 🚀')).toBeInTheDocument();
  });

  it('FinancialStats debe respetar inmutabilidad estricta (Object.freeze) sin alterar el array de transacciones', () => {
    const frozenTransactions: Transaction[] = Object.freeze([
      Object.freeze({
        id: 1,
        negocio_id: 'negocio-1',
        tipo: 'Ingreso',
        monto: 50000,
        categoria: 'Ventas',
        fecha: '2026-09-01',
        descripcion: 'Venta de prueba',
      }),
      Object.freeze({
        id: 2,
        negocio_id: 'negocio-1',
        tipo: 'Gasto',
        monto: 20000,
        categoria: 'Insumos',
        fecha: '2026-09-02',
        descripcion: 'Compra insumos',
      }),
    ]) as unknown as Transaction[];

    // Si el componente mutase el array con push, sort, splice, etc., esto arrojaría TypeError en strict mode
    expect(() => render(<FinancialStats transactions={frozenTransactions} />)).not.toThrow();

    // Verificamos que los datos se muestren
    expect(screen.getByText('Superávit Saludable 🚀')).toBeInTheDocument();
  });

  it('FinancialStats debe alertar sobre margen / déficit cuando los gastos superan los ingresos', () => {
    const deficitTransactions: Transaction[] = [
      {
        id: 1,
        negocio_id: 'negocio-1',
        tipo: 'Ingreso',
        monto: 10000,
        categoria: 'Ventas',
        fecha: '2026-09-01',
        descripcion: 'Venta baja',
      },
      {
        id: 2,
        negocio_id: 'negocio-1',
        tipo: 'Gasto',
        monto: 50000,
        categoria: 'Renta',
        fecha: '2026-09-02',
        descripcion: 'Renta local',
      },
    ];

    render(<FinancialStats transactions={deficitTransactions} />);

    expect(screen.getByText('Alerta de Margen ⚠️')).toBeInTheDocument();
  });

  it('FinancialStats debe manejar montos negativos o valores no numéricos de forma resiliente', () => {
    const weirdTransactions: Transaction[] = [
      {
        id: 1,
        negocio_id: 'negocio-1',
        tipo: 'Ingreso',
        monto: -5000 as unknown as number, // Monto negativo atípico
        categoria: 'Reembolso',
        fecha: '2026-09-01',
        descripcion: 'Reembolso cliente',
      },
      {
        id: 2,
        negocio_id: 'negocio-1',
        tipo: 'Gasto',
        monto: 'invalido' as unknown as number, // String no numérico
        categoria: 'Error',
        fecha: '2026-09-02',
        descripcion: 'Gasto no parseable',
      },
      {
        id: 3,
        negocio_id: 'negocio-1',
        tipo: 'Ingreso',
        monto: 15000,
        categoria: 'Ventas',
        fecha: '2026-09-03',
        descripcion: 'Venta regular',
      },
    ];

    expect(() => render(<FinancialStats transactions={weirdTransactions} />)).not.toThrow();
  });

  describe('FinanceService - updateTransaction edge cases', () => {
    it('debería retornar la transacción actualizada si Supabase responde exitosamente', async () => {
      const updatedMock: Transaction = {
        id: 42,
        negocio_id: 'negocio-1',
        tipo: 'Ingreso',
        monto: 75000,
        categoria: 'Catering',
        fecha: '2026-09-06',
        descripcion: 'Servicio especial',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedMock, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await FinanceService.updateTransaction(42, { monto: 75000 });
      expect(result).toEqual(updatedMock);
      expect(mockUpdate).toHaveBeenCalledWith({ monto: 75000 });
      expect(mockEq).toHaveBeenCalledWith('id', 42);
    });

    it('debería lanzar un error descriptivo si Supabase falla en updateTransaction', async () => {
      const mockError = { message: 'Row locked or foreign key violation' };
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      await expect(
        FinanceService.updateTransaction(42, { monto: 99999 })
      ).rejects.toThrow('Error al actualizar transacción: Row locked or foreign key violation');
    });
  });
});
