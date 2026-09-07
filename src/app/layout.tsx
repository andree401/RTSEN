import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import ClientHeader from "@/components/ClientHeader";
import ContextualFooter from "@/components/ContextualFooter";
import ReleaseNotes from "@/components/ReleaseNotes";
import PwaRegister from "@/components/PwaRegister";
import SubscriptionGuardModal from "@/components/SubscriptionGuardModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "RTSEN - ERP para Restaurantes",
  description: "Plataforma de gestión financiera y operativa para restaurantes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RTSEN ERP",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192x192.svg",
  },
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
          <ContextualFooter />
          <ReleaseNotes />
          <PwaRegister />
          <SubscriptionGuardModal />
        </AppProvider>
      </body>
    </html>
  );
}
