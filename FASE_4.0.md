# FASE 4.0: Hacia la Dominación Mundial (Roadmap)

Este documento detalla las próximas grandes mejoras (Features) a implementar en el **Sistema Finanzas Web Pro** para convertirlo en un producto Enterprise de clase mundial (y para justificar cobrar suscripciones caras).

## 1. Gráficos Interactivos e Inteligencia Visual 📊
- **Objetivo:** Dejar de aburrir a los usuarios con tablas planas.
- **Implementación:** Integrar librerías como `recharts` o `chart.js`.
- **Características:**
  - Gráficos de barras para ingresos vs. gastos mensuales.
  - Gráfico de pastel para categorización de gastos (ej. nómina, insumos, servicios).
  - Líneas de tendencia predictivas basadas en datos históricos.

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
