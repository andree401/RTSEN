'use client';

import { useState, useEffect } from 'react';
import pkg from '../../package.json';

const CURRENT_VERSION = pkg.version;

type VersionRecord = {
  version: string;
  tag: string;
  title: string;
  date: string;
  badgeColor: string;
  highlights: string[];
};

const VERSION_HISTORY: VersionRecord[] = [
  {
    version: 'v4.8.0',
    tag: 'Actual',
    title: 'Identidad RTSEN, UI Luminosa & Audio Sensorial',
    date: '06 Sep 2026',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    highlights: [
      '⚡ Adopción de la marca oficial RTSEN en toda la plataforma, barra de navegación y metadatos.',
      '🎨 Rediseño visual luminoso: Despedida al tema oscuro cavernoso; fondos frescos, gradientes vivos y tarjetas métricas de alta gama.',
      '🛎️ Campana acústica en Cocina KDS: Notificación sintetizada de dos tonos con Web Audio API al entrar comandas en vivo, con botón interactivo de prueba.',
      '💰 Efecto de Cobro "Cha-ching": Sonido clásico metálico de caja registradora en el Punto de Venta al confirmar pagos.',
      '📜 Centro de Historial Real: Documentación cronológica forense basada en el historial del repositorio.',
    ],
  },
  {
    version: 'v4.7.1',
    tag: 'Estable',
    title: 'Recetas Multi-Ingrediente & POS en Colones (₡)',
    date: '06 Sep 2026',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    highlights: [
      '🍲 Asociación dinámica de múltiples ingredientes por platillo en lotes masivos con control de unidades.',
      '🌮 Punto de Venta modernizado con botones (+/-) para cantidades y precios en moneda local (₡ Colones).',
      '🌱 Comanda 100% digital sin papel, enviada instantáneamente a cocina.',
      '🔒 Bloqueo de cobros a comandas vacías para evitar inconsistencias contables.',
    ],
  },
  {
    version: 'v4.7.0',
    tag: 'Seguridad',
    title: 'Blindaje de Sesión y Protección por Inactividad',
    date: '06 Sep 2026',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-300',
    highlights: [
      '🛡️ Expiración automática de sesión tras 15 minutos desatendida para salvaguardar datos financieros.',
      '⏱️ Modal con contador regresivo de advertencia (2 minutos) con restablecimiento por actividad.',
      '🔄 Sincronización multi-pestaña del estado de autenticación.',
    ],
  },
  {
    version: 'v4.6.0',
    tag: 'IA & Fixes',
    title: 'Asistente Financiero Gemini IA & Estabilización',
    date: '04 Sep 2026',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-300',
    highlights: [
      '🤖 Chatbot financiero impulsado por Google Gemini para consultas en lenguaje natural.',
      '🔧 Corrección de columna nombre_ingrediente y protección contra valores nulos en recetas.',
      '🏷️ Detección dinámica y sincronización automática de versión en pantalla.',
    ],
  },
  {
    version: 'v4.5.5',
    tag: 'Soporte',
    title: 'Centro de Novedades & Parches de Auditoría',
    date: '03 Sep 2026',
    badgeColor: 'bg-pink-100 text-pink-700 border-pink-300',
    highlights: [
      '📢 Modal interactivo de Release Notes con canal de soporte directo por correo.',
      '📦 Parches en columnas operativas de cobro de mesas e insumos de inventario.',
      '🧹 Depuración de binarios accidentales y optimización del repositorio.',
    ],
  },
  {
    version: 'v4.5.1',
    tag: 'Módulos',
    title: 'Cierre de Cuenta & Documentación Modular Dinámica',
    date: '02 Sep 2026',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-300',
    highlights: [
      '🚪 Botón de dar de baja la cuenta con eliminación en cascada de datos del tenant.',
      '📚 Rutas dinámicas de documentación para cada módulo (/docs/[modulo]).',
      '⚡ Actualización de integración con el modelo Gemini 3.8-Flash.',
    ],
  },
  {
    version: 'v4.0.0',
    tag: 'Fase 4',
    title: 'Analítica Visual Recharts & Exportación de Reportes',
    date: '02 Sep 2026',
    badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    highlights: [
      '📊 Gráficas interactivas Recharts: distribución circular de ingresos vs gastos, flujo por periodos y tendencia predictiva.',
      '📄 Exportación contable directa a hojas de cálculo Excel (.xlsx) y documentos PDF.',
      '✨ Corrección profunda de tipados TypeScript y reglas de ESLint.',
    ],
  },
  {
    version: 'v3.0.0',
    tag: 'Fase 3',
    title: 'Seguridad Auth Triggers, Cajeros & Pruebas E2E',
    date: '31 Ago - 01 Sep 2026',
    badgeColor: 'bg-violet-100 text-violet-700 border-violet-300',
    highlights: [
      '🔐 Triggers automáticos en base de datos PostgreSQL para vinculación de usuarios.',
      '👥 Gestión de empleados y cajeros con autenticación mediante PIN seguro.',
      '🧪 Suite de pruebas End-to-End automatizadas con Playwright.',
    ],
  },
  {
    version: 'v2.5.0',
    tag: 'Auditoría',
    title: 'Parches de Estabilidad, QA y Consolidación Auth',
    date: '31 Ago 2026',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-300',
    highlights: [
      '🔍 Auditoría QA completa de flujos de autenticación.',
      '🚪 Botón de logout totalmente integrado con Supabase Auth.',
      '🛡️ Refuerzo de esquema relacional y corrección de claves foráneas.',
    ],
  },
  {
    version: 'v2.0.0',
    tag: 'Fase 2',
    title: 'Command Center Cocina KDS en Tiempo Real',
    date: '31 Ago 2026',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-300',
    highlights: [
      '☢️ Pantalla KDS para cocina sincronizada en tiempo real mediante WebSockets de Supabase.',
      '🔥 Efectos visuales de despacho con animación de partículas pirotécnicas.',
      '📦 Módulos iniciales de control de inventario, recetas y comandas.',
    ],
  },
  {
    version: 'v1.0.0',
    tag: 'Fase 1',
    title: 'Génesis: Lanzamiento Inicial del ERP SaaS',
    date: '31 Ago 2026',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    highlights: [
      '🚀 Arquitectura base multi-tenant para negocios gastronómicos.',
      '💰 Registro contable de transacciones de ingresos y gastos.',
      '🌐 Estructura inicial con Next.js App Router, Tailwind CSS y Supabase.',
    ],
  },
];

