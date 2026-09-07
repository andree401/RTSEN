import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClientHeader from '../src/components/ClientHeader';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock del contexto para simular que hay sesión iniciada
vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => ({
    ownerId: 'test-user',
    user: { id: 'test-user', email: 'test@example.com' },
    currentNegocio: { id: 'negocio-1', nombre: 'Restaurante Test' },
    signOut: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('ClientHeader (Dashboard render)', () => {
  it('renders navigation links and owner portal button', () => {
    render(<ClientHeader />);
    expect(screen.getByText('Finanzas')).toBeInTheDocument();
    expect(screen.getByText('🍽️ Cajero / POS')).toBeInTheDocument();
    expect(screen.getByText('COCINA')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Portal Dueño')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    render(<ClientHeader />);
    expect(screen.getByText('Salir')).toBeInTheDocument();
  });
});
