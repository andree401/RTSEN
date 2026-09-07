import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CocinaKDS from '../src/app/cocina/page';
import { supabase } from '../src/lib/supabaseClient';
import * as soundEffects from '../src/lib/soundEffects';

vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => ({
    ownerId: 'test-negocio-owner-123',
    currentNegocio: { id: 'test-negocio-owner-123', nombre: 'Restaurante KDS Test' },
  }),
}));

vi.mock('../src/lib/soundEffects', () => ({
  playOrderBell: vi.fn(),
  playOrderReadySound: vi.fn(),
}));

vi.mock('../src/lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb) => {
          if (cb) cb('SUBSCRIBED', null);
          return { unsubscribe: vi.fn() };
        }),
      })),
      removeChannel: vi.fn(),
    },
  };
});

describe('Cocina KDS (Kitchen Display System)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar estado vacío cuando no hay comandas pendientes', async () => {
    const mockEqNegocio = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEqEstado = vi.fn().mockReturnValue({ eq: mockEqNegocio });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqEstado });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as never);

    render(<CocinaKDS />);

    await waitFor(() => {
      expect(screen.getByText(/Cocina al día/i)).toBeInTheDocument();
      expect(screen.getByText(/No hay pedidos pendientes/i)).toBeInTheDocument();
    });
  });

  it('debe renderizar comandas activas con mesa y platillos', async () => {
    const mockComandas = [
      {
        id: 'comanda-1',
        mesa: 'Mesa 4 - Terraza',
        created_at: new Date().toISOString(),
        negocio_id: 'test-negocio-owner-123',
        comandas_items: [
          {
            id: 'item-1',
            cantidad: 2,
            notas: 'Sin cebolla',
            menu_items: { nombre: 'Hamburguesa Artesanal' },
          },
          {
            id: 'item-2',
            cantidad: 1,
            menu_items: { nombre: 'Papas Rústicas' },
          },
        ],
      },
    ];

    const mockEqNegocio = vi.fn().mockResolvedValue({ data: mockComandas, error: null });
    const mockEqEstado = vi.fn().mockReturnValue({ eq: mockEqNegocio });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqEstado });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as never);

    render(<CocinaKDS />);

    await waitFor(() => {
      expect(screen.getByText('Mesa 4 - Terraza')).toBeInTheDocument();
      expect(screen.getByText(/Hamburguesa Artesanal/i)).toBeInTheDocument();
      expect(screen.getByText(/2x/i)).toBeInTheDocument();
      expect(screen.getByText(/Sin cebolla/i)).toBeInTheDocument();
      expect(screen.getByText(/Papas Rústicas/i)).toBeInTheDocument();
    });
  });

  it('debe reproducir sonido y despachar la comanda a completada al hacer clic en ¡FUEGO!', async () => {
    const mockComandas = [
      {
        id: 'comanda-despacho-1',
        mesa: 'Mesa 7',
        created_at: new Date().toISOString(),
        negocio_id: 'test-negocio-owner-123',
        comandas_items: [
          {
            id: 'item-1',
            cantidad: 1,
            menu_items: { nombre: 'Pizza Margarita' },
          },
        ],
      },
    ];

    const mockEqNegocio = vi.fn().mockResolvedValue({ data: mockComandas, error: null });
    const mockEqEstado = vi.fn().mockReturnValue({ eq: mockEqNegocio });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqEstado });

    const mockEqNegocioUpdate = vi.fn().mockResolvedValue({ error: null });
    const mockEqUpdate = vi.fn().mockReturnValue({ eq: mockEqNegocioUpdate, then: (resolve: any) => resolve({ error: null }) });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'comandas') {
        return {
          select: mockSelect,
          update: mockUpdate,
        } as never;
      }
      return {} as never;
    });

    render(<CocinaKDS />);

    const fuegoBtn = await screen.findByText(/FUEGO/i);
    expect(fuegoBtn).toBeInTheDocument();

    fireEvent.click(fuegoBtn);

    // Debe invocar sonido de comanda lista
    expect(soundEffects.playOrderReadySound).toHaveBeenCalled();

    // Debe enviar update a Supabase con estado 'completado'
    expect(mockUpdate).toHaveBeenCalledWith({ estado: 'completado' });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 'comanda-despacho-1');
  });

  it('debe mostrar mensaje de error si la consulta a Supabase falla', async () => {
    const mockEqNegocio = vi.fn().mockResolvedValue({ data: null, error: { message: 'Network connection failed' } });
    const mockEqEstado = vi.fn().mockReturnValue({ eq: mockEqNegocio });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqEstado });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as never);

    render(<CocinaKDS />);

    await waitFor(() => {
      expect(screen.getByText(/Error cargando comandas: Network connection failed/i)).toBeInTheDocument();
    });
  });
});
