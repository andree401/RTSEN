---
description: Protocolo de ejecucion concurrente y enjambre de subagentes en paralelo
globs: **/*
alwaysApply: true
---

# Protocolo de Enjambre Multi-Agente (Swarm Parallelism)

## Mandato Principal
Cualquier tarea que implique más de un componente, módulo o verificación en `finanzas-web-pro` debe orquestarse utilizando **subagentes paralelos**.

## Mapeo de Subagentes
1. **QA y Pruebas Continuas (`qa-runner`)**: Ejecuta `npm test`, `npx tsc --noEmit` y `npm run build` en background.
2. **PostgreSQL & RLS (`db-guardian`)**: Audita esquemas, políticas multi-tenant e índices.
3. **Cocina KDS (`kds-specialist`)**: Control de audio, estados de comanda y Supabase Realtime.
4. **Punto de Venta POS (`pos-specialist`)**: PIN login, transacciones, mesas y tickets.
5. **Administración & Recetas (`admin-specialist`)**: Gestión de catálogo, stock de inventario y fórmulas.
6. **Finanzas & IA (`finance-specialist`)**: Balances netos, reportes y motor Google Gemini.

## Directrices de Eficiencia
- Siempre despachar los subagentes en una sola llamada concurrente por lotes (`invoke_subagent`).
- No bloquear el hilo principal esperando respuestas de un agente si otros pueden ir avanzando en simultáneo.
- Consolidar los resultados en reportes ejecutivos limpios para el usuario.
