import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { VersionLogger } from "@/components/version-logger";

export const metadata: Metadata = {
  title: "Jhon Jhon Barbearia - Sistema Administrativo",
  description: "Sistema de gestão completo para Jhon Jhon Barbearia",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Jhon Jhon Barbearia - Sistema Administrativo",
    description: "Sistema de gestão completo para Jhon Jhon Barbearia",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <VersionLogger />
          {children}
        </Providers>
      </body>
    </html>
  );
}
