import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Tipografia do quiz "Livro dos Sonhos" (auto-hospedada em /public/fonts):
 * - Playfair Display: serifada elegante e forte -> títulos
 * - Archivo: sans-serif muito legível -> perguntas, alternativas e botões
 */
export const metadata: Metadata = {
  title: "Sonhou? E agora? — Quiz Livro dos Sonhos",
  description:
    "Veja o caminho mais prático para consultar o significado, o bicho e os números associados ao que você lembra do seu sonho.",
  openGraph: {
    title: "Sonhou? E agora?",
    description:
      "Veja o caminho mais prático para consultar o significado, o bicho e os números associados ao que você lembra.",
    images: ["/assets/capa-livro-dos-sonhos.jpg"],
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0a08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* fontes críticas para a primeira dobra */}
        <link
          rel="preload"
          href="/fonts/playfairdisplay-normal-800.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/archivo-normal-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/archivo-normal-800.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-[#0b0a08] text-[#f6f0e4]">{children}</body>
    </html>
  );
}
