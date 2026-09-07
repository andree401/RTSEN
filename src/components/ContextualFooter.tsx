'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ContextualFooter() {
  const pathname = usePathname();

  const currentPath = pathname || '';
  let docLink = '/docs';
  if (currentPath.startsWith('/admin')) {
    docLink = '/docs/admin';
  } else if (currentPath.startsWith('/cocina')) {
    docLink = '/docs/cocina';
  } else if (currentPath.startsWith('/restaurante')) {
    docLink = '/docs/restaurante';
  } else if (currentPath.startsWith('/configuracion')) {
    docLink = '/docs/configuracion';
  }

  return (
    <footer className="py-4 text-center text-sm text-gray-500 print:hidden mt-auto border-t border-gray-200">
      <Link href={docLink} className="hover:underline text-blue-600 font-medium">
        Documentación de Uso ({docLink.split('/').pop() || 'general'})
      </Link>
    </footer>
  );
}
