import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

/**
 * Tipografia do quiz "Livro dos Sonhos" (auto-hospedada em /public/fonts):
 * Plus Jakarta Sans variável (200–800) — elegante e de leitura fácil
 * para público adulto no celular (títulos, perguntas, alternativas e botões).
 */
/* ======================================================================
 *  📊 META PIXEL — CÓDIGO BASE (única instalação do projeto)
 * ======================================================================
 *  ID do Pixel: 900080772936894
 *
 *  - Snippet oficial da Meta. Dispara PageView UMA única vez por
 *    carregamento da página (entrada do quiz).
 *  - Os eventos personalizados do quiz (QuizStarted e QuizCompleted)
 *    são disparados em src/app/page.tsx — sem duplicação de código
 *    base nem de eventos.
 *  - O quiz NÃO envia Lead, Purchase nem InitiateCheckout: os eventos
 *    do checkout e da venda são responsabilidade da integração Cakto.
 *
 *  Para trocar o pixel, basta substituir o ID abaixo (e no <noscript>).
 * ==================================================================== */
const META_PIXEL_ID = "900080772936894";

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
      <body className="antialiased bg-[#f6f0e4] text-[#241d12]">
        {/* Meta Pixel — código base + PageView (uma vez por carregamento) */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/pt_BR/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
        {/* fallback canônico da Meta para navegadores sem JavaScript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
