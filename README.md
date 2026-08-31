# 🚀 RTSEN - ERP SaaS Multi-Tenant

Bienvenidos al repositorio oficial de **RTSEN**, la evolución definitiva de un antiguo sistema de finanzas de consola C++ transformado en una plataforma Software as a Service (SaaS) web mundial.

## 🌟 Arquitectura del Proyecto
*   **Frontend:** Next.js (App Router), React, Tailwind CSS.
*   **Backend & Base de Datos:** Supabase (PostgreSQL) con Supabase-js.
*   **Despliegue:** Netlify / Vercel vía GitHub Actions (CI/CD continuo).

## 🛠️ Estado Actual (Fase 1 Completada)
El sistema ha migrado con éxito a la nube. Sus características principales actuales son:
1.  **Multi-Tenant (SaaS):** Capacidad de soportar múltiples negocios o restaurantes. Cada dueño tiene su propio `negocio_id` generado por UUID.
2.  **Panel de Administración Privado:** Una ruta `/admin` protegida para agregar, editar y eliminar platillos del menú, que impacta la base de datos en tiempo real.
3.  **Punto de Venta (POS):** Ruta `/restaurante` donde los cajeros pueden tomar pedidos exprés, cobrar mesas e imprimir comandas.
4.  **Dashboard Financiero:** Análisis de ingresos/gastos, reportes y un chat inteligente asistido por IA (Gemini).

## 🗄️ Esquema de Base de Datos (Supabase)
El sistema depende de 3 tablas clave en PostgreSQL:
*   `negocios`: Almacena el `id` (UUID), `nombre`, y `owner_email`.
*   `menu_items`: Almacena platillos con `nombre`, `precio` y está enlazado a `negocio_id`.
*   `finanzas_registros`: Registra ventas y gastos con `monto`, `tipo` (Ingreso/Gasto), `categoria` y `descripcion`.

## 🗺️ Roadmap Futuro (Lo que sigue)
*   [ ] **Fase 2:** Implementar "Pantalla de Cocina (KDS)" y sistema de inventario (deducción automática de insumos por receta).
*   [ ] **Fase 3:** Sistema avanzado de Supabase Auth (Logins con correo/contraseña) y permisos por empleado (Roles de Cajero vs Administrador).
*   [ ] **Fase 4:** Suscripciones con Stripe para monetizar el acceso a otros restaurantes.

## 🤖 Notas para el Agente (IA)
> **ATENCIÓN IA:** Al iniciar cualquier nueva conversación en este proyecto, DEBES leer este `README.md` y el esquema SQL guardado para recuperar inmediatamente el contexto de arquitectura. Todo desarrollo nuevo debe priorizar el aislamiento de datos (Multi-Tenant) y sincronización con Supabase.
