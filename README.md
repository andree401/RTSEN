# 🚀 RTSEN - ERP SaaS Multi-Tenant Nivel Corporativo (Versión 4.5.5)

Bienvenidos al repositorio oficial de **RTSEN**, una plataforma SaaS de administración restaurantera escalable, robusta y diseñada para la nube. Este sistema incluye puntos de venta (POS), gestión de empleados, inventario automatizado y un Kitchen Display System (KDS) en tiempo real.

## 📖 1. Descripción del Proyecto

RTSEN es un sistema integral (ERP) que permite a los dueños de restaurantes gestionar sus operaciones de manera eficiente y centralizada. Cuenta con las siguientes características principales:
- **Seguridad Autónoma:** Gestión de tenants y negocios integrada directamente en la base de datos para máxima seguridad.
- **Sistema Global de Empleados:** Administración de cajeros y accesos mediante PINs universales.
- **Kitchen Display System (KDS):** Sincronización de comandas en tiempo real con la cocina mediante WebSockets.
- **Logística Autónoma:** Deducción de inventario automatizada (vía Triggers de BD) al registrar ventas, evitando cuellos de botella en el frontend.

## 💻 2. Stack Tecnológico

El proyecto está construido con las siguientes tecnologías modernas para garantizar alto rendimiento, mantenibilidad y escalabilidad:

- **Next.js:** Framework de React (App Router) para la interfaz de usuario, SSR y ruteo.
- **Tailwind CSS:** Framework de CSS basado en utilidades para un diseño responsivo y moderno.
- **Supabase (PostgreSQL):** Base de datos relacional, sistema de autenticación (Supabase Auth) y WebSockets (Supabase Realtime).
- **Gemini (Google GenAI):** Integración de inteligencia artificial para funcionalidades analíticas avanzadas.
- **Vitest:** Entorno de pruebas súper rápido para la lógica de negocio y tests unitarios.
- **Playwright:** Framework para pruebas End-to-End (E2E), asegurando el funcionamiento correcto de los flujos críticos en el navegador.

## ⚙️ 3. Instalación y Variables de Entorno

Sigue estos pasos para levantar el entorno de desarrollo local:

1. **Clonar el repositorio y acceder a la carpeta:**
   ```bash
   git clone <url-del-repositorio>
   cd finanzas-web-pro
   ```

2. **Instalar las dependencias de Node.js:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**
   Crea un archivo llamado `.env.local` en la raíz del proyecto y agrega las siguientes variables.

   ```env
   # Credenciales de acceso a Supabase (Obligatorias)
   NEXT_PUBLIC_SUPABASE_URL=https://<TU_PROYECTO>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU_ANON_KEY>
   
   # Clave de API de Gemini - Requerida para interactuar con los módulos de IA
   GEMINI_API_KEY=<TU_GEMINI_API_KEY>
   ```

## 🧪 4. Comandos para Pruebas y Build

El proyecto incluye varios scripts (configurados en `package.json`) para el desarrollo, las pruebas y el paso a producción:

- **Servidor de Desarrollo:**
  Inicia la aplicación con Hot-Reloading en http://localhost:3000.
  ```bash
  npm run dev
  ```

- **Construcción para Producción (Build):**
  Genera la versión estática y optimizada de la aplicación.
  ```bash
  npm run build
  ```

- **Iniciar en Producción:**
  Levanta el servidor utilizando los archivos optimizados previamente construidos.
  ```bash
  npm run start
  ```

- **Pruebas Unitarias (Vitest):**
  Ejecuta la suite de pruebas lógicas y matemáticas del POS.
  ```bash
  npm run test
  ```

- **Pruebas E2E (Playwright):**
  Ejecuta las pruebas visuales y los flujos destructivos directamente sobre navegadores reales.
  ```bash
  npx playwright test
  ```

- **Análisis de Código (Lint):**
  Verifica el estilo y las reglas de código con ESLint.
  ```bash
  npm run lint
  ```


