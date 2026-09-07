import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import SessionWarningModal from '../src/components/SessionWarningModal';

describe('SessionWarningModal', () => {
  const mockStayLoggedIn = vi.fn();
  const mockLogout = vi.fn();

  test('no debe renderizar nada cuando isOpen es false', () => {
    const { container } = render(
      <SessionWarningModal
        isOpen={false}
        remainingSeconds={60}
        onStayLoggedIn={mockStayLoggedIn}
        onLogout={mockLogout}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('debe renderizar el modal, contador y textos cuando isOpen es true', () => {
    render(
      <SessionWarningModal
        isOpen={true}
        remainingSeconds={90} // 1 minuto 30 segundos -> 01:30
        onStayLoggedIn={mockStayLoggedIn}
        onLogout={mockLogout}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/¿Sigues ahí\?/i)).toBeInTheDocument();
    expect(screen.getByText(/01:30/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mantener activa/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  test('debe llamar a onStayLoggedIn al hacer clic en el botón principal', () => {
    mockStayLoggedIn.mockClear();
    render(
      <SessionWarningModal
        isOpen={true}
        remainingSeconds={45}
        onStayLoggedIn={mockStayLoggedIn}
        onLogout={mockLogout}
      />
    );

    const btnStay = screen.getByRole('button', { name: /mantener activa/i });
    fireEvent.click(btnStay);

    expect(mockStayLoggedIn).toHaveBeenCalledTimes(1);
  });

  test('debe llamar a onLogout al hacer clic en el botón de cerrar sesión', () => {
    mockLogout.mockClear();
    render(
      <SessionWarningModal
        isOpen={true}
        remainingSeconds={45}
        onStayLoggedIn={mockStayLoggedIn}
        onLogout={mockLogout}
      />
    );

    const btnLogout = screen.getByRole('button', { name: /cerrar sesión/i });
    fireEvent.click(btnLogout);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
