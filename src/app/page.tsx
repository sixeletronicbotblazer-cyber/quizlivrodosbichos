"use client";

/* ======================================================================
 *  🔗 LINK DO CHECKOUT — COLE AQUI A URL DE PAGAMENTO
 * ======================================================================
 *  Os botões finais ("VER MINHA CONDIÇÃO" e "Continuar para a página")
 *  abrem esta URL NA MESMA ABA, preservando automaticamente os parâmetros
 *  utm_* recebidos na URL do quiz (ex.: ?utm_source=facebook&utm_campaign=sonhou).
 *
 *  Para trocar o destino, basta substituir o valor abaixo.
 * ==================================================================== */
const CHECKOUT_URL = "https://pay.cakto.com.br/3ahathx_1209170";

/* ======================================================================
 *  📱 TELAS REAIS DO APLICATIVO
 * ======================================================================
 *  Imagens enviadas pelo usuário (interface original preservada, sem
 *  redesenho de textos nem funções inventadas):
 *    - app-tela-principal.webp → tela principal do aplicativo (busca)
 *    - app-tela-login.webp     → tela de login (e-mail usado na compra)
 *
 *  Elas só são carregadas na etapa final do quiz (nunca durante a troca
 *  entre perguntas). Para atualizar, basta substituir os arquivos em
 *  public/assets/ mantendo os mesmos nomes.
 * ==================================================================== */
const APP_MAIN_SCREEN = "/assets/app-tela-principal.webp";
const APP_LOGIN_SCREEN = "/assets/app-tela-login.webp";

/* ======================================================================
 *  ⚡ RESPONSIVIDADE DAS RESPOSTAS
 * ======================================================================
 *  Ao tocar numa opção: o estado selecionado aparece IMEDIATAMENTE, a
 *  resposta é salva e a troca de pergunta usa apenas uma transição
 *  discreta — sem tela de carregamento, sem pausa artificial e sem
 *  trabalho pesado (as perguntas não têm imagens). As próximas perguntas
 *  vêm de dados estáticos, já prontos na memória.
 * ==================================================================== */
const ANSWER_HOLD_MS = 80; // tempo mínimo para o estado selecionado pintar na tela

/* ======================================================================
 *  📊 EVENTOS DE PIXEL (opcional)
 * ======================================================================
 *  O projeto não possui pixel configurado no momento, então as chamadas
 *  abaixo não fazem nada. Se um pixel (Meta/GTM/GA) for adicionado ao
 *  <head> depois, os eventos passam a ser registrados automaticamente,
 *  sem duplicatas (cada evento dispara uma única vez por carregamento):
 *    - quiz_start       -> clique em "COMEÇAR"
 *    - quiz_complete    -> conclusão da 6ª resposta
 *    - condition_reveal -> clique em "REVELAR MINHA CONDIÇÃO"
 *    - checkout_click   -> clique num link de avanço para o checkout
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

/** Texto principal do resultado, adaptado às respostas — sem nota
 *  científica, porcentagem ou diagnóstico inventado. */
