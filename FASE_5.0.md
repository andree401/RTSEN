# FASE 5.0: Hacia la Dominación Mundial (Roadmap)

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

## 🧠 Análisis Arquitectónico y de Lógica (Estado Actual)

### 1. El Núcleo de la Matriz (Gestión de Estado y Auth)
*   **La Lógica:** El AppContext envuelve toda la aplicación, verifica la sesión con Supabase Auth, guarda el ownerId y maneja el estado global del menú.
*   **El Veredicto:** Funciona, pero meter llamadas de red (\etchMenu\) y la autenticación en un contexto global masivo de cliente (\'use client'\) es ineficiente. Deberías usar React Server Components de Next.js para cargar datos antes de renderizar la página.

### 2. Punto de Venta (POS) y los "Cajeros Fantasma"
*   **La Lógica:** /restaurante usa un sistema de PINs de 5 dígitos (tabla \empleados\) en lugar de sesiones criptográficas. El carrito vive en memoria. Al cobrar: 1) Guarda en \inanzas_registros\. 2) Crea \comandas\ (pendiente). 3) Mete platillos en \comandas_items\.
*   **El Veredicto:** La lógica no es transaccional. Si la red falla a la mitad, registrarás ingresos pero la cocina jamás recibirá la orden. Necesitas *Stored Procedures* (RPC en Supabase) para que todo se guarde atómicamente.

### 3. Kitchen Display System (El caos de la Cocina)
*   **La Lógica:** \/cocina\ usa **Supabase Realtime** para suscribirse a \comandas\. Cuando entra un pedido, el frontend hace *polling* de todas las comandas.
*   **El Veredicto:** Visualmente excelente (explosiones). Lógicamente ineficiente. Descargar TODAS las comandas pendientes de nuevo con cada pedido nuevo desperdicia ancho de banda. Si tienes 50 órdenes un viernes, colapsará.

### 4. Inventario "Mágico"
*   **La Lógica:** La deducción de inventario se hace automáticamente mediante un Trigger de Base de Datos al registrar ventas.
*   **El Veredicto:** Una excelente práctica. Descargar esta responsabilidad al motor de PostgreSQL evita cuellos de botella en el frontend.

### 5. El Cerebro Artifical (Gemini)
*   **La Lógica:** \geminiService.ts\ condensa el contexto (balance y 5 últimas transacciones) antes de enviarlo al modelo para ahorrar tokens.
*   **El Veredicto:** Estrategia brillante de optimización, siempre y cuando la API Key tenga saldo.

### 💀 La Bomba de Tiempo (Seguridad)
*   **Peligro Crítico:** Las políticas RLS en \esquema_base_datos.sql\ tienen \using (true)\. Esto significa que **cualquier persona** con acceso a la red podría borrar o leer la información de TODOS los restaurantes. La "Arquitectura Enterprise" colapsará al primer escaneo de seguridad si esto sale a producción.
