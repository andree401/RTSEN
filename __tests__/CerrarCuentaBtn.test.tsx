import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import CerrarCuentaBtn from '../src/components/CerrarCuentaBtn';

// Mock de la dependencia de contexto o fetch si es necesario
const mockDeleteAccount = vi.fn();

describe('CerrarCuentaBtn', () => {
  test('Debería requerir dos pasos antes de llamar a la función de eliminar', () => {
    render(<CerrarCuentaBtn onDelete={mockDeleteAccount} />);
    
    // 1. Verificar el botón inicial
    const btnInicial = screen.getByRole('button', { name: /cerrar cuenta/i });
    expect(btnInicial).toBeInTheDocument();
    
    // Hacer clic en el botón inicial
    fireEvent.click(btnInicial);
    
    // 2. Verificar la primera pregunta
    expect(screen.getByText(/¿Estás seguro de que deseas cerrar tu cuenta?/i)).toBeInTheDocument();
    
    // Confirmar primer paso
    const btnContinuar = screen.getByRole('button', { name: /sí, continuar/i });
    fireEvent.click(btnContinuar);
    
    // 3. Verificar la segunda pregunta
    expect(screen.getByText(/Esta acción es irreversible y eliminará todos tus datos./i)).toBeInTheDocument();
    
    // Confirmar segundo paso
    const btnEliminarDefinitivamente = screen.getByRole('button', { name: /eliminar definitivamente/i });
    fireEvent.click(btnEliminarDefinitivamente);
    
    // Verificar que se llamó a la función
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
