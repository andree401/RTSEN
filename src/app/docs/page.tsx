import React from 'react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
        <h1 className="text-4xl font-bold mb-6 text-blue-400">Documentación de Uso - Finanzas Web Pro</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">1. Introducción</h2>
          <p className="text-gray-300 leading-relaxed">
            Bienvenido al ERP SaaS <strong>Finanzas Web Pro</strong>. Este sistema te permite gestionar las finanzas, 
            operaciones de cocina y flujos de trabajo de tu restaurante en una sola plataforma multi-tenant.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">2. Módulos Principales</h2>
          <ul className="list-disc pl-6 space-y-3 text-gray-300">
            <li><strong>Dashboard Financiero:</strong> Visualiza ingresos, gastos y el balance en tiempo real. Utiliza el asistente de Inteligencia Artificial (Gemini) para preguntar sobre tus números.</li>
            <li><strong>Exportaciones:</strong> Genera reportes en formato PDF o Excel (.xlsx) filtrando por palabra clave.</li>
            <li><strong>Inventario y Recetas:</strong> (Administrador) Registra tus platillos, ingredientes y existencias.</li>
            <li><strong>Cocina KDS (Kitchen Display System):</strong> Administra los pedidos entrantes y los tiempos de preparación en la cocina.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">3. Asistente de IA (Gemini)</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Para usar el asistente financiero, debes introducir una <strong>API Key válida de Google Gemini</strong> en el campo superior derecho. 
            El asistente analizará automáticamente tus últimas transacciones y el balance para darte respuestas precisas.
          </p>
          <div className="bg-gray-900 p-4 rounded text-sm text-yellow-400 border border-yellow-700">
            Nota: Tu API Key se guarda localmente en tu navegador por seguridad y nunca se envía a nuestros servidores.
          </div>
        </section>
        
        <div className="mt-10">
          <a href="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Volver al Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
