import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Tipografia do quiz "Livro dos Sonhos" (auto-hospedada em /public/fonts):
 * Plus Jakarta Sans variável (200–800) — elegante e de leitura fácil
 * para público adulto no celular (títulos, perguntas, alternativas e botões).
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
  themeColor: "#f6f0e4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* fonte crítica para a primeira dobra */}
        <link
          rel="preload"
          href="/fonts/plusjakartasans-variable-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-[#f6f0e4] text-[#241d12]">{children}</body>
    </html>
  );
}
