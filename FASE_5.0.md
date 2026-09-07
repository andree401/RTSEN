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
- **Estado:** ✅ 100% Completado.
- **Objetivo:** Experiencia de usuario (UX) 100% fluida, sin necesidad de recargar la página.
- **Implementación:** Sincronización en vivo con Supabase Realtime (`postgres_changes`) y Optimistic Updates en `src/context/AppContext.tsx`.
- **Características Implementadas:**
  - *Optimistic Updates:* Inserción, actualización y eliminación de platillos (`addDish`, `updateDish`, `deleteDish`) se reflejan de inmediato en la UI con rollback atómico si la red o Supabase fallan.
  - Sincronización en vivo bidireccional entre la interfaz de los meseros/cajeros y la pantalla de cocina (KDS) mediante canales Realtime dedicados con desuscripción y drenado de memoria garantizados.

## 3. Seguridad Estricta Multi-Tenant (Supabase RLS) 🔒
- **Estado:** ✅ 100% Ejecutado y Activo en Base de Datos PostgreSQL.
- **Objetivo:** Evitar que el Restaurante A espíe los números del Restaurante B por error de código o hackeo.
- **Implementación:** Políticas de *Row Level Security* estricto aplicadas directamente en PostgreSQL (`DATABASE_URL`) vía `auth.uid()`.
- **Características:**
  - Restricción criptográfica a nivel base de datos para que el API solo devuelva filas donde `negocio_id == auth.uid()` o `id == auth.uid()`.
  - Aislamiento completo sobre `negocios`, `menu_items`, `empleados`, `finanzas_registros`, `comandas` y `comandas_items`.
  - Script ejecutado: `scripts/migrate-rls-strict.sql`.

## 4. Modo Progressive Web App (PWA) 📱
- **Estado:** ✅ 100% Completado e Implementado.
- **Objetivo:** Llevar la aplicación a los bolsillos (y tablets) de los empleados sin pasar por la App Store.
- **Implementación:** Configuración de Service Workers (`public/sw.js`), `public/manifest.json`, iconos adaptativos y componente `PwaRegister.tsx`.
- **Características:**
  - Icono instalable en Android, iOS y Desktop como aplicación nativa independiente (`standalone`).
  - Estrategia de caché Network-First con fallback offline en Service Worker.
  - Banner inteligente y no intrusivo de instalación (`beforeinstallprompt`) con persistencia en localStorage.


## 5. Módulo de Suscripciones y Facturación (Stripe Billing) 💳
- **Estado:** ✅ 100% Completado y Verificado.
- **Objetivo:** Generar ingresos recurrentes mediante monetización SaaS automatizada.
- **Implementación:** Integración completa de Stripe SDK (`stripe` v22), migraciones PostgreSQL en Supabase y UI en Next.js.
- **Características Implementadas:**
  - **Base de Datos Multi-Tenant:** Columnas añadidas a `public.negocios` (`stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `subscription_plan`, `current_period_end`).
  - **Planes de Suscripción:** Plan Pro Mensual (₡19,900) y Plan Pro Anual (₡199,000 con 2 meses gratis y 17% de ahorro) configurados en `src/lib/stripe.ts`.
  - **Stripe Checkout API (`/api/stripe/checkout`):** Generación de sesiones de pago con asociación automática al tenant autenticado (`negocio_id`).
  - **Stripe Customer Portal API (`/api/stripe/portal`):** Auto-servicio para que el dueño actualice tarjetas, cancele o descargue facturas tributarias.
  - **Webhook Server-Side (`/api/stripe/webhook`):** Procesamiento de eventos `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded` e `invoice.payment_failed`.
  - **Portal de Facturación UI (`src/components/BillingManager.tsx`):** Integrado tanto en el Portal Central del Dueño (`/owner`) como en Configuración (`/configuracion`).
  - **Subscription Guard / Paywall (`src/components/SubscriptionGuardModal.tsx`):** Bloqueo reactivo y automático del ERP si la suscripción está vencida o impaga, eximiendo accesos de login y portal del dueño.
  - **Suite de Pruebas Unitarias:** 8 pruebas automatizadas en `__tests__/stripeBilling.test.ts` (95/95 pruebas del sistema pasando).

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
- **Estado:** ✅ 100% Completado con Middleware Server-Side (`src/middleware.ts`).
- **Objetivo:** Garantizar que los empleados solo tengan acceso a su estación de trabajo correspondiente (Zero Trust operativo) y crear un acceso independiente y exclusivo para el dueño del sistema.
- **Implementación y Arquitectura:**
  1. **Aislamiento Server-Side & Client-Side:**
     - **Middleware en Servidor (`src/middleware.ts`):** Protección perimetral de rutas `/owner` y `/configuracion` interceptando cookies de Supabase (`sb-*-auth-token`) antes de tocar cualquier renderizado en Next.js.
     - **Módulo Cajero / POS (`/restaurante`):** Modo terminal sin enlaces externos en cabecera. Si intenta navegar por URL a `/admin` o `/cocina`, el guard de rol lo bloquea y redirige a su estación.
     - **Módulo Cocina KDS (`/cocina`):** Pantalla completa tipo kiosco táctil para cocineros/preparadores sin acceso a cobros ni a reportes financieros.
  2. **Portal Maestro Exclusivo para el Dueño del Sistema (`/owner`):**
     - Protegido por rol `owner` en Supabase Auth + PIN maestro de doble factor (`DEFAULT_MASTER_PIN`).
     - Visión global de todos los módulos: Finanzas completas, Inventario, Recetas, Control de empleados con revelado seguro de PINs.
     - Ocultamiento de la barra global en terminales de cajero y cocina para evitar fugas y distracciones.
