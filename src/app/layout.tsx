import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import ClientHeader from "@/components/ClientHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanzas Web Pro SaaS",
  description: "Plataforma multi-tenant para restaurantes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <AppProvider>
          <ClientHeader />
          <main className="flex-1">
            {children}
          </main>
          <footer className="py-4 text-center text-sm text-gray-500 print:hidden">
            <a href="/docs" className="hover:underline text-blue-600">Documentación de Uso</a>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
