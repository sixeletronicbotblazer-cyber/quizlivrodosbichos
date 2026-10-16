"use client";

/* ======================================================================
 *  🔗 LINK DO CHECKOUT — COLE AQUI A URL DE PAGAMENTO
 * ======================================================================
 *  O botão final "VER LIVRO + APLICATIVO" abre esta URL NA MESMA ABA,
 *  preservando automaticamente os parâmetros utm_* recebidos na URL
 *  do quiz (ex.: ?utm_source=facebook&utm_campaign=sonhou).
 *
 *  Para trocar o destino, basta substituir o valor abaixo.
 * ==================================================================== */
const CHECKOUT_URL = "https://pay.cakto.com.br/3ahathx_1209170";

/* ======================================================================
 *  📱 TELA DO APLICATIVO
 * ======================================================================
 *  A imagem real da busca no aplicativo não foi enviada junto com a capa
 *  e o ebook. O componente <AppScreenVisual/> tenta carregar, nesta ordem:
 *    1) public/assets/app-busca.png
 *    2) public/assets/app-busca.jpg
 *  Se nenhum dos arquivos existir, exibe um ESPAÇO RESERVADO claramente
 *  identificado. Para ativar a imagem real basta salvar o print da busca
 *  do aplicativo em public/assets/app-busca.png (ou .jpg) — a página
 *  passa a exibi-la automaticamente, sem mexer no código.
 * ==================================================================== */
const APP_SCREEN_SOURCES = ["/assets/app-busca.png", "/assets/app-busca.jpg"];

/* ======================================================================
 *  📊 EVENTOS DE PIXEL (opcional)
 * ======================================================================
 *  O projeto não possui pixel configurado no momento, então as chamadas
 *  abaixo não fazem nada. Se um pixel (Meta/GTM/GA) for adicionado ao
 *  <head> depois, os eventos passam a ser registrados automaticamente,
 *  sem duplicatas (cada evento dispara uma única vez por carregamento):
 *    - quiz_start      -> clique em "COMEÇAR"
 *    - quiz_complete   -> conclusão da 6ª resposta
 *    - checkout_click  -> clique no botão final
 *  Nenhum evento de compra é registrado aqui (o checkout cuida disso).
 * ==================================================================== */
type PixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
};

const firedEvents = new Set<string>();

function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || firedEvents.has(name)) return;
  firedEvents.add(name);
  try {
    const w = window as PixelWindow;
    if (typeof w.fbq === "function") w.fbq("trackCustom", name, params);
    if (typeof w.gtag === "function") w.gtag("event", name, params);
    if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...params });
  } catch {
    /* pixel ausente ou bloqueado: ignora silenciosamente */
  }
}

/* ------------------------------------------------------------------ */
/*  Dados do quiz                                                      */
/* ------------------------------------------------------------------ */

type Option = { id: string; label: string };
type Question = { prompt: string; helper?: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    prompt: "Quando acorda, você costuma lembrar do sonho?",
    options: [
      { id: "detalhes", label: "Sim, lembro de vários detalhes" },
      { id: "parte", label: "Lembro só de uma parte" },
      { id: "imagem", label: "Às vezes fica só uma imagem ou sensação" },
      { id: "nenhum", label: "Não lembro de nenhum agora" },
    ],
  },
  {
    prompt: "No sonho que você lembra, o que mais chamou sua atenção?",
    options: [
      { id: "animal", label: "Um animal" },
      { id: "pessoa", label: "Uma pessoa" },
      { id: "lugar", label: "Um lugar ou objeto" },
      { id: "situacao", label: "Uma situação que aconteceu" },
      { id: "nao-lembro", label: "Não lembro agora" },
    ],
  },
  {
    prompt: "O que você gostaria de consultar primeiro?",
    helper:
      "O livro reúne verbetes para consulta, inclusive as associações usadas no contexto do jogo do bicho.",
    options: [
      { id: "significado", label: "O significado do sonho" },
      { id: "bicho", label: "O bicho e os números associados" },
      { id: "ambos", label: "Quero ver as duas coisas" },
    ],
  },
  {
    prompt: "Como você procura isso hoje?",
    options: [
      { id: "sites", label: "Pesquiso em vários sites" },
      { id: "alguem", label: "Pergunto para alguém" },
      { id: "palpite", label: "Vou pelo que lembro ou pelo palpite" },
      { id: "nao-tenho", label: "Ainda não tenho um jeito de consultar" },
    ],
  },
  {
    prompt: "O que mais dificulta a consulta?",
    options: [
      { id: "palavra", label: "Encontrar a palavra ou o verbete certo" },
      { id: "junto", label: "Ter significado, bicho e números no mesmo lugar" },
      { id: "celular", label: "Conseguir consultar pelo celular" },
      { id: "comecar", label: "Entender por onde começar" },
    ],
  },
  {
    prompt: "Como você prefere fazer a consulta?",
    options: [
      { id: "aplicativo", label: "Digitar uma palavra no aplicativo" },
      { id: "pdf", label: "Abrir o índice e folhear o PDF" },
      { id: "ambos", label: "Usar os dois jeitos" },
    ],
  },
];

