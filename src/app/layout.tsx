import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "ContainerGT — Tabla de Cargas",
  description: "Tabla de cargas para contenedores en Guatemala y LATAM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/tabler-icons.min.css"
        />
      </head>
      <body className={`${dmSans.variable} font-sans antialiased bg-bg`}>
        {children}
      </body>
    </html>
  );
}
