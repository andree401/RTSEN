import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClientHeader from '../src/components/ClientHeader';

// Mock del contexto para simular que hay sesión iniciada
vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    currentNegocio: { id: 'negocio-1', nombre: 'Restaurante Test' },
    signOut: vi.fn(),
  }),
}));

describe('ClientHeader (Dashboard render)', () => {
  it('renders navigation links', () => {
    render(<ClientHeader />);
    expect(screen.getByText('Finanzas')).toBeInTheDocument();
    expect(screen.getByText('Restaurante')).toBeInTheDocument();
    expect(screen.getByText('COCINA')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    render(<ClientHeader />);
    expect(screen.getByText('Salir')).toBeInTheDocument();
  });
});
