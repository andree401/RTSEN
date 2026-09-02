import { supabase } from './supabaseClient';
import { Transaction } from '../types/finance';

export class FinanceService {
  /**
   * Obtiene las transacciones de un negocio específico.
   * @param ownerId ID del dueño del negocio
   * @returns Lista de transacciones
   */
  static async getTransactionsByOwner(ownerId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('finanzas_registros')
      .select('*')
      .eq('negocio_id', ownerId);

    if (error) {
      throw new Error(`Error al obtener transacciones: ${error.message}`);
    }

    return (data || []) as Transaction[];
  }

  /**
   * Elimina una transacción por su ID.
   * @param transactionId ID de la transacción a eliminar
   * @returns true si se eliminó correctamente
   */
  static async deleteTransaction(transactionId: number): Promise<boolean> {
    const { error } = await supabase
      .from('finanzas_registros')
      .delete()
      .eq('id', transactionId);

    if (error) {
      throw new Error(`Error al eliminar transacción: ${error.message}`);
    }

    return true;
  }

  /**
   * Actualiza una transacción por su ID.
   * @param transactionId ID de la transacción a actualizar
   * @param updates Objeto con los campos a actualizar
   * @returns La transacción actualizada
   */
  static async updateTransaction(transactionId: number, updates: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('finanzas_registros')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar transacción: ${error.message}`);
    }

    return data as Transaction;
  }
}
