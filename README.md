# 🚀 RTSEN 2.5 (Fase 2) - ERP SaaS Multi-Tenant

Bienvenidos al repositorio oficial de **RTSEN**, la evolución definitiva de un sistema C++ transformado en una plataforma de software SaaS web empresarial. 

## 🌟 Arquitectura del Proyecto
*   **Frontend:** Next.js (App Router), React, Tailwind CSS.
*   **Backend & Seguridad:** Supabase (PostgreSQL) con **Supabase Auth** y Row Level Security (RLS) estricto.
*   **Inteligencia Artificial:** `@google/genai` (Modelo Gemini-1.5-flash) para análisis financiero interactivo continuo.
*   **Sincronización de Datos:** Supabase Realtime (WebSockets) para comunicación instantánea entre terminales.
*   **Testing:** Vitest (Unitario) y Playwright/Scripts E2E (Producción).
*   **Despliegue:** Netlify vía GitHub Actions.

## 🛠️ Características Actuales (Fase 2 Completada)
El sistema ha alcanzado el grado corporativo total con las siguientes funciones:

1.  **🔐 Seguridad Unificada y Aislamiento Multi-Tenant (Dueños):** 
    * Registro e inicio de sesión obligatorio con correo y contraseña en `AppContext`.
    * Todas las operaciones de BD están atadas criptográficamente al `ownerId`.
    * El panel de administración (`/admin`) y el Dashboard financiero comparten el mismo acceso VIP.
2.  **👨‍💼 Sistema de Empleados (Cajeros):**
    * Barrera de acceso en el Punto de Venta (`/restaurante`).
    * Registro de cajeros nuevos con generación de un PIN (ID) de 5 dígitos (Checador digital).
    * Registro contable exacto (quién hizo qué venta).
3.  **🔥 Kitchen Display System (KDS) en Tiempo Real:**
    * Centro de mando para la cocina (`/cocina`) con diseño oscuro y neón (Zona de guerra culinaria).
    * Alertas visuales para órdenes retrasadas y botón interactivo gigante de "¡FUEGO!" con física de partículas CSS.
    * Conectado a **Supabase WebSockets**; las órdenes aparecen al instante sin recargar la página.
    * Al presionar "¡Fuego!", la comanda se marca como 'completada' y desaparece sincronizadamente.
4.  **📦 Módulo Logístico (Inventario y Recetas):**
    * `/admin/inventario`: Control maestro de insumos (Tomate, Carne, etc.). Alertas de escasez (color rojo si el stock es <= 5). Edición de stock al vuelo.
    * `/admin/recetas`: Enlazador inteligente para dictar la anatomía de los platillos del Menú usando ingredientes del inventario.
5.  **🧠 Asistente de Inteligencia Artificial (BYOK):**
    * Chat financiero interactivo continuo en el Dashboard.
    * Modelo de negocio "Bring Your Own Key" (El dueño ingresa su propia API Key de Gemini para evitar costos globales al administrador).
    * Personalidad agresiva y brutalmente honesta enfocada en el crecimiento financiero del restaurante.
6.  **💣 Testing Agresivo (QA):**
    * Cobertura de pruebas unitarias sobre el POS y los componentes usando `Vitest` (6/6 exitosas).
    * Robots de asalto E2E para verificar caídas en el servidor de producción.

## 🗄️ Esquema de Base de Datos (PostgreSQL en Supabase)
Tablas aseguradas bajo políticas RLS restrictivas usando `auth.uid()`:
*   `negocios`: `id` (UUID de Supabase Auth), `nombre`.
*   `menu_items`: `id`, `negocio_id`, `nombre`, `precio`.
*   `finanzas_registros`: `id`, `negocio_id`, `monto`, `tipo` (Ingreso/Gasto), `categoria`, `descripcion` (Incluye nombre del cajero).
*   `inventario_items`: `id`, `negocio_id`, `nombre_ingrediente`, `cantidad_disponible`, `unidad_medida`.
*   `recetas`: `id`, `menu_item_id`, `ingrediente_id`, `cantidad_requerida`.
*   `comandas`: `id`, `negocio_id`, `estado` (pendiente/completada), `total`, `cajero_id`.
*   `comandas_items`: `id`, `comanda_id`, `menu_item_id`, `cantidad`.

## 🗺️ Roadmap Futuro (Fase 3 - Escalabilidad)
*   [ ] **Deducción Automática de Inventario:** Crear un "Trigger" en Postgres que lea la tabla `recetas` y reste el stock en `inventario_items` automáticamente cuando se inserte un `comandas_items`.
*   [ ] **Dashboard de Ventas Multicaja:** Pantalla maestra para monitorear Múltiples Cajas y Empleados en vivo.
*   [ ] **Monetización Web3/Stripe:** Cobro automatizado mensual (Suscripción) a los dueños de restaurantes para poder utilizar la plataforma SaaS.

## 🤖 Notas para el Agente (IA)
> **PRIORIDAD CRÍTICA:** Al iniciar cualquier sesión, lee de inmediato este archivo para cargar la arquitectura en tu contexto. Este documento es la Verdad Absoluta del código. NINGÚN despliegue mayor está completo hasta que este `README.md` refleje las nuevas capacidades.
