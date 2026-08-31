const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Hocxoq-7gunji-moxgop@db.bbjjmcuiwlebqljmwbms.supabase.co:5432/postgres' });

const sql = `
-- Drop insecure policies from Phase 1
DROP POLICY IF EXISTS "Permitir todo temporalmente negocios" ON negocios;
DROP POLICY IF EXISTS "Permitir todo temporalmente menu" ON menu_items;
DROP POLICY IF EXISTS "Permitir todo temporalmente finanzas" ON finanzas_registros;

-- Secure Phase 1 tables
CREATE POLICY "Auth owner negocios" ON negocios FOR ALL USING (id = auth.uid());
CREATE POLICY "Auth owner menu" ON menu_items FOR ALL USING (negocio_id = auth.uid());
CREATE POLICY "Auth owner finanzas" ON finanzas_registros FOR ALL USING (negocio_id = auth.uid());

-- Tabla de inventario
CREATE TABLE IF NOT EXISTS inventario_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
    nombre_ingrediente VARCHAR(255) NOT NULL,
    cantidad_disponible DECIMAL(10,2) NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(50) NOT NULL
);

-- Tabla de recetas (relación entre menú e ingredientes)
CREATE TABLE IF NOT EXISTS recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    ingrediente_id UUID REFERENCES inventario_items(id) ON DELETE CASCADE NOT NULL,
    cantidad_requerida DECIMAL(10,2) NOT NULL
);

-- Tabla de comandas (órdenes)
CREATE TABLE IF NOT EXISTS comandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    cajero_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de detalles de la comanda
CREATE TABLE IF NOT EXISTS comandas_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comanda_id UUID REFERENCES comandas(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas_items ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para garantizar el aislamiento por negocio (Auth)
CREATE POLICY "Aislamiento inventario" ON inventario_items FOR ALL USING (negocio_id = auth.uid());
CREATE POLICY "Aislamiento recetas" ON recetas FOR ALL USING (menu_item_id IN (SELECT id FROM menu_items WHERE negocio_id = auth.uid()));
CREATE POLICY "Aislamiento comandas" ON comandas FOR ALL USING (negocio_id = auth.uid());
CREATE POLICY "Aislamiento items de comandas" ON comandas_items FOR ALL USING (comanda_id IN (SELECT id FROM comandas WHERE negocio_id = auth.uid()));
`;

client.connect()
    .then(() => client.query(sql))
    .then(() => {
        console.log('✅ EXITO: Fase 2 migrada en Supabase. RLS Blindado y Tablas de Inventario listas.');
        process.exit(0);
    }).catch(err => {
        console.error('❌ ERROR:', err);
        process.exit(1);
    });
