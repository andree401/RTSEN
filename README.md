# 🚀 RTSEN 3.0 (Fase 3) - ERP SaaS Multi-Tenant Nivel Corporativo

Bienvenidos al repositorio oficial de **RTSEN**, la plataforma SaaS de administración restaurantera definitiva, escalable y 100% blindada.

## 🌟 Arquitectura del Proyecto
*   **Frontend:** Next.js (App Router), React, Tailwind CSS.
*   **Backend & Seguridad:** Supabase (PostgreSQL) con **Supabase Auth** y **Triggers Automáticos de Seguridad**.
*   **Inteligencia Artificial:** `@google/genai` (Modelo Gemini-1.5-flash) integrado mediante BYOK (Bring Your Own Key).
*   **Sincronización de Datos:** Supabase Realtime (WebSockets) con latencia <50ms.
*   **Testing Estructural:** 
    *   **Unitario/Lógico:** `Vitest` (Para matemáticas del POS).
    *   **Destructivo/Visual (E2E):** `Playwright` (Aislado en la carpeta `/e2e`).
*   **Despliegue Global:** Netlify.

## 🛠️ Características Actuales (Fase 3 Completada)
El sistema opera de forma autónoma con los siguientes módulos de alto nivel:

1.  **🔐 Seguridad Autónoma (Ghost Auth):** 
    * La creación de negocios (`negocios`) ya no depende de la web, bloqueando ciberataques. Se utiliza un **Disparador de Postgres (Trigger)** en la tabla interna de `auth.users` que construye el negocio de forma simultánea en cuanto un usuario confirma su correo vía SMTP (Resend).
    * Todos los datos del negocio tienen políticas RLS (Row Level Security) impenetrables.
2.  **👨‍💼 Sistema Global de Empleados (Cajeros en la Nube):**
    * La base de datos de cajeros (`empleados`) ha sido migrada a Supabase.
    * Si el dueño cambia de dispositivo, los PINs (5 dígitos) de sus empleados siguen funcionando universalmente.
3.  **🔥 Kitchen Display System (KDS) en Tiempo Real:**
    * Centro de mando (`/cocina`) conectado a WebSockets.
    * Alertas de pérdida de conexión y botones de "Fuego" para marcar órdenes completadas en Base de Datos.
4.  **📦 Sistema Logístico Autónomo (Fase 2 Intelectual):**
    * Panel de control de Inventarios y Recetas (`/admin/inventario`, `/admin/recetas`).
    * **Trigger de Deducción:** Al vender un platillo en el POS, un script de Postgres revisa la receta y descuenta milimétricamente el inventario (ingredientes) sin intervención del Frontend, previniendo cuellos de botella.

## 🗄️ Esquema de Base de Datos (Core)
*   `negocios`: Creado vía *Postgres Trigger* de `auth.users`.
*   `empleados`: `id`, `negocio_id`, `nombre`, `pin`.
*   `menu_items`: `id`, `negocio_id`, `nombre`, `precio`.
*   `finanzas_registros`: `id`, `negocio_id`, `monto`, `tipo` (Ingreso/Gasto), `categoria`, `descripcion` (Incluye cajero).
*   `inventario_items`: `id`, `negocio_id`, `nombre_ingrediente`, `cantidad_disponible`, `unidad_medida`.
*   `recetas`: `id`, `menu_item_id`, `ingrediente_id`, `cantidad_requerida`.
*   `comandas`: `id`, `negocio_id`, `estado`, `total`, `cajero_id`.
*   `comandas_items`: `id`, `comanda_id`, `menu_item_id`, `cantidad`.

## 🗺️ Roadmap Futuro (Siguientes Pasos)
*   [ ] **Dashboard de Ventas Multicaja:** Pantalla maestra para monitorear Múltiples Cajas y Empleados en vivo.
*   [ ] **Monetización Web3/Stripe:** Cobro automatizado mensual a los dueños de restaurantes para poder utilizar la plataforma SaaS.

## 🤖 Directiva Primaria IA
> Al iniciar cualquier sesión, debes leer este documento obligatoriamente. Cualquier cambio arquitectónico, de Base de Datos o de configuración general debe quedar documentado aquí antes de empujar el código a Producción.
