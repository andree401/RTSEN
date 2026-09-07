<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Directivas de Arquitectura y Enjambre Multi-Agente (Swarm Directives)

## 🚀 Prioridad Suprema: Paralelismo y Alta Velocidad con Subagentes
Para maximizar el rendimiento, minimizar la latencia de entrega y evitar cuellos de botella secuenciales:
1. **Ejecución Concurrente por Defecto:** Cualquier tarea de análisis, auditoría, refactorización o verificación que involucre más de un módulo debe fragmentarse y despacharse inmediatamente a un enjambre de subagentes en paralelo (`invoke_subagent`).
2. **Especialización por Módulos:**
   - **`kds-specialist`**: Pantalla de cocina KDS, sincronización Supabase Realtime, audio Web Audio FX, despacho de comandas.
   - **`pos-specialist`**: Punto de venta POS, autenticación PIN de cajeros, cálculo de tickets/mesas y flujo de pedidos.
   - **`admin-specialist`**: Gestión de platillos, control de inventario de ingredientes y composición de recetas.
   - **`finance-specialist`**: Balances netos, gráficos Recharts, exportaciones a Excel/PDF y Google Gemini IA.
   - **`db-guardian`**: Esquema PostgreSQL, integridad referencial, políticas RLS multi-tenant e índices de rendimiento.
   - **`qa-runner`**: Ejecución de Vitest (`npm test`), verificación de tipos (`npx tsc`), ESLint y builds de Turbopack.
3. **Autonomía Operativa:** Ejecutar herramientas, comandos y pruebas proactivamente sin interrupciones lineales innecesarias.