const STEPS = [
  "Lembre de um detalhe do sonho",
  "Busque a palavra no aplicativo ou no índice do PDF",
  "Consulte o verbete, o bicho e os números associados",
];

/** Monta a mensagem do resultado a partir das respostas (sem pontuação
 *  nem interpretação inventada — apenas o caminho de consulta). */
function resultParagraphs(answers: (string | null)[]): string[] {
  const paragraphs: string[] = [];
  switch (answers[2]) {
    case "significado":
      paragraphs.push(
        "Comece pelo verbete do que ficou na sua memória e veja o significado apresentado no livro.",
      );
      break;
    case "bicho":
      paragraphs.push(
        "Comece pelo verbete do sonho e consulte o bicho e os números associados no material.",
      );
      break;
    default:
      paragraphs.push(
        "Do detalhe que você lembra, vá ao verbete para consultar significado, bicho e números no mesmo caminho.",
      );
  }
  if (answers[0] === "nenhum") {
    paragraphs.push(
      "Quando lembrar de uma palavra, animal, pessoa ou situação, você já saberá por onde começar.",
    );
  }
  return paragraphs;
}

/** Preserva os parâmetros utm_* da URL do quiz ao montar o link final. */
function buildCheckoutUrl(): string {
  try {
    const url = new URL(CHECKOUT_URL);
    const params = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.set(key, value);
    });
    return url.toString();
  } catch {
    return CHECKOUT_URL;
  }
}

/* ------------------------------------------------------------------ */
/*  Estado da sessão (armazenamento externo + useSyncExternalStore)    */
/* ------------------------------------------------------------------ */

type Stage = "intro" | "quiz" | "result";
const STORAGE_KEY = "livro-dos-sonhos-quiz-v1";

type QuizState = { stage: Stage; current: number; answers: (string | null)[] };

const defaultState: QuizState = {
  stage: "intro",
  current: 0,
  answers: Array(QUESTIONS.length).fill(null),
};

function isValidState(data: unknown): data is QuizState {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Partial<QuizState>;
  const validAnswers =
    Array.isArray(d.answers) &&
    d.answers.length === QUESTIONS.length &&
    d.answers.every((a) => a === null || typeof a === "string");
  if (!validAnswers) return false;
  if (d.stage === "quiz") {
    return typeof d.current === "number" && d.current >= 0 && d.current < QUESTIONS.length;
  }
  if (d.stage === "result") {
    return (d.answers as (string | null)[]).every((a) => a !== null);
  }
  return false;
}

/** Lê as respostas salvas na sessão (uma única vez). */
function readSavedState(): QuizState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return isValidState(data) ? data : null;
  } catch {
    return null;
  }
}

/* Mini armazenamento externo: fonte única de verdade do progresso.
   Mantém as respostas salvas localmente durante a sessão (reload não
   perde o progresso) sem quebrar a hidratação do servidor. */
let memoryState: QuizState = defaultState;
let hydratedFromStorage = false;
const listeners = new Set<() => void>();

function getSnapshot(): QuizState {
  if (!hydratedFromStorage) {
    hydratedFromStorage = true;
    memoryState = readSavedState() ?? memoryState;
  }
  return memoryState;
}

