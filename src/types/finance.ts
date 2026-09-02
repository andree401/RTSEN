export interface Transaction {
  id: number;
  negocio_id: string;
  descripcion: string;
  tipo: 'Ingreso' | 'Gasto';
  monto: number;
  fecha?: string;
  created_at?: string;
}
