# FASE 5.0: Hacia la Dominación Mundial (Roadmap)

Este documento detalla las próximas grandes mejoras (Features) a implementar en el **Sistema Finanzas Web Pro** para convertirlo en un producto Enterprise de clase mundial (y para justificar cobrar suscripciones caras).

## 1. Gráficos Interactivos e Inteligencia Visual 📊
- **Estado:** ✅ 100% Completado con Recharts y soporte monetario local (Colones ₡).
- **Características Implementadas:**
  - Gráfico circular interactivo (PieChart) de distribución Ingresos vs. Gastos.
  - Gráfico de barras comparativo de los últimos periodos.
  - Línea de tendencia predictiva y balance acumulado histórico con selector interactivo.
  - Formato financiero en Colones (₡) en estadísticas, tablas, gráficos y exportaciones.

## 2. Actualizaciones Reactivas y en Tiempo Real ⚡
- **Objetivo:** Experiencia de usuario (UX) 100% fluida, sin necesidad de recargar la página.
- **Implementación:** Migración a `React Query` o uso de `SWR`.
- **Características:**
  - *Optimistic Updates:* Cuando se elimina o agrega una transacción, la UI se actualiza instantáneamente asumiendo éxito, sincronizando con Supabase de fondo.
  - Sincronización en vivo entre la interfaz de los meseros y la pantalla de cocina (KDS).

## 3. Seguridad Estricta Multi-Tenant (Supabase RLS) 🔒
- **Objetivo:** Evitar que el Restaurante A espíe los números del Restaurante B por error de código o hackeo.
- **Implementación:** Políticas de *Row Level Security* directo en la base de datos de PostgreSQL.
- **Características:**
  - Restricción criptográfica a nivel base de datos para que el API solo devuelva filas donde `negocio_id == auth.uid()`.
  - Auditoría de seguridad sobre todas las tablas operativas.

## 4. Modo Progressive Web App (PWA) 📱
- **Objetivo:** Llevar la aplicación a los bolsillos (y tablets) de los empleados sin pasar por la App Store.
- **Implementación:** Configuración de Service Workers y `manifest.json`.
- **Características:**
  - Icono instalable en Android e iOS (pantalla de inicio).
  - Carga instantánea con caché (funcionalidad offline parcial).
  - Notificaciones push para la cocina cuando entre un pedido urgente.

## 5. Módulo de Suscripciones y Facturación (Stripe Billing) 💳
- **Objetivo:** Generar dinero, el motor del capitalismo.
- **Implementación:** Integración de la API de Stripe para pagos recurrentes.
- **Características:**
  - Planes de suscripción (Mensual / Anual).
  - Bloqueo automático del ERP si el tenant no ha pagado.
  - Portal para que el restaurante administre sus tarjetas y facturas.

## 6. Sistema de Novedades y Soporte Directo 📢
- **Objetivo:** Mantener a los clientes informados de las mejoras y darles un canal directo para quejarse (o agradecer).
- **Implementación:** Modal de *Release Notes* y formulario de contacto.
- **Características:**
  - Al detectar un cambio de versión (ej. de v4.5.1 a v5.0.0), mostrar un *popup* automático con las novedades y cambios de la plataforma.
  - Botón integrado de "Contactar al Desarrollador" que permita a los usuarios enviar un correo directo a `ownnera@gmail.com` con sugerencias o reportes de bugs.

## 7. Blindaje de Sesión y Autenticación en Producción (v4.7.0) 🛡️
- **Estado:** ✅ Completado e implementado en v4.7.0.
- **Detalle:** Timeout de inactividad de 15 minutos con advertencia visual de 2 minutos (contador regresivo interactivo) y sincronización entre pestañas para impedir accesos desatendidos a las finanzas del restaurante.

## 8. Arquitectura de Recetas Multi-Ingrediente y POS en Colones (v4.7.1) 🍲₡
- **Estado:** ✅ Completado e implementado en v4.7.1.
- **Detalle:** Configuración en lote de múltiples insumos para platillos nuevos y existentes; POS de restaurante modernizado con moneda en Colones (₡), incremento/decremento dinámico (+ / -) de cantidades y comanda digital sin papel.

## 9. Rediseño Luminoso, Sistema Sensorial de Audio y Centro de Historial (v4.8.0) 🎨🛎️💰
- **Estado:** ✅ Completado e implementado en v4.8.0.
- **Detalle:**
  - Rediseño integral visual a tema SaaS vivo y luminoso (eliminación de modo oscuro cavernoso forzado).
  - Alertas acústicas sintetizadas con Web Audio API: campana en Cocina KDS y sonido metálico de caja registradora en Punto de Venta.
  - Centro interactivo de historial de versiones en `ReleaseNotes.tsx` y archivo formal `CHANGELOG.md`.

## 10. Aislamiento Estricto de Módulos por Rol y Portal Maestro del Dueño (Superadmin) 🔐👑
- **Objetivo:** Garantizar que los empleados solo tengan acceso a su estación de trabajo correspondiente (Zero Trust operativo) y crear un acceso independiente y exclusivo para el dueño del sistema.
- **Problema Actual:** Actualmente la barra de navegación superior (`ClientHeader.tsx`) muestra enlaces a todas las secciones (Finanzas, Restaurante/Caja, Cocina, Admin, Configuración) a cualquier usuario autenticado. Un cajero puede hacer clic en "Cocina", "Admin" o ver las finanzas del negocio.
- **Implementación y Arquitectura:**
  1. **Aislamiento de Interfaces (Estaciones de Trabajo Autónomas):**
     - **Módulo Cajero / POS (`/restaurante`):** Vista limpia y focalizada. No tiene acceso ni navegación hacia Cocina KDS, ni Inventario/Recetas, ni Finanzas/Admin. Si intenta navegar por URL a `/admin` o `/cocina`, el sistema lo rebota con un mensaje de permisos insuficientes o solicita PIN de supervisor.
     - **Módulo Cocina KDS (`/cocina`):** Pantalla completa tipo kiosco táctil para cocineros/preparadores. Sin enlaces al POS, sin acceso a cobros ni a reportes financieros.
  2. **Portal Maestro / Link Exclusivo para el Dueño del Sistema (Owner/Superadmin):**
     - **Acceso Exclusivo:** Un panel o ruta dedicada (ej. `/master` o `/owner`) protegida por credencial o rol de superadministrador/dueño.
     - **Capacidades del Dueño:**
       - Visión global de todos los módulos: Finanzas completas, Configuración global de suscripciones, Inventario, Recetas, Auditoría de empleados.
       - Control de accesos y asignación de permisos por PIN/usuario para cada estación (Cajeros, Cocineros, Administradores locales).
       - Ocultamiento de la barra global en terminales de cajero y cocina para evitar fugas y distracciones.
