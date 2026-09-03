import React from 'react';
import Link from 'next/link';

interface Props {
  params: { modulo: string };
}

export default function ModuloDocPage({ params }: Props) {
  const { modulo } = params;

  // Contenido de la documentación según el módulo
  const contentMap: Record<string, { title: string, content: string }> = {
    admin: {
      title: 'Administración e Inventario',
      content: 'Aquí puedes gestionar tu inventario, crear recetas para descontar insumos automáticamente y administrar a tu personal.'
    },
    cocina: {
      title: 'Kitchen Display System (KDS)',
      content: 'Este módulo permite a los chefs visualizar las comandas activas, marcar platillos como preparados y limpiar las órdenes despachadas.'
    },
    restaurante: {
      title: 'Operación de Meseros / POS',
      content: 'Los meseros utilizan este módulo para ingresar con su PIN, tomar órdenes de los clientes y enviarlas a la cocina en tiempo real.'
    },
    configuracion: {
      title: 'Configuración Avanzada',
      content: 'Ajustes del perfil, incluyendo la opción para cerrar tu cuenta permanentemente (con doble confirmación).'
    }
  };

  const doc = contentMap[modulo] || {
    title: 'Módulo Desconocido',
    content: 'No hay documentación detallada para este módulo.'
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
        <h1 className="text-4xl font-bold mb-6 text-blue-400">
          Documentación: {doc.title}
        </h1>
        
        <p className="text-gray-300 leading-relaxed text-lg mb-8">
          {doc.content}
        </p>

        <div className="flex gap-4 mt-10">
          <Link href="/docs" className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Ver Documentación General
          </Link>
          <Link href={`/${modulo === 'configuracion' ? modulo : modulo === 'admin' ? 'admin/inventario' : modulo}`} className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Ir al Módulo
          </Link>
        </div>
      </div>
    </div>
  );
}
