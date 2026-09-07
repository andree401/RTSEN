# 📜 Historial Oficial de Versiones (Changelog) - RTSEN ERP

Registro cronológico estricto y forense basado en los commits, tags y despliegues del repositorio de **RTSEN** (anteriormente *Finanzas Web Pro*).

---

## [5.0.0] - 2026-09-07
### 🚀 Hito Enterprise: PWA, Multi-Tenant RLS & Facturación Stripe
- **Módulo de Facturación Stripe Billing**:
  - Integración de Stripe SDK v22 (`@stripe`) en entorno Next.js 16 con arquitectura desacoplada de planes mensual y anual.
  - Endpoints de servidor (`/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/status`, `/api/stripe/webhook`).
  - Interfaz de autoservicio de facturación [`BillingManager.tsx`](file:///C:/Users/ownne/source/repos/finanzas-web-pro/src/components/BillingManager.tsx) en el Portal del Dueño y Configuración.
  - Guard perimetral de suscripción ([`SubscriptionGuardModal.tsx`](file:///C:/Users/ownne/source/repos/finanzas-web-pro/src/components/SubscriptionGuardModal.tsx)) con botón de renovación de prueba gratuita de 30 días para continuar refinando el sistema sin cobros forzados.
- **Progressive Web App (PWA)**:
  - Soporte para instalación como app de escritorio y móvil (`standalone`).
  - Service Worker con estrategia de caché Network-First y fallback offline.
  - Banner inteligente no intrusivo (`PwaRegister.tsx`) y manifiesto web oficial (`manifest.json`).
- **Seguridad Multi-Tenant Criptográfica (Supabase RLS)**:
  - Políticas de Row Level Security ejecutadas en PostgreSQL aislando datos por `auth.uid()` en todas las tablas sensibles del ERP.
- **Inventario Culinario Bidireccional**:
  - Conversión dual dinámica Masa (kg) ↔ Unidades (piezas) con equivalencias culinarias en tiempo real y almacenamiento unificado.

---

## [4.8.0] - 2026-09-06
### ⚡ Hito de Identidad Visual & Experiencia Sensorial
- **Identidad Oficial RTSEN**: Adopción de la marca formal **RTSEN** en cabecera, metadatos (`layout.tsx`), documentación y notas de versión.
- **Interfaz Viva & Luminosa**: Rediseño integral eliminando el tema oscuro cavernoso (`#0a0a0a`); implementación de fondos nítidos, gradientes de alto impacto y tarjetas métricas con relieve suave.
- **Sistema Sensorial de Audio Autónomo (Web Audio API)**:
  - 🛎️ **Cocina KDS**: Notificación acústica de dos tonos (*Ding-Dong*) al recibir comandas en tiempo real vía WebSockets o polling inteligente, con botón interactivo de prueba.
  - 💰 **Punto de Venta**: Sonido clásico de caja registradora (*"Cha-ching!"*) sintetizado al cobrar comandas de mesas o express.
- **Centro de Historial Real**: Modal interactivo de línea de tiempo con trazabilidad verídica del proyecto.

---

## [4.7.1] - 2026-09-06
### 🍲 Recetas Multi-Insumo & POS en Colones
- **Recetas en Lote**: Selección y vinculación de múltiples ingredientes por platillo en una sola transacción, asociando cantidades y unidades de medida del inventario.
- **Punto de Venta Optimizado**: Soporte para incrementar y decrementar cantidades (+ / -), visualización de precios en Colones costarricenses (₡).
- **Flujo 100% Digital**: Eliminación de impresión física innecesaria de papel; sincronización directa con cocina.
- **Seguridad Contable**: Bloqueo de cobro a comandas vacías para evitar descuadres de caja.

---

## [4.7.0] - 2026-09-06
### 🛡️ Blindaje de Sesión y Autenticación
- **Protección por Inactividad**: Auto-expiración de sesión a los 15 minutos desatendida.
- **Advertencia Visual**: Modal interactivo con temporizador regresivo de 2 minutos y restablecimiento por detección de actividad.
- **Sincronización Multi-Pestaña**: Propagación del estado de expiración y logout a través del storage del navegador.

---

## [4.6.0] - 2026-09-04
### 🤖 Gemini IA & Sincronización Dinámica
- **Asistente Financiero IA**: Integración con Google Gemini API para consultas de balance y gastos en lenguaje natural.
- **Correcciones en Recetas**: Mapeo estricto de la columna `nombre_ingrediente` y protección ante campos nulos.
- **Detección Dinámica de Versión**: Sincronización automática de la versión leída desde `package.json` en las notas de la plataforma.

---

## [4.5.5] - 2026-09-03
### 📢 Release Notes & Parches de Auditoría
- **Modal de Novedades**: Sistema de notificación al usuario tras detectar incremento de versión.
- **Canal de Soporte Directo**: Formulario integrado para envío de correos directos a soporte y desarrollo.
- **Correcciones de Datos**: Ajuste de columnas en cobros de mesa y existencias de inventario.
- **Limpieza de Repositorio**: Eliminación de binarios accidentales y exclusión en `.gitignore`.

---

## [4.5.1] - 2026-09-02
### 🚪 Cierre de Cuenta & Documentación Dinámica
- **Baja de Tenant**: Botón de "Cerrar Cuenta" con eliminación segura en cascada del negocio y usuarios asociados.
- **Documentación Modular Dinámica**: Creación de rutas de ayuda especializadas (`/docs/[modulo]`).
- **Motor IA**: Actualización de la integración al modelo `gemini-3.8-flash`.

---

## [4.0.0] - 2026-09-02
### 📊 Fase 4: Gráficos Interactivos & Reportes
- **Visualización con Recharts**:
  - Gráfico circular de distribución de ingresos vs gastos.
  - Gráfico de barras comparativo de periodos recientes.
  - Línea de balance acumulado y tendencia predictiva proyectada.
- **Exportación Contable**: Generación de reportes directos en formatos Excel (`.xlsx`) y PDF con tablas formateadas.
- **Auditoría de Código**: Corrección rigurosa de tipados TypeScript y supresión de falsos positivos en ESLint.

---

## [3.0.0] - 2026-08-31 - 2026-09-01
### 🔐 Fase 3: Seguridad Auth Triggers & Playwright E2E
- **Disparadores de Base de Datos**: Creación automática de perfiles y vinculación mediante Auth Triggers en PostgreSQL.
- **Gestión de Cajeros**: Acceso y auditoría por PIN único por empleado.
- **Automatización de Pruebas**: Configuración de suite de pruebas End-to-End con Playwright.

---

## [2.5.0] - 2026-08-31
### 🔍 Auditoría QA & Estabilidad
- **Auditoría de Sesión**: Integración nativa del botón de logout con Supabase Auth.
- **Restricción de Integridad**: Corrección de claves foráneas y eliminación de scripts sensibles de migración.

---

## [2.0.0] - 2026-08-31
### ☢️ Fase 2: Cocina KDS en Vivo & Módulos Operativos
- **Command Center Cocina KDS**: Tablero de comandas con sincronización en tiempo real vía WebSockets de Supabase.
- **Efectos Pirotécnicos**: Animación de partículas al despachar órdenes desde cocina.
- **Módulos Operativos**: Introducción de inventario de ingredientes, recetas de platillos y comandas vinculadas a mesas.

---

## [1.0.0] - 2026-08-31
### 🚀 Fase 1: Lanzamiento Inicial ERP SaaS
- **Fundación Multi-Tenant**: Estructura multi-negocio sobre Supabase PostgreSQL.
- **Panel Financiero**: Registro básico de transacciones de ingresos y gastos.
- **Stack Base**: Next.js App Router, Tailwind CSS y TypeScript.
