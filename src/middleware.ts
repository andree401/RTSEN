import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas exentas de middleware: assets estáticos, api endpoints, login y portal secreto
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/sys-ops') ||
    pathname.startsWith('/docs') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rutas exclusivas del Propietario que requieren autenticación formal Supabase
  const isOwnerRoute = pathname.startsWith('/owner') || pathname.startsWith('/configuracion');

  if (isOwnerRoute) {
    // Buscar cookies de sesión emitidas por el cliente de Supabase
    const allCookies = request.cookies.getAll();
    const hasSupabaseAuth = allCookies.some(c => 
      c.name.startsWith('sb-') && c.name.includes('-auth-token')
    );

    if (!hasSupabaseAuth) {
      // Redirigir al login si un usuario no autenticado intenta forzar entrada al portal del dueño
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
