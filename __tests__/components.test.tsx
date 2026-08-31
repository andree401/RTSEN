import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClientHeader from '../src/components/ClientHeader';

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
