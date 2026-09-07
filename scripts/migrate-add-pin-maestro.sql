-- Migración: Agregar columna pin_maestro a la tabla negocios
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- IMPORTANTE: Ejecutar ANTES de desplegar la v5.1.0

ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS pin_maestro text;

COMMENT ON COLUMN public.negocios.pin_maestro IS
  'PIN maestro del propietario para desbloquear el Portal Central. NULL = usar 0000 como default inicial.';
