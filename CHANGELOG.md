# 📜 Historial de Versiones (Changelog) - Finanzas Web Pro SaaS

Todas las novedades y cambios notables del sistema están documentados en este archivo.

---

## [4.8.0] - 2026-09-06
### ✨ Agregado & Mejorado
- **Interfaz Luminosa & Viva**: Rediseño visual completo eliminando fondos oscuros deprimentes. Uso de paleta fresca, gradientes modernos y tarjetas métricas de alta gama.
- **Efectos Acústicos Sintetizados (Web Audio API)**:
  - 🛎️ **Campana en Cocina KDS**: Notificación de dos tonos (*Ding-Dong*) al recibir comandas en tiempo real. Botón interactivo de prueba integrado.
  - 💰 **Sonido de Cobro en Punto de Venta**: Efecto clásico metálico *"Cha-ching!"* sintetizado matemáticamente al procesar pagos de mesas.
- **Centro de Historial de Versiones**: Modal interactivo accesible desde las notas de la versión para consultar la evolución histórica del software.
- **Optimización de Turbopack & Vitest**: Compilación limpia en Next.js 16 con suite de pruebas 100% en verde.

---

## [5.7.0] - 2026-08-15
### ✨ Agregado
- **Recetas Multi-Ingrediente**: Creación y edición masiva de insumos vinculados a platillos del menú.
- **Inventario Centralizado**: Control de existencias por unidad de medida y alerta de mínimos.

---

## [5.0.0] - 2026-07-20
### 🚀 Hito Mayor
- **SaaS Multi-Tenant**: Separación por negocio (`negocio_id`) en base de datos PostgreSQL con Supabase.
- **Command Center Cocina KDS**: Monitoreo de comandas en tiempo real con temporizadores y efecto pirotécnico de despacho.
- **Punto de Venta (POS)**: Registro de pedidos por mesa física y servicio express.

---

## [4.7.1] - 2026-06-10
### 🔒 Seguridad
- Validación estricta para evitar cobros de comandas vacías.
- Confirmación de dos pasos para baja y purga de cuentas.

---

## [4.6.0] - 2026-05-18
### 🤖 Inteligencia Artificial & Analítica
- Integración de Google Gemini API para consultas de balance en lenguaje natural.
- Gráficos Recharts interactivos con flujo de ingresos/gastos y proyección histórica de balance.

---

## [4.5.0] - 2026-04-05
### 📊 Reportes & Finanzas
- Formato contable localizado en Colones costarricenses (₡).
- Exportación directa a planillas Excel (`.xlsx`) y documentos PDF.
- Protección por inactividad de sesión (15 min).

---

## [1.0.0 - 4.0.0] - 2025 - 2026
### 🌱 Fundación
- Registro mono-usuario básico de ingresos y gastos.
- Base de datos relacional y configuración inicial.