function getServerSnapshot(): QuizState {
  return defaultState;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateQuizState(next: QuizState): void {
  memoryState = next;
  try {
    if (next.stage === "intro") {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      /* mantém quiz em andamento E resultado concluído salvos
         durante a sessão (recarregar não perde o progresso) */
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* armazenamento indisponível: mantém apenas em memória */
  }
  listeners.forEach((listener) => listener());
}

/* ------------------------------------------------------------------ */
/*  Componentes visuais                                                */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const goldCtaClass =
  "inline-flex min-h-[62px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gold px-6 " +
  "text-[17px] font-extrabold uppercase tracking-[0.04em] text-[#241b07] " +
  "shadow-[0_16px_38px_-14px_rgba(233,181,60,0.6)] transition duration-150 " +
  "hover:bg-gold-strong hover:brightness-[1.04] active:scale-[0.985] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

/** Etiqueta pequena em dourado com filete. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[12px] font-extrabold uppercase tracking-[0.18em] text-gold",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-gold/60" />
      {children}
    </p>
  );
}

/** Tela do aplicativo: usa a imagem real se existir; senão, espaço
 *  reservado claramente identificado (ver comentário no topo do arquivo). */
function AppScreenVisual() {
  const [sourceIndex, setSourceIndex] = useState(0);
  const failed = sourceIndex >= APP_SCREEN_SOURCES.length;

  if (failed) {
    return (
      <div
        role="img"
        aria-label="Espaço reservado para a imagem real da busca no aplicativo"
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-gold/50 bg-coal px-2 text-center"
      >
        <Search aria-hidden className="h-5 w-5 text-gold/70" />
        <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-gold/85">
          Tela do aplicativo
        </span>
        <span className="text-[8.5px] leading-tight text-cream/45">
          espaço reservado — substitua por
          <br />
          public/assets/app-busca.png
        </span>
      </div>
    );
  }

  return (
    <Image
      src={APP_SCREEN_SOURCES[sourceIndex]}
      alt="Busca por palavra no aplicativo do Livro dos Sonhos"
      fill
      sizes="150px"
      className="object-cover object-top"
      onError={() => setSourceIndex((i) => i + 1)}
    />
  );
}

/** Moldura de celular usada na abertura e no resultado. */
function PhoneFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[9/17] overflow-hidden rounded-[18px] border border-gold/40 bg-coal shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      <AppScreenVisual />
      <span
        aria-hidden
        className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-cream/15"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

export default function DreamBookQuiz() {
  const { stage, current, answers } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* O botão final abre o CHECKOUT_URL na mesma aba. Assim que o link
     entra no DOM, o href é atualizado para incluir os parâmetros utm_*
     recebidos na URL do quiz (o HTML renderizado no servidor já contém
     o CHECKOUT_URL puro, garantindo link funcional sem JavaScript). */
  const checkoutLinkRef = useCallback((el: HTMLAnchorElement | null) => {
    if (el) el.setAttribute("href", buildCheckoutUrl());
  }, []);

  /* Mantém o topo visível a cada troca de tela. */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage, current]);
  const activeAnswer = selected ?? answers[current];
  const question = QUESTIONS[current];

  function startQuiz() {
    trackEvent("quiz_start");
    updateQuizState({ stage: "quiz", current: 0, answers });
  }

  function goBack() {
    if (current === 0) {
      updateQuizState({ stage: "intro", current: 0, answers });
    } else {
      setSelected(null);
      setLocked(false);
      updateQuizState({ stage: "quiz", current: current - 1, answers });
    }
  }

  function choose(optionId: string) {
    if (locked) return;
    setSelected(optionId);
    setLocked(true);

    window.setTimeout(() => {
      const nextAnswers = [...answers];
      nextAnswers[current] = optionId;

      if (current === QUESTIONS.length - 1) {
        trackEvent("quiz_complete");
        updateQuizState({ stage: "result", current, answers: nextAnswers });
      } else {
        updateQuizState({ stage: "quiz", current: current + 1, answers: nextAnswers });
      }
      setSelected(null);
      setLocked(false);
    }, 400);
  }

  function restartQuiz() {
    setSelected(null);
    setLocked(false);
    updateQuizState(defaultState);
  }

  /* Navegação por setas entre as alternativas (teclado). */
  function handleListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      ArrowRight: 1,
      ArrowLeft: -1,
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const refs = optionRefs.current.filter(Boolean) as HTMLButtonElement[];
    const focusedIndex = refs.findIndex((r) => r === document.activeElement);
    const nextIndex = (focusedIndex + delta + refs.length) % refs.length;
    refs[nextIndex]?.focus();
  }

  const paragraphs = resultParagraphs(answers);
  const screenKey = stage === "quiz" ? `q-${current}` : stage;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-dvh flex-col bg-ink font-sans">
        {/* brilho dourado decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(62%_52%_at_50%_0%,rgba(233,181,60,0.10),transparent_72%)]"
        />

        <main className="relative z-10 mx-auto flex w-full max-w-[520px] flex-1 flex-col px-5">
          <AnimatePresence mode="wait" initial={false}>
            {/* ============ TELA DE ABERTURA ============ */}
            {stage === "intro" && (
              <motion.section
                key="intro"
                aria-label="Abertura do quiz"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="flex flex-1 flex-col justify-center py-8"
              >
                <Eyebrow>Quiz rápido • 6 perguntas</Eyebrow>

                <h1 className="mt-4 font-serif text-[40px] font-extrabold leading-[1.05] tracking-tight text-cream">
                  Sonhou?
                  <br />
                  <em className="text-gold">E agora?</em>
                </h1>

                <p className="mt-4 max-w-[26rem] text-[17px] leading-relaxed text-cream/75">
                  Veja o caminho mais prático para consultar o significado, o bicho e os números
                  associados ao que você lembra.
                </p>

                {/* capa original do livro + tela do aplicativo */}
                <div
                  className="mt-8 flex items-end justify-center gap-4 pb-2"
                  aria-label="Livro e aplicativo"
                >
                  <div className="w-[58%] max-w-[212px] -rotate-2">
                    <Image
                      src="/assets/capa-livro-dos-sonhos.jpg"
                      alt="Capa original do Livro dos Sonhos, com tigre na capa"
                      width={840}
                      height={1187}
                      priority
                      sizes="(max-width: 560px) 56vw, 212px"
                      className="h-auto w-full rounded-lg border border-gold/25 object-cover shadow-[0_24px_50px_-20px_rgba(0,0,0,0.85)]"
                    />
                  </div>
                  <PhoneFrame className="w-[34%] max-w-[118px] rotate-[4deg]" />
                </div>

                <button type="button" onClick={startQuiz} className={cn(goldCtaClass, "mt-9")}>
                  Começar
                  <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.75} />
                </button>

                <p className="mt-3.5 text-center text-[14px] text-cream/55">
                  Leva menos de 1 minuto.
                </p>
              </motion.section>
            )}

            {/* ============ PERGUNTAS ============ */}
            {stage === "quiz" && (
              <motion.section
                key={screenKey}
                aria-label={`Pergunta ${current + 1} de ${QUESTIONS.length}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="flex flex-1 flex-col py-6"
              >
                <header>
                  <div className="flex min-h-[44px] items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      className="-ml-2 flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg px-2 text-[14px] font-semibold uppercase tracking-[0.08em] text-cream/60 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                    >
                      <ChevronLeft aria-hidden className="h-5 w-5" strokeWidth={2.5} />
                      Voltar
                    </button>
                    <span
                      className="text-[13px] font-bold uppercase tracking-[0.16em] text-gold"
                      aria-live="polite"
                    >
                      {current + 1} de {QUESTIONS.length}
                    </span>
                  </div>

                  {/* barra de progresso real */}
                  <div
                    role="progressbar"
                    aria-label="Progresso do quiz"
                    aria-valuemin={0}
                    aria-valuemax={QUESTIONS.length}
                    aria-valuenow={current + 1}
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream/10"
                  >
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-300 ease-out"
                      style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                </header>

                <div className="flex flex-1 flex-col justify-center py-6">
                  <h2 className="text-[21px] font-semibold leading-snug text-cream">
                    {question.prompt}
                  </h2>

                  {question.helper && (
                    <p className="mt-2.5 text-[15px] leading-snug text-cream/55">{question.helper}</p>
                  )}

                  <div
                    role="radiogroup"
                    aria-label={question.prompt}
                    onKeyDown={handleListKeyDown}
                    className="mt-6 flex flex-col gap-3"
                  >
                    {question.options.map((option, index) => {
                      const isActive = option.id === activeAnswer;
                      const rovingTabIndex = isActive || (!activeAnswer && index === 0) ? 0 : -1;
                      return (
                        <button
                          key={option.id}
                          ref={(el) => {
                            optionRefs.current[index] = el;
                          }}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          tabIndex={rovingTabIndex}
                          onClick={() => choose(option.id)}
                          className={cn(
                            "group flex min-h-[62px] w-full cursor-pointer items-center gap-3.5 rounded-2xl border px-5 py-4 text-left transition-all duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                            isActive
                              ? "border-gold bg-gold/[0.14] text-cream shadow-[inset_0_0_0_1px_rgba(233,181,60,0.4)]"
                              : "border-cream/15 bg-coal/70 text-cream/90 hover:border-cream/40 hover:bg-coal active:scale-[0.99]",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
                              isActive ? "border-gold bg-gold" : "border-cream/30 group-hover:border-cream/60",
                            )}
                          >
                            {isActive && (
                              <Check className="h-4 w-4 text-[#241b07]" strokeWidth={3.25} />
                            )}
                          </span>
                          <span className="text-[17px] font-medium leading-snug">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            )}

            {/* ============ RESULTADO ============ */}
            {stage === "result" && (
              <motion.section
                key="result"
                aria-label="Resultado e oferta"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="py-8"
              >
                <Eyebrow>Resultado</Eyebrow>

                <h2 className="mt-4 font-serif text-[34px] font-extrabold leading-[1.08] tracking-tight text-cream">
                  Seu caminho de consulta <em className="text-gold">está pronto.</em>
                </h2>

                <div className="mt-4 space-y-3">
                  {paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-[17.5px] leading-relaxed text-cream/80">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* três passos + imagens reais do material */}
                <div className="mt-9">
                  <Eyebrow className="text-gold/85">Como consultar na prática</Eyebrow>

                  <ol className="mt-4 flex flex-col gap-3">
                    {STEPS.map((step, index) => (
                      <li
                        key={step}
                        className="flex items-center gap-3.5 rounded-2xl border border-cream/12 bg-coal/70 p-4"
                      >
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-terra/45 bg-terra/15 font-serif text-[17px] font-bold text-[#e2916f]"
                        >
                          {index + 1}
                        </span>
                        <span className="text-[16.5px] font-medium leading-snug text-cream/90">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>

                  {/* páginas reais do livro (índice, tabela e verbetes)
                      + tela real do aplicativo sobreposta */}
                  <div className="relative mt-7 mb-9">
                    <div className="overflow-hidden rounded-2xl border border-gold/25 bg-cream-deep">
                      <Image
                        src="/assets/paginas-livro.jpg"
                        alt="Páginas reais do Livro dos Sonhos: índice, tabela de bichos e números e verbetes de sonhos"
                        width={1240}
                        height={780}
                        loading="eager"
                        sizes="(max-width: 560px) 90vw, 480px"
                        className="h-auto w-full"
                      />
                    </div>
                    <div className="absolute -bottom-5 right-2 w-[30%] min-w-[92px] max-w-[128px]">
                      <div className="relative">
                        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2.5 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#241b07] shadow-md">
                          Aplicativo
                        </span>
                        <PhoneFrame />
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[13px] leading-snug text-cream/50">
                    Páginas reais do livro: índice, tabela e verbetes.
                  </p>
                </div>

                {/* oferta */}
                <section
                  aria-label="Oferta do Livro dos Sonhos com aplicativo"
                  className="mt-10 rounded-3xl border border-[#d8c69f] bg-cream p-6 text-[#221b10] shadow-[0_30px_70px_-28px_rgba(0,0,0,0.85)]"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src="/assets/capa-livro-dos-sonhos.jpg"
                      alt="Capa do Livro dos Sonhos"
                      width={840}
                      height={1187}
                      sizes="72px"
                      className="h-auto w-[72px] shrink-0 rounded-md border border-[#d8c69f] object-cover shadow-sm"
                    />
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#a4441f]">
                        Oferta
                      </p>
                      <h3 className="mt-1 font-serif text-[23px] font-extrabold leading-[1.12]">
                        Livro dos Sonhos + Aplicativo
                      </h3>
                    </div>
                  </div>

                  <p className="mt-3.5 text-[15.5px] leading-relaxed text-[#4a3f2b]">
                    PDF para folhear. Aplicativo para buscar pelo celular.
                  </p>

                  <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="font-serif text-[44px] font-black leading-none tracking-tight text-[#1c1710]">
                      R$ 19,90
                    </span>
                    <span className="text-[13.5px] font-semibold text-[#6b5c3e]">pagamento único</span>
                  </div>

                  <a
                    ref={checkoutLinkRef}
                    href={CHECKOUT_URL}
                    onClick={() => trackEvent("checkout_click")}
                    className={cn(
                      goldCtaClass,
                      "mt-5 focus-visible:ring-[#241b07]/60 focus-visible:ring-offset-[#f6f0e4]",
                    )}
                  >
                    Ver livro + aplicativo
                    <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.75} />
                  </a>

                  <p className="mt-3.5 text-center text-[13px] leading-snug text-[#6b5c3e]">
                    Você verá os detalhes da oferta antes de finalizar a compra.
                  </p>
                </section>

                <button
                  type="button"
                  onClick={restartQuiz}
                  className="mx-auto mt-7 block min-h-[44px] cursor-pointer rounded-lg px-4 text-[14px] font-semibold text-cream/45 underline-offset-4 transition-colors hover:text-cream/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Refazer o quiz
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        <footer className="relative z-10 mt-auto border-t border-cream/10 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
          <p className="mx-auto max-w-[520px] text-center text-[12px] leading-relaxed text-cream/40">
            Livro dos Sonhos — livro digital em PDF e aplicativo de consulta. Material de consulta:
            não promete acertos, prêmios nem resultados financeiros. Proibido para menores de 18
            anos.
          </p>
        </footer>
      </div>
    </MotionConfig>
  );
}