export default function ReleaseNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'novedades' | 'historial' | 'soporte'>('novedades');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('last_seen_version');
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('last_seen_version', CURRENT_VERSION);
    setIsOpen(false);
    setActiveTab('novedades');
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:ownnera@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-6 md:p-8 animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Encabezado Principal */}
        <div className="relative p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-pink-50/40 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-200/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              ¡Actualización v{CURRENT_VERSION}!
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
              RTSEN ERP
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Descubre las nuevas características, efectos y la evolución histórica de tu sistema.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all font-bold text-lg cursor-pointer"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Barra de Pestañas */}
        <div className="px-6 pt-3 bg-slate-50/60 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab('novedades')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 ${
              activeTab === 'novedades'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ✨ Novedades v{CURRENT_VERSION}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'historial'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📜 Historial de Versiones
            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {VERSION_HISTORY.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('soporte')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 ${
              activeTab === 'soporte'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💬 Soporte & Contacto
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-white">
          {activeTab === 'novedades' && (
            <>
              {/* Tarjetas de Novedades v5.8 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Feature 1: Rediseño Luminoso */}
                <div className="bg-slate-50/70 border border-indigo-100 hover:border-indigo-300 rounded-2xl p-5 transition-all flex flex-col justify-between hover:shadow-md group">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-white text-2xl shadow-md shadow-orange-500/20 mb-3 group-hover:scale-105 transition-transform">
                      🎨
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-2">
                      Interfaz Viva & Luminosa
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Adiós al modo oscuro opaco. Ahora disfrutas de una estética SaaS limpia, luminosa y moderna con métricas de alto contraste.
                    </p>
                  </div>
                  <span className="mt-4 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md self-start border border-indigo-100">
                    Diseño & UI
                  </span>
                </div>

                {/* Feature 2: Audio en Cocina */}
                <div className="bg-slate-50/70 border border-orange-100 hover:border-orange-300 rounded-2xl p-5 transition-all flex flex-col justify-between hover:shadow-md group">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl shadow-md shadow-orange-500/20 mb-3 group-hover:scale-105 transition-transform">
                      🛎️
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-2">
                      Campana de Cocina KDS
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Alerta sonora acústica automática al registrarse pedidos nuevos, para que los cocineros nunca pasen una orden por alto.
                    </p>
                  </div>
                  <span className="mt-4 text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md self-start border border-orange-100">
                    Audio en Cocina
                  </span>
                </div>

                {/* Feature 3: Sonido de Cobro en Caja */}
                <div className="bg-slate-50/70 border border-emerald-100 hover:border-emerald-300 rounded-2xl p-5 transition-all flex flex-col justify-between hover:shadow-md group">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-2xl shadow-md shadow-emerald-500/20 mb-3 group-hover:scale-105 transition-transform">
                      💰
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-2">
                      Cobro con Efecto de Caja
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Efecto &ldquo;Cha-ching!&rdquo; metálico sintetizado al procesar el pago de mesas y órdenes express en el Punto de Venta.
                    </p>
                  </div>
                  <span className="mt-4 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md self-start border border-emerald-100">
                    Punto de Venta
                  </span>
                </div>

              </div>

              {/* Banner Informativo */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3.5 text-xs text-slate-700">
                <span className="text-2xl">⚡</span>
                <div>
                  <strong className="text-slate-900 block font-bold">100% Autónomo con Web Audio API:</strong>
                  Los sonidos se generan matemáticamente en tu navegador sin depender de archivos de audio externos que puedan fallar sin conexión.
                </div>
              </div>
            </>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">Evolución del Proyecto</h2>
                <p className="text-xs text-slate-500">Historial cronológico de cambios, hitos y versiones de RTSEN.</p>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-200 space-y-8 my-4">
                {VERSION_HISTORY.map((item, idx) => (
                  <div key={idx} className="relative group">
                    {/* Punto indicador de la línea de tiempo */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 group-hover:scale-125 transition-transform" />
                    
                    <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 transition-all hover:shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900">{item.version}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                            {item.tag}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">{item.date}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 mb-2">{item.title}</h4>

                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {item.highlights.map((h, hIdx) => (
                          <li key={hIdx} className="leading-relaxed flex items-start gap-2">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'soporte' && (
            <div className="max-w-xl mx-auto py-2">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Contactar Soporte & Feedback
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                ¿Tienes alguna duda o quieres sugerir una nueva función para las próximas versiones?
              </p>
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Asunto
                  </label>
                  <input
                    id="subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Ej. Sugerencia para la cocina KDS..."
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Mensaje o Reporte
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Describe en detalle tu consulta o sugerencia..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('novedades')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition-all text-xs"
                  >
                    Volver a Novedades
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/20 text-xs"
                  >
                    Enviar Correo Directo
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => setActiveTab(activeTab === 'historial' ? 'novedades' : 'historial')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors order-2 sm:order-1 cursor-pointer"
          >
            {activeTab === 'historial' ? '← Ver Novedades de la versión' : '📜 Ver Historial Completo de Versiones'}
          </button>

          <button
            onClick={handleClose}
            autoFocus
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 active:scale-95 text-white font-bold py-2.5 px-7 rounded-xl transition-all shadow-md shadow-indigo-600/25 text-sm order-1 sm:order-2 cursor-pointer"
          >
            ¡Entendido, a trabajar! 🚀
          </button>
        </div>

      </div>
    </div>
  );
}
