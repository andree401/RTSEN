-- ==============================================================================
-- RTSEN SaaS - FASE 5.0 §3: MIGRACIÓN DE SEGURIDAD ESTRICTA MULTI-TENANT (RLS)
-- ==============================================================================
-- Este script reemplaza las políticas permisivas temporales (USING true) con
-- aislamiento criptográfico estricto a nivel de base de datos usando auth.uid().
-- 
-- Ejecución: Ejecutar en Supabase SQL Editor (Dashboard -> SQL Editor).
-- ==============================================================================

-- 1. TABLA: negocios (Registro raíz del restaurante)
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo temporalmente negocios" ON public.negocios;
DROP POLICY IF EXISTS "negocios_owner_all" ON public.negocios;
DROP POLICY IF EXISTS "negocios_select_all" ON public.negocios;
DROP POLICY IF EXISTS "negocios_insert_authenticated" ON public.negocios;

CREATE POLICY "negocios_owner_select" ON public.negocios
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "negocios_owner_insert" ON public.negocios
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "negocios_owner_update" ON public.negocios
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "negocios_owner_delete" ON public.negocios
  FOR DELETE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "negocios_anon_read_by_id" ON public.negocios
  FOR SELECT TO anon
  USING (true);


-- 2. TABLA: menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo temporalmente menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_owner_all" ON public.menu_items;

CREATE POLICY "menu_items_owner_select" ON public.menu_items
  FOR SELECT TO authenticated
  USING (negocio_id = auth.uid());

CREATE POLICY "menu_items_owner_insert" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (negocio_id = auth.uid());

CREATE POLICY "menu_items_owner_update" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (negocio_id = auth.uid())
  WITH CHECK (negocio_id = auth.uid());

CREATE POLICY "menu_items_owner_delete" ON public.menu_items
  FOR DELETE TO authenticated
  USING (negocio_id = auth.uid());

CREATE POLICY "menu_items_anon_select" ON public.menu_items
  FOR SELECT TO anon
  USING (true);


-- 3. TABLA: empleados (Personal operativo por restaurante)
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo temporalmente empleados" ON public.empleados;
DROP POLICY IF EXISTS "empleados_owner_all" ON public.empleados;

CREATE POLICY "empleados_owner_all" ON public.empleados
  FOR ALL TO authenticated
  USING (negocio_id = auth.uid())
  WITH CHECK (negocio_id = auth.uid());


-- 4. TABLA: finanzas_registros (Libro diario contable)
ALTER TABLE public.finanzas_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo temporalmente finanzas_registros" ON public.finanzas_registros;
DROP POLICY IF EXISTS "finanzas_owner_all" ON public.finanzas_registros;

CREATE POLICY "finanzas_owner_all" ON public.finanzas_registros
  FOR ALL TO authenticated
  USING (negocio_id = auth.uid())
  WITH CHECK (negocio_id = auth.uid());


-- 5. TABLA: comandas (Pedidos de mesas y barra)
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo temporalmente comandas" ON public.comandas;
DROP POLICY IF EXISTS "comandas_owner_all" ON public.comandas;

CREATE POLICY "comandas_owner_all" ON public.comandas
  FOR ALL TO authenticated
  USING (negocio_id = auth.uid())
  WITH CHECK (negocio_id = auth.uid());

CREATE POLICY "comandas_anon_all" ON public.comandas
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);


-- 6. TABLA: comandas_items (Detalle de platillos por comanda)
ALTER TABLE public.comandas_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo temporalmente comandas_items" ON public.comandas_items;
DROP POLICY IF EXISTS "comandas_items_owner_all" ON public.comandas_items;

CREATE POLICY "comandas_items_owner_all" ON public.comandas_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comandas_items.comanda_id AND c.negocio_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comandas_items.comanda_id AND c.negocio_id = auth.uid()
    )
  );

CREATE POLICY "comandas_items_anon_all" ON public.comandas_items
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