function resultMainText(answers: (string | null)[]): string {
  if (answers[0] === "nenhum") {
    return "Mesmo quando você lembra só de um detalhe, pode começar a consulta pelo que ficou na memória.";
  }
  return "Agora você pode consultar o que ficou do seu sonho, encontrar o verbete e conferir o bicho e os números relacionados.";
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
import { ArrowRight, Check, ChevronLeft, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const goldCtaClass =
  "inline-flex min-h-[60px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gold px-6 " +
  "text-[17px] font-extrabold uppercase tracking-[0.04em] text-[#241b07] " +
  "shadow-[0_14px_30px_-12px_rgba(158,116,20,0.5)] transition duration-150 " +
  "hover:bg-gold-strong active:scale-[0.985] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

/** Etiqueta pequena em dourado com filete. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[12px] font-extrabold uppercase tracking-[0.18em] text-gold-deep",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-gold" />
      {children}
    </p>
  );
}

/** Mockup discreto de celular com uma tela REAL do aplicativo
 *  (proporção original 808×1646 — nada é cortado nem redesenhado). */
function PhoneMockup({
  src,
  alt,
  sizes,
  priority = false,
  className,
  captionTitle,
  captionText,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  captionTitle?: string;
  captionText?: string;
}) {
  return (
    <figure className={cn("flex w-full flex-col items-center", className)}>
      <div className="w-full rounded-[26px] border border-[#322a1d] bg-coal p-[7px] shadow-[0_24px_50px_-22px_rgba(46,34,9,0.55)]">
        <div className="relative aspect-[808/1646] w-full overflow-hidden rounded-[19px] bg-coal">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover object-top"
          />
        </div>
      </div>
      {captionTitle && (
        <figcaption className="mt-3 max-w-[280px] text-center">
          <p className="text-[15px] font-bold leading-snug text-ink">{captionTitle}</p>
          {captionText && (
            <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{captionText}</p>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/** Escala visual curta (uma etapa por resposta dada) com animação
 *  rápida, indicando que o caminho de consulta foi concluído.
 *  Decorativa: o título ao lado já transmite o significado. */
function PathScale() {
  return (
    <div aria-hidden className="flex items-center gap-1.5">
      {Array.from({ length: QUESTIONS.length }, (_, i) => (
        <motion.span
          key={i}
          className="h-[10px] flex-1 rounded-full bg-gold"
          initial={{ opacity: 0.3, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.25, ease: "easeOut" }}
          style={{ transformOrigin: "left center" }}
        />
      ))}
      <motion.span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold shadow-[0_6px_16px_-6px_rgba(158,116,20,0.55)]"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 380, damping: 16 }}
      >
        <Check className="h-5 w-5 text-[#241b07]" strokeWidth={3.25} />
      </motion.span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Roleta de revelação da condição                                    */
/* ------------------------------------------------------------------ */

/** Revelação honesta da condição disponível: todos os setores da roleta
 *  levam à MESMA condição (não há chances diferentes), o giro dura no
 *  máximo ~1,7s e nunca impede o avanço — o link "Continuar para a
 *  página" permanece disponível e um temporizador de segurança conclui
 *  a revelação mesmo se a animação falhar. */
function ConditionWheel({
  checkoutLinkRef,
}: {
  checkoutLinkRef: (el: HTMLAnchorElement | null) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<"idle" | "spinning" | "revealed">("idle");
  const rotorRef = useRef<HTMLDivElement | null>(null);

  function revealCondition() {
    if (phase !== "idle") return; // ignora toques repetidos
    trackEvent("condition_reveal");

    let prefersReduced = false;
    try {
      prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* matchMedia indisponível: segue com a animação normal */
    }

    setRotation((r) => r + 1440); // 4 voltas — todos os setores são iguais
    if (prefersReduced) {
      setPhase("revealed"); // movimento reduzido: revela na hora
      return;
    }
    setPhase("spinning");

    const finish = () => setPhase((p) => (p === "spinning" ? "revealed" : p));

    /* revela assim que o giro termina de verdade (transitionend)… */
    const rotor = rotorRef.current;
    if (rotor) {
      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName === "transform") {
          rotor.removeEventListener("transitionend", onEnd);
          window.clearTimeout(safety);
          finish();
        }
      };
      rotor.addEventListener("transitionend", onEnd);
    }
    /* …e nunca passa de ~1,9s, mesmo que a transição CSS falhe */
    const safety = window.setTimeout(finish, 1900);
  }

  return (
    <section
      aria-label="Revelação da condição disponível"
      className="mt-6 rounded-3xl border border-[#e0d3ab] bg-paper p-4 shadow-[0_18px_45px_-24px_rgba(60,45,10,0.28)] sm:p-5"
    >
      <h3 className="text-[18px] font-bold leading-snug text-ink sm:text-[19px]">
        Veja a condição disponível para você
      </h3>
      <p className="mt-1 flex items-start gap-1.5 text-[13.5px] leading-snug text-ink-soft">
        <ShieldCheck aria-hidden className="mt-px h-4 w-4 shrink-0 text-gold-deep" />
        A condição apresentada ao concluir o quiz é garantida.
      </p>

      {/* roleta (visual decorativo — o resultado é sempre o mesmo) */}
      <div aria-hidden className="relative mx-auto mt-4 w-[152px] sm:w-[164px]">
        <span
          className="absolute -top-[9px] left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[8px] border-t-[13px] border-x-transparent border-t-ink"
        />
        <div
          ref={rotorRef}
          className="wheel-rotor aspect-square w-full rounded-full border-[3px] border-[#d8b96a] shadow-[inset_0_0_0_6px_rgba(255,253,247,0.55),0_10px_26px_-12px_rgba(60,45,10,0.4)]"
          style={{
            transform: `rotate(${rotation}deg)`,
            backgroundImage:
              "conic-gradient(#e9b53c 0deg 45deg, #f3e7c9 45deg 90deg, #e9b53c 90deg 135deg, #f3e7c9 135deg 180deg, #e9b53c 180deg 225deg, #f3e7c9 225deg 270deg, #e9b53c 270deg 315deg, #f3e7c9 315deg 360deg)",
          }}
        />
        <div
          className={cn(
            "absolute left-1/2 top-1/2 flex h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-colors duration-300",
            phase === "revealed" ? "border-[#b98a1e] bg-gold" : "border-[#d8b96a] bg-paper",
          )}
        >
          {phase === "revealed" ? (
            <Check className="h-6 w-6 text-[#241b07]" strokeWidth={3.25} />
          ) : (
            <Sparkles className="h-[22px] w-[22px] text-gold-deep" />
          )}
        </div>
      </div>

      {phase !== "revealed" ? (
        <>
          <button
            type="button"
            onClick={revealCondition}
            disabled={phase === "spinning"}
            aria-busy={phase === "spinning"}
            className={cn(
              goldCtaClass,
              "mt-4 focus-visible:ring-offset-paper",
              phase === "spinning" && "cursor-wait opacity-70",
            )}
          >
            <Sparkles aria-hidden className="h-5 w-5" strokeWidth={2.5} />
            Revelar minha condição
          </button>
          {/* opção discreta para pular a animação — nunca é bloqueada */}
          <a
            ref={checkoutLinkRef}
            href={CHECKOUT_URL}
            onClick={() => trackEvent("checkout_click")}
            className="mx-auto mt-2 block min-h-[44px] w-fit rounded-lg px-3 text-center text-[13.5px] font-semibold text-ink-faint underline decoration-ink-faint/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Continuar para a página
          </a>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-4"
        >
          <p aria-live="polite" className="text-center text-[16px] font-semibold leading-snug text-ink">
            <span className="text-gold-deep">Condição liberada!</span> Veja os detalhes na próxima
            página.
          </p>
          <a
            ref={checkoutLinkRef}
            href={CHECKOUT_URL}
            onClick={() => trackEvent("checkout_click")}
            className={cn(goldCtaClass, "mt-3 focus-visible:ring-offset-paper")}
          >
            Ver minha condição
            <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.75} />
          </a>
        </motion.div>
      )}
    </section>
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
  const advanceTimer = useRef<number | null>(null);

  /* Os links de checkout abrem o CHECKOUT_URL na mesma aba. Assim que o
     link entra no DOM, o href é atualizado para incluir os parâmetros
     utm_* recebidos na URL do quiz (o HTML renderizado no servidor já
     contém o CHECKOUT_URL puro, garantindo link funcional sem JS). */
  const checkoutLinkRef = useCallback((el: HTMLAnchorElement | null) => {
    if (el) el.setAttribute("href", buildCheckoutUrl());
  }, []);

  /* Mantém o topo visível a cada troca de tela. */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage, current]);

  /* Aquece o cache das telas reais do aplicativo SOMENTE na etapa final
     (nunca durante a troca entre perguntas). */
  useEffect(() => {
    if (stage !== "result") return;
    [APP_MAIN_SCREEN, APP_LOGIN_SCREEN].forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [stage]);

  /* Cancela um avanço pendente ao desmontar. */
  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  const activeAnswer = selected ?? answers[current];
  const question = QUESTIONS[current];

  function cancelPendingAdvance() {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }

  function startQuiz() {
    trackEvent("quiz_start");
    updateQuizState({ stage: "quiz", current: 0, answers });
  }

  function goBack() {
    cancelPendingAdvance();
    setSelected(null);
    setLocked(false);
    if (current === 0) {
      updateQuizState({ stage: "intro", current: 0, answers });
    } else {
      updateQuizState({ stage: "quiz", current: current - 1, answers });
    }
  }

  function choose(optionId: string) {
    if (locked) return; // evita avanço duplicado em toque duplo
    setSelected(optionId); // estado selecionado aparece imediatamente
    setLocked(true);
    cancelPendingAdvance();
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      const nextAnswers = [...answers];
      nextAnswers[current] = optionId; // resposta salva na hora
      if (current === QUESTIONS.length - 1) {
        trackEvent("quiz_complete");
        updateQuizState({ stage: "result", current, answers: nextAnswers });
      } else {
        updateQuizState({ stage: "quiz", current: current + 1, answers: nextAnswers });
      }
      setSelected(null);
      setLocked(false);
    }, ANSWER_HOLD_MS);
  }

  function restartQuiz() {
    cancelPendingAdvance();
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

  const mainText = resultMainText(answers);
  const screenKey = stage === "quiz" ? `q-${current}` : stage;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-dvh flex-col bg-cream font-sans">
        {/* brilho dourado decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(62%_52%_at_50%_0%,rgba(233,181,60,0.16),transparent_72%)]"
        />

        <main className="relative z-10 mx-auto flex w-full max-w-[520px] flex-1 flex-col px-5">
          <AnimatePresence mode="wait" initial={false}>
            {/* ============ TELA DE ABERTURA ============ */}
            {stage === "intro" && (
              <motion.section
                key="intro"
                aria-label="Abertura do quiz"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.12, ease: "easeIn" } }}
                className="flex flex-1 flex-col justify-center py-8"
              >
                <Eyebrow>Quiz rápido • 6 perguntas</Eyebrow>

                <h1 className="mt-4 text-[42px] font-extrabold leading-[1.04] tracking-tight text-ink">
                  Sonhou?
                  <br />
                  <span className="text-gold-deep">E agora?</span>
                </h1>

                <p className="mt-4 max-w-[26rem] text-[17px] leading-relaxed text-ink-soft">
                  Veja o caminho mais prático para consultar o significado, o bicho e os números
                  associados ao que você lembra.
                </p>

                {/* capa original do livro + tela principal real do aplicativo */}
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
                      className="h-auto w-full rounded-lg border border-[#d8c69f] object-cover shadow-[0_22px_45px_-20px_rgba(60,45,10,0.5)]"
                    />
                  </div>
                  <PhoneMockup
                    src={APP_MAIN_SCREEN}
                    alt="Tela principal do aplicativo Livro dos Sonhos"
                    sizes="126px"
                    className="w-[34%] max-w-[126px] rotate-[4deg]"
                  />
                </div>

                <button type="button" onClick={startQuiz} className={cn(goldCtaClass, "mt-9")}>
                  Começar
                  <ArrowRight aria-hidden className="h-5 w-5" strokeWidth={2.75} />
                </button>

                <p className="mt-3.5 text-center text-[14px] text-ink-faint">
                  Leva menos de 1 minuto.
                </p>
              </motion.section>
            )}

            {/* ============ PERGUNTAS ============ */}
            {stage === "quiz" && (
              <motion.section
                key={screenKey}
                aria-label={`Pergunta ${current + 1} de ${QUESTIONS.length}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.05, ease: "easeIn" } }}
                className="flex flex-1 flex-col py-6"
              >
                <header>
                  <div className="flex min-h-[44px] items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      className="-ml-2 flex min-h-[44px] cursor-pointer items-center gap-1 rounded-lg px-2 text-[14px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                    >
                      <ChevronLeft aria-hidden className="h-5 w-5" strokeWidth={2.5} />
                      Voltar
                    </button>
                    <span
                      className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-gold-deep"
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
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e7dcc2]"
                  >
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-200 ease-out"
                      style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                </header>

                <div className="flex flex-1 flex-col justify-center py-6">
                  <h2 className="text-[22px] font-bold leading-snug text-ink">{question.prompt}</h2>

                  {question.helper && (
                    <p className="mt-2.5 text-[15px] leading-snug text-ink-soft">
                      {question.helper}
                    </p>
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
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                            isActive
                              ? "border-gold bg-[#f8ecc9] shadow-[inset_0_0_0_1px_rgba(190,141,25,0.4)]"
                              : "border-[#e0d5bb] bg-paper hover:border-[#c2b08a] hover:bg-[#fdf9ee] active:scale-[0.99]",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
                              isActive
                                ? "border-gold bg-gold"
                                : "border-[#cbb98d] bg-paper group-hover:border-[#a8946a]",
                            )}
                          >
                            {isActive && (
                              <Check className="h-4 w-4 text-[#241b07]" strokeWidth={3.25} />
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-[17px] leading-snug text-ink",
                              isActive ? "font-bold" : "font-medium",
                            )}
                          >
                            {option.label}
                          </span>
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
                aria-label="Resultado do quiz"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.12, ease: "easeIn" } }}
                className="pt-6 pb-8"
              >
                <Eyebrow>Resultado</Eyebrow>

                {/* escala curta com animação rápida: caminho concluído */}
                <div className="mt-4">
                  <PathScale />
                </div>

                <h2 className="mt-4 text-[26px] font-extrabold leading-[1.12] tracking-tight text-ink sm:text-[30px]">
                  Seu caminho de consulta <span className="text-gold-deep">está pronto</span>
                </h2>

                <p className="mt-3 text-[16px] leading-relaxed text-ink-soft sm:text-[16.5px]">
                  {mainText}
                </p>

                {/* revelação da condição com roleta */}
                <ConditionWheel checkoutLinkRef={checkoutLinkRef} />

                {/* telas reais do aplicativo (mockups discretos) */}
                <section aria-label="Telas reais do aplicativo" className="mt-9">
                  <p className="text-center text-[12px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
                    O aplicativo na prática
                  </p>
                  <div className="mt-5 flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-center sm:gap-7">
                    <PhoneMockup
                      src={APP_MAIN_SCREEN}
                      alt="Tela principal do aplicativo Livro dos Sonhos, com busca do sonho por palavra e acesso ao índice do livro"
                      sizes="(max-width: 639px) 72vw, 225px"
                      className="max-w-[280px] sm:w-[calc(50%-14px)] sm:max-w-[225px]"
                      captionTitle="Consulta pelo aplicativo"
                      captionText="Uma palavra já é suficiente para começar."
                    />
                    <PhoneMockup
                      src={APP_LOGIN_SCREEN}
                      alt="Tela de login do aplicativo Livro dos Sonhos, com campo para informar o e-mail usado na compra"
                      sizes="(max-width: 639px) 72vw, 225px"
                      className="max-w-[280px] sm:w-[calc(50%-14px)] sm:max-w-[225px]"
                      captionTitle="Após a compra, acesse o aplicativo com seu e-mail."
                    />
                  </div>
                </section>

                <button
                  type="button"
                  onClick={restartQuiz}
                  className="mx-auto mt-9 block min-h-[44px] cursor-pointer rounded-lg px-4 text-[14px] font-semibold text-ink-faint underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                >
                  Refazer o quiz
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        <footer className="relative z-10 mt-auto border-t border-[#e0d5bb] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
          <p className="mx-auto max-w-[520px] text-center text-[12px] leading-relaxed text-ink-faint">
            Livro dos Sonhos — livro digital em PDF e aplicativo de consulta. Material de consulta:
            não promete acertos, prêmios nem resultados financeiros. Proibido para menores de 18
            anos.
          </p>
        </footer>
      </div>
    </MotionConfig>
  );
}
