# 🚀 RTSEN 2.0 - ERP SaaS Multi-Tenant

Bienvenidos al repositorio oficial de **RTSEN**, la evolución definitiva de un sistema C++ transformado en una plataforma de software SaaS web empresarial. 

## 🌟 Arquitectura del Proyecto
*   **Frontend:** Next.js (App Router), React, Tailwind CSS.
*   **Backend & Seguridad:** Supabase (PostgreSQL) con **Supabase Auth** y Row Level Security (RLS).
*   **Inteligencia Artificial:** `@google/genai` (Modelo Gemini-1.5-flash) para análisis financiero y chat.
*   **Testing:** Vitest (Unitario) y Playwright/Scripts E2E (Producción).
*   **Despliegue:** Netlify vía GitHub Actions.

## 🛠️ Características Actuales (Versión 2.0 Completada)
El sistema ha alcanzado el grado corporativo con las siguientes funciones:

1.  **🔐 Seguridad Unificada y Aislamiento Multi-Tenant (Dueños):** 
    * Registro e inicio de sesión obligatorio con correo y contraseña.
    * Todas las operaciones de BD están atadas criptográficamente al `ownerId`.
    * El panel de administración (`/admin`) y el Dashboard financiero comparten el mismo acceso VIP.
2.  **👨‍💼 Sistema de Empleados (Cajeros):**
    * Barrera de acceso en el Punto de Venta (`/restaurante`).
    * Registro de cajeros nuevos con generación de un PIN (ID) de 5 dígitos (Checador).
    * Registro contable exacto (quién hizo qué venta).
3.  **🔥 Kitchen Display System (KDS):**
    * Centro de mando para la cocina (`/cocina`) con diseño oscuro y neón (Zona de guerra culinaria).
    * Alertas visuales para órdenes retrasadas y botón interactivo gigante de "¡FUEGO!" con física de partículas CSS.
4.  **🧠 Asistente de Inteligencia Artificial (BYOK):**
    * Chat financiero interactivo continuo en el Dashboard.
    * Modelo de negocio "Bring Your Own Key" (El dueño ingresa su propia API Key de Gemini para evitar costos globales al administrador).
    * Personalidad agresiva enfocada en el crecimiento financiero.
5.  **💣 Testing Agresivo (QA):**
    * Cobertura de pruebas unitarias sobre el POS y los componentes usando `Vitest`.

## 🗄️ Esquema de Base de Datos
*   `negocios`: `id` (UUID de Supabase Auth), `nombre`.
*   `menu_items`: `id`, `negocio_id`, `nombre`, `precio`.
*   `finanzas_registros`: `id`, `negocio_id`, `monto`, `tipo` (Ingreso/Gasto), `categoria`, `descripcion` (Incluye nombre del cajero).

## 🗺️ Roadmap Futuro (Fase 2)
*   [ ] **Ejecutar `esquema_fase2.sql`:** Implementar las tablas de `inventario_items` y `recetas` en la nube.
*   [ ] **Control de Mermas:** Deducción automática de gramos y piezas de inventario con cada botón de ¡Fuego! presionado en la cocina.
*   [ ] **Monetización Web3/Stripe:** Cobro automatizado mensual a los restaurantes afiliados a la plataforma SaaS.

## 🤖 Notas para el Agente (IA)
> **ATENCIÓN IA:** Al iniciar cualquier sesión, revisa este archivo y los scripts de tests para entender el nivel de complejidad actual (V2.0). Cualquier módulo nuevo DEBE tener soporte para el sistema de Cajeros y respetar las políticas de aislamiento de Supabase Auth.
