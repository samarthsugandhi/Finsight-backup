"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  X,
  GripVertical,
  CheckCircle,
  Trash2,
  Zap,
  TrendingUp,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useFinance } from "@/context/FinanceContext";

// ── Welcome greeting definition ───────────────────────────────────────────────

const WELCOME_GREETING =
  "Hey there! Welcome to FinSight. I'm FinAI, your personal financial companion. How's your day going? What would you like to explore today?";

// ── Position persistence ──────────────────────────────────────────────────────

const POSITION_KEY = "finai_widget_position";
const DEFAULT_POSITION = { x: null, y: null };

function loadPosition() {
  if (typeof window === "undefined") return DEFAULT_POSITION;
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_POSITION;
  } catch {
    return DEFAULT_POSITION;
  }
}

function savePosition(pos) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
}

function clampToViewport(x, y, width, height) {
  const maxX = window.innerWidth - width - 8;
  const maxY = window.innerHeight - height - 8;
  return {
    x: Math.min(Math.max(8, x), Math.max(8, maxX)),
    y: Math.min(Math.max(8, y), Math.max(8, maxY)),
  };
}

// ── Action block parser ───────────────────────────────────────────────────────

const ACTION_FENCE_RE = /```json\s*(\{[\s\S]*?\})\s*```/;

function parseActionBlock(fullText) {
  const match = fullText.match(ACTION_FENCE_RE);
  if (!match) return { displayText: fullText, action: null };
  const displayText = fullText.replace(ACTION_FENCE_RE, "");
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed?.action && parsed?.payload) {
      return { displayText, action: parsed };
    }
  } catch {
    // Malformed JSON block — just hide it
  }
  return { displayText, action: null };
}

// ── Indian number-to-words engine (no external deps) ─────────────────────────

const _TTS_ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen",
];
const _TTS_TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

function _ttsBelow100(n) {
  if (n < 20) return _TTS_ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o > 0 ? `${_TTS_TENS[t]}-${_TTS_ONES[o]}` : _TTS_TENS[t];
}

function _ttsBelow1000(n) {
  if (n === 0) return "";
  const parts = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) parts.push(`${_TTS_ONES[h]} hundred`);
  if (rem > 0) parts.push(_ttsBelow100(rem));
  return parts.join(" ");
}

/** Convert non-negative integer → Indian words (crore / lakh / thousand) */
function _intToIndianWords(n) {
  if (n === 0) return "zero";
  if (n < 0) return `minus ${_intToIndianWords(Math.abs(n))}`;
  const parts = [];
  if (n >= 10_000_000) {
    // crores (10^7)
    parts.push(`${_intToIndianWords(Math.floor(n / 10_000_000))} crore`);
    n %= 10_000_000;
  }
  if (n >= 100_000) {
    // lakhs (10^5), max 99 lakhs before next crore
    parts.push(`${_ttsBelow100(Math.floor(n / 100_000))} lakh`);
    n %= 100_000;
  }
  if (n >= 1_000) {
    // thousands
    parts.push(`${_ttsBelow100(Math.floor(n / 1_000))} thousand`);
    n %= 1_000;
  }
  if (n > 0) parts.push(_ttsBelow1000(n));
  return parts.join(" ");
}

/** Convert a currency amount string (digits + optional decimal) to words */
function _currencyToWords(numStr, isNegative = false) {
  const cleaned = numStr.replace(/,/g, "");
  const dotIdx = cleaned.indexOf(".");
  const intPart = dotIdx >= 0 ? parseInt(cleaned.slice(0, dotIdx), 10) || 0 : parseInt(cleaned, 10) || 0;
  const decStr = dotIdx >= 0 ? cleaned.slice(dotIdx + 1) : "";
  const prefix = isNegative ? "minus " : "";
  const rupeeWord = intPart === 1 ? "rupee" : "rupees";
  const intWords = _intToIndianWords(intPart);

  if (decStr && parseInt(decStr, 10) > 0) {
    // Normalise to 2 decimal digits for paise
    const paiseVal = decStr.length === 1
      ? parseInt(decStr, 10) * 10
      : parseInt(decStr.slice(0, 2), 10);
    const paiseWords = _ttsBelow100(paiseVal);
    const paiseWord = paiseVal === 1 ? "paisa" : "paise";
    if (intPart === 0) return `${prefix}${paiseWords} ${paiseWord}`;
    return `${prefix}${intWords} ${rupeeWord} and ${paiseWords} ${paiseWord}`;
  }
  return `${prefix}${intWords} ${rupeeWord}`;
}

/** Convert a percentage string to words: "7.5" → "seven point five percent" */
function _percentToWords(numStr, isNegative = false) {
  const cleaned = numStr.replace(/,/g, "");
  const prefix = isNegative ? "minus " : "";
  if (cleaned.includes(".")) {
    const [ip, dp] = cleaned.split(".");
    const ipWords = _intToIndianWords(parseInt(ip, 10) || 0);
    const dpWords = dp.split("").map((d) => _TTS_ONES[parseInt(d, 10)] || "zero").join(" ");
    return `${prefix}${ipWords} point ${dpWords} percent`;
  }
  return `${prefix}${_intToIndianWords(parseInt(cleaned, 10) || 0)} percent`;
}

/**
 * Returns true when a digit sequence looks like an account/phone/OTP/date —
 * something we should NOT convert to spoken currency or plain words.
 * Heuristics: purely sequential ≥ 6 digits with no commas/rupee sign,
 * or matches date-like patterns.
 */
function _looksLikeCode(numStr) {
  const digits = numStr.replace(/,/g, "");
  // date-like: 4-digit years already handled by context; skip very long digit runs
  if (/^\d{6,}$/.test(digits)) return true;   // 6+ bare digits → likely code/phone/OTP
  return false;
}

// ── Natural Phonetic Normalization for Female Voice (Samantha) ────────────────
function normalizeForTTS(text) {
  if (!text) return "";

  let s = text
    // Remove json blocks and code fences
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    // Remove markdown headers and emphasis
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~[^~]+~~/g, "")
    // Remove links and URLs
    .replace(/https?:\/\/\S+/g, "")
    // Remove emojis, symbols, and bullets
    .replace(/[⚠️💡🚀✅❌✨🎤🔊•·▸►■]/g, "")
    .replace(/^\s*[-*+]\s+/gm, "");

  // ── Currency: ₹ / Rs. / INR followed by optional "lakh/crore" word
  //    Handled BEFORE generic number conversion so the rupee symbol is the
  //    trigger and plain numbers are not accidentally treated as currency.

  // ₹N lakh / ₹N crore (already-labelled, convert cleanly)
  s = s.replace(
    /₹\s*(-?)([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:lakhs?|lac|lacs?)\b/gi,
    (_, sign, num) => {
      const lakhVal = parseFloat(num.replace(/,/g, ""));
      const totalRupees = Math.round(lakhVal * 100_000);
      return _currencyToWords(String(totalRupees), sign === "-");
    }
  );
  s = s.replace(
    /₹\s*(-?)([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:crores?|cr)\b/gi,
    (_, sign, num) => {
      const crVal = parseFloat(num.replace(/,/g, ""));
      const totalRupees = Math.round(crVal * 10_000_000);
      return _currencyToWords(String(totalRupees), sign === "-");
    }
  );
  // Plain ₹N — convert with Indian numbering
  s = s.replace(
    /₹\s*(-?)([0-9][0-9,]*(?:\.[0-9]+)?)/g,
    (_, sign, num) => _currencyToWords(num, sign === "-")
  );
  // Rs. N
  s = s.replace(
    /\bRs\.?\s*(-?)([0-9][0-9,]*(?:\.[0-9]+)?)/gi,
    (_, sign, num) => _currencyToWords(num, sign === "-")
  );
  // INR N
  s = s.replace(
    /\bINR\s*(-?)([0-9][0-9,]*(?:\.[0-9]+)?)/gi,
    (_, sign, num) => _currencyToWords(num, sign === "-")
  );
  // Plain "N lakh" / "N crore" without rupee symbol — convert to words
  s = s.replace(
    /\b(-?)([0-9][0-9,]*(?:\.[0-9]+)?)\s*(lakhs?|lac|lacs?)\b/gi,
    (_, sign, num, unit) => {
      const lakhVal = parseFloat(num.replace(/,/g, ""));
      const totalRupees = Math.round(lakhVal * 100_000);
      const words = _intToIndianWords(totalRupees);
      return `${sign === "-" ? "minus " : ""}${words} lakh`;
    }
  );
  s = s.replace(
    /\b(-?)([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crores?)\b/gi,
    (_, sign, num) => {
      const crVal = parseFloat(num.replace(/,/g, ""));
      const totalRupees = Math.round(crVal * 10_000_000);
      const words = _intToIndianWords(totalRupees);
      return `${sign === "-" ? "minus " : ""}${words} crore`;
    }
  );

  // ── Percentages: N% → words
  s = s.replace(
    /(-?)([0-9][0-9,]*(?:\.[0-9]+)?)\s*%/g,
    (_, sign, num) => _percentToWords(num, sign === "-")
  );

  // ── Remaining plain numbers: convert only "small" financial-looking numbers
  //    (comma-separated Indian style, or plain integers up to 9 digits).
  //    Skip bare digit runs ≥6 digits (codes, phones, OTPs) and dates.
  s = s.replace(
    /\b(-?)([0-9]{1,2}(?:,[0-9]{2})*(?:,[0-9]{3})|[0-9]{1,5})(?:\.[0-9]+)?\b/g,
    (match, sign, num) => {
      // Preserve year-like 4-digit numbers (1900–2099) and skip codes
      const bare = num.replace(/,/g, "");
      if (/^(19|20)\d{2}$/.test(bare)) return match; // year — keep as-is
      if (_looksLikeCode(bare)) return match;         // code/OTP — keep
      const full = match.replace(/,/g, "");
      const val = parseFloat(full);
      if (isNaN(val) || val === 0) return match;
      return `${sign === "-" ? "minus " : ""}${_intToIndianWords(Math.round(val))}`;
    }
  );

  // Punctuation and pauses
  s = s
    .replace(/[-–—]/g, ", ")
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Ensure clean natural sentence pauses
  s = s.replace(/\s*\.\s*/g, ". ").replace(/\s*,\s*/g, ", ");
  return s;
}

// ── Action confirm card ───────────────────────────────────────────────────────

function ActionCard({ action, onConfirm, onDismiss, confirming }) {
  if (!action) return null;

  const isCreate = action.action === "CREATE_TRANSACTION";
  const isDelete = action.action === "DELETE_TRANSACTION";
  const { payload } = action;

  let label = "";
  let sublabel = "";
  let Icon = Zap;
  let accentClass = "border-horizon/40 bg-horizon/10";
  let badgeClass = "bg-horizon text-[#0f1b33]";

  if (isCreate) {
    const sign = payload.type === "INCOME" ? "+" : "−";
    label = `${sign}₹${Number(payload.amount).toLocaleString("en-IN")} · ${payload.category}`;
    sublabel = payload.description ? `"${payload.description}"` : payload.type;
    Icon = payload.type === "INCOME" ? CheckCircle : Zap;
    accentClass =
      payload.type === "INCOME"
        ? "border-emerald-400/40 bg-emerald-500/10"
        : "border-horizon/40 bg-horizon/10";
    badgeClass =
      payload.type === "INCOME" ? "bg-emerald-400 text-[#0f1b33]" : "bg-horizon text-[#0f1b33]";
  } else if (isDelete) {
    label = `Delete transaction #${payload.id}`;
    sublabel = "This cannot be undone";
    Icon = Trash2;
    accentClass = "border-red-400/40 bg-red-500/10";
    badgeClass = "bg-red-400 text-white";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className={`border rounded-xl p-3.5 shadow-md backdrop-blur-sm ${accentClass}`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${badgeClass}`}>
          <Icon className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-0.5">
            Proposed Action
          </p>
          <p className="text-xs font-semibold text-ink leading-snug">{label}</p>
          {sublabel && <p className="text-[10px] text-ink-soft mt-0.5">{sublabel}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onConfirm}
          disabled={confirming}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-opacity disabled:opacity-60 ${badgeClass}`}
        >
          {confirming ? "Saving…" : "Confirm & Save"}
        </button>
        <button
          onClick={onDismiss}
          disabled={confirming}
          className="flex-1 py-1.5 rounded-lg border border-line bg-paper text-ink-soft text-[10px] cursor-pointer hover:text-ink transition-colors"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

// ── Portfolio Suggestion "Consider" card ──────────────────────────────────────

function ConsiderCard({ onAskAnother, onDismiss, disabled }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className="border border-amber-400/30 bg-amber-500/10 rounded-xl p-3.5 shadow-sm backdrop-blur-sm relative"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-500">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">
              Portfolio Suggestion
            </p>
            <p className="text-xs font-semibold text-ink leading-snug">
              Non-binding idea · no trades executed
            </p>
            <p className="text-[10px] text-ink-soft mt-1">
              ⚠️ Not financial advice — for informational purposes only.
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            disabled={disabled}
            className="text-ink-soft hover:text-ink cursor-pointer p-0.5 rounded transition-colors"
            title="Dismiss suggestion"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <button
          onClick={onAskAnother}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-amber-400/40 bg-paper text-ink text-[11px] font-semibold cursor-pointer hover:bg-paper-raised transition-colors disabled:opacity-60 shadow-xs"
        >
          <RefreshCw className="h-3 w-3 text-amber-500" />
          <span>Ask for another option</span>
        </button>
      </div>
    </motion.div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, isStreaming, onReplay, isSpeaking }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
          isUser
            ? "bg-horizon text-[#0f1b33] font-semibold"
            : "bg-paper border border-line text-ink-soft"
        }`}
      >
        <p className="whitespace-pre-wrap">
          {msg.displayText || msg.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-current opacity-70 align-middle" />
          )}
        </p>
        {!isUser && !isStreaming && (msg.displayText || msg.content) && onReplay && (
          <div className="mt-1.5 flex items-center gap-2">
            <button
              onClick={() => onReplay(msg)}
              title={isSpeaking ? "Stop playback" : "Replay voice response (plays once)"}
              className={`flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer ${
                isSpeaking
                  ? "text-horizon font-bold animate-pulse"
                  : "text-ink-soft/60 hover:text-horizon"
              }`}
            >
              {isSpeaking ? (
                <>
                  <Square className="h-2.5 w-2.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Replay</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FinAIChat() {
  const store = useFinance();
  const { refetch, setError } = store;
  const prefersReducedMotion = useReducedMotion();

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingConsider, setPendingConsider] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // ── Voice state ─────────────────────────────────────────────────────────────
  // IDLE | RECORDING | TRANSCRIBING | PROCESSING | SPEAKING
  const [voiceState, setVoiceState] = useState("IDLE");
  const [voiceError, setVoiceError] = useState("");
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  // Auto-speak preference
  const [autoSpeak, setAutoSpeak] = useState(true);
  const autoSpeakRef = useRef(true);
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  // Reliable duplicate playback guards
  const spokenMessageIdsRef = useRef(new Set());
  const activeUtteranceRef = useRef(null);
  const isSpeechStoppedRef = useRef(false);

  // Audio recording refs (for 100% offline Whisper STT)
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const liveRecognitionRef = useRef(null);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Detect local speech synthesis on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setTtsSupported(true);
      // Pre-warm voices
      window.speechSynthesis.getVoices();
    }
  }, []);

  // ── Natural Voice Selector (Samantha priority) ──────────────────────────────
  const selectVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];

    // 1. Explicit macOS Samantha voice (Natural, local)
    const samantha = voices.find((v) => v.name.toLowerCase().includes("samantha"));
    if (samantha) return samantha;

    // 2. High-quality natural female voices
    const preferred = ["karen", "victoria", "allison", "ava", "susan", "zira"];
    for (const name of preferred) {
      const v = voices.find((v) => v.name.toLowerCase().includes(name));
      if (v) return v;
    }

    // 3. Any local English voice
    const localEn = voices.find((v) => v.lang.startsWith("en") && !v.remote);
    if (localEn) return localEn;

    return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  }, []);

  // ── Stop Speaking ───────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    isSpeechStoppedRef.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.__activeFinsightUtterance = null;
    }
    activeUtteranceRef.current = null;
    setSpeakingMsgId(null);
    setVoiceState((prev) => (prev === "SPEAKING" ? "IDLE" : prev));
  }, []);

  // ── Play Speech Exactly ONCE ────────────────────────────────────────────────
  const playSpeechOnce = useCallback(
    (text, msgId, isReplay = false) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (!text || typeof text !== "string") return;

      // Duplicate playback guard: if not replay, and this message was already spoken, return
      if (!isReplay && spokenMessageIdsRef.current.has(msgId)) {
        return;
      }

      // Mark message as spoken immediately
      if (!isReplay) {
        spokenMessageIdsRef.current.add(msgId);
      }

      // Cancel any ongoing utterance before starting new one
      window.speechSynthesis.cancel();
      isSpeechStoppedRef.current = false;

      const normalized = normalizeForTTS(text);
      if (!normalized) return;

      const utterance = new SpeechSynthesisUtterance(normalized);
      const voice = selectVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || "en-US";
      utterance.rate = 0.98; // natural, comfortable speaking pace
      utterance.pitch = 1.04; // soft, natural tone
      utterance.volume = 1.0;

      // Retain global reference to defeat Chrome GC bug
      window.__activeFinsightUtterance = utterance;
      activeUtteranceRef.current = utterance;

      utterance.onstart = () => {
        if (isSpeechStoppedRef.current) {
          window.speechSynthesis.cancel();
          return;
        }
        setVoiceState("SPEAKING");
        setSpeakingMsgId(msgId);
      };

      utterance.onend = () => {
        window.__activeFinsightUtterance = null;
        activeUtteranceRef.current = null;
        setSpeakingMsgId(null);
        setVoiceState((prev) => (prev === "SPEAKING" ? "IDLE" : prev));
      };

      utterance.onerror = (e) => {
        window.__activeFinsightUtterance = null;
        activeUtteranceRef.current = null;
        setSpeakingMsgId(null);
        setVoiceState((prev) => (prev === "SPEAKING" ? "IDLE" : prev));
      };

      // Speak utterance exactly once
      window.speechSynthesis.speak(utterance);
    },
    [selectVoice]
  );

  // ── Replay Handler ──────────────────────────────────────────────────────────
  const handleReplay = useCallback(
    (msg) => {
      if (speakingMsgId === msg.id && voiceState === "SPEAKING") {
        stopSpeaking();
        return;
      }
      playSpeechOnce(msg.displayText || msg.content, msg.id, true);
    },
    [speakingMsgId, voiceState, stopSpeaking, playSpeechOnce]
  );

  // ── Welcome greeting on first open (One-time session guard) ─────────────────
  const hasSpokenWelcomeRef = useRef(false);
  const SESSION_GREETING_KEY = "finai_greeting_spoken_session";

  useEffect(() => {
    if (!chatOpen) return;

    // Check session-level storage to guard against replaying across re-renders or page refresh
    let sessionAlreadySpoken = false;
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionAlreadySpoken = window.sessionStorage.getItem(SESSION_GREETING_KEY) === "true";
      }
    } catch {
      // Ignore sessionStorage exceptions in restricted sandboxes
    }

    // Populate welcome bubble into messages if empty
    setMessages((prev) => {
      if (prev.length > 0 || prev.some((m) => m.id === "welcome_greeting")) return prev;
      return [
        {
          id: "welcome_greeting",
          role: "assistant",
          content: WELCOME_GREETING,
          displayText: WELCOME_GREETING,
          action: null,
        },
      ];
    });

    // Guard: only speak automatically once per page session
    if (hasSpokenWelcomeRef.current || sessionAlreadySpoken) {
      return;
    }

    hasSpokenWelcomeRef.current = true;
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(SESSION_GREETING_KEY, "true");
      }
    } catch {}

    // Speak greeting once if autoSpeak is enabled and local speech synthesis is supported
    // Guard: do not interrupt an existing user-initiated speech or recording session
    if (
      autoSpeakRef.current &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      !isSpeechStoppedRef.current &&
      voiceState !== "RECORDING" &&
      voiceState !== "TRANSCRIBING" &&
      voiceState !== "SPEAKING"
    ) {
      const timer = setTimeout(() => {
        if (!isSpeechStoppedRef.current) {
          // playSpeechOnce marks "welcome_greeting" in spokenMessageIdsRef internally upon initiating speech
          playSpeechOnce(WELCOME_GREETING, "welcome_greeting", false);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [chatOpen, voiceState, playSpeechOnce]);

  // ── Send handler ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text) => {
      const messageText = typeof text === "string" ? text.trim() : input.trim();
      if (!messageText || chatLoading) return;

      abortRef.current?.abort();
      setPendingAction(null);
      setPendingConsider(null);
      stopSpeaking();

      setInput("");
      setLiveTranscript("");
      setChatLoading(true);
      setVoiceState("PROCESSING");

      const userMsgId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const assistantMsgId = `asst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const userMsgObj = {
        id: userMsgId,
        role: "user",
        content: messageText,
        displayText: messageText,
        action: null,
      };

      const assistantPlaceholder = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        displayText: "",
        action: null,
      };

      setMessages((prev) => [...prev, userMsgObj, assistantPlaceholder]);
      setStreamingId(assistantMsgId);

      const historyForApi = messages.map(({ role, content }) => ({ role, content }));

      let accumulated = "";

      const ac = api.aiChatStream(
        { message: messageText, history: historyForApi },
        {
          onChunk(chunkText) {
            accumulated += chunkText;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === assistantMsgId);
              if (idx === -1) return prev;
              const next = [...prev];
              const liveDisplay = accumulated.replace(/```[\s\S]*$/, "");
              next[idx] = { ...next[idx], content: accumulated, displayText: liveDisplay };
              return next;
            });
          },

          onDone() {
            setChatLoading(false);
            setStreamingId(null);
            setVoiceState("IDLE");

            const { displayText, action } = parseActionBlock(accumulated);
            const isPortfolioSuggestion =
              !action &&
              (accumulated.includes("Not financial advice") || accumulated.includes("⚠️"));

            const cleanDisplayText = isPortfolioSuggestion
              ? displayText.replace(/⚠️?\s*Not financial advice[^\n]*/gi, "").trimEnd()
              : displayText;

            // Update final assistant message in state
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === assistantMsgId);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                content: accumulated,
                displayText: cleanDisplayText,
                action,
                isPortfolioSuggestion,
              };

              if (action) {
                setPendingAction({ action, messageId: assistantMsgId });
                setPendingConsider(null);
              } else if (isPortfolioSuggestion) {
                setPendingConsider({ messageId: assistantMsgId });
                setPendingAction(null);
              }

              return next;
            });

            // ── Auto-speak the AI response strictly ONCE ─────────────────────
            // Notice: executed OUTSIDE of setMessages updater, guaranteed exactly once!
            if (autoSpeakRef.current && cleanDisplayText && !spokenMessageIdsRef.current.has(assistantMsgId)) {
              setTimeout(() => {
                playSpeechOnce(cleanDisplayText, assistantMsgId, false);
              }, 60);
            }

            refetch?.().catch(() => {});
          },

          onError(err) {
            setChatLoading(false);
            setStreamingId(null);
            setVoiceState("IDLE");
            const errText = `⚠️ ${err.message || "Something went wrong. Is Ollama running?"}`;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === assistantMsgId);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], content: errText, displayText: errText, action: null };
              return next;
            });
            setError?.(err.message);
          },
        }
      );

      abortRef.current = ac;
    },
    [input, chatLoading, messages, stopSpeaking, refetch, setError, playSpeechOnce]
  );

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleAskAnotherOption = () => {
    sendMessage("Give me another portfolio option");
  };

  // ── 100% Local Whisper Speech Recording ─────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      stopSpeaking();
      setVoiceError("");
      setLiveTranscript("");
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Best supported audio mimeType
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstart = () => {
        setVoiceState("RECORDING");
      };

      recorder.start(100);

      // Also attach SpeechRecognition for live visual interim preview if available
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = "en-IN";
          rec.interimResults = true;
          rec.continuous = true;
          rec.onresult = (evt) => {
            let interim = "";
            for (let i = evt.resultIndex; i < evt.results.length; i++) {
              interim += evt.results[i][0].transcript;
            }
            if (interim) setLiveTranscript(interim);
          };
          rec.onerror = () => {};
          rec.start();
          liveRecognitionRef.current = rec;
        } catch {
          // Live preview is optional; local Whisper will accurately transcribe the recorded audio
        }
      }
    } catch (err) {
      setVoiceError("Microphone access denied. Please allow microphone in browser.");
      setVoiceState("IDLE");
    }
  }, [stopSpeaking]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setVoiceState("IDLE");
      return;
    }

    // Stop live recognition preview
    if (liveRecognitionRef.current) {
      try {
        liveRecognitionRef.current.stop();
      } catch {}
      liveRecognitionRef.current = null;
    }

    setVoiceState("TRANSCRIBING");

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        // Stop audio tracks
        recorder.stream.getTracks().forEach((track) => track.stop());

        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          if (audioBlob.size < 1000) {
            // Very short recording, check interim transcript
            if (liveTranscript.trim()) {
              setInput(liveTranscript.trim());
              setVoiceState("IDLE");
              sendMessage(liveTranscript.trim());
            } else {
              setVoiceError("No speech detected. Please try speaking again.");
              setVoiceState("IDLE");
            }
            resolve(null);
            return;
          }

          // Transcribe via 100% local Whisper.cpp backend
          const formData = new FormData();
          const ext = mimeType.includes("mp4") ? "m4a" : "webm";
          formData.append("audio", audioBlob, `speech.${ext}`);

          const res = await api.aiTranscribe(formData);
          const transcript = res?.text?.trim() || liveTranscript.trim();

          if (transcript) {
            setInput(transcript);
            setLiveTranscript("");
            setVoiceState("IDLE");
            // Automatically send recognized speech to FinAI
            sendMessage(transcript);
          } else {
            setVoiceError("Could not transcribe speech. Please try again.");
            setVoiceState("IDLE");
          }
        } catch (err) {
          // If local Whisper endpoint experienced an issue, fallback to live transcript
          if (liveTranscript.trim()) {
            setInput(liveTranscript.trim());
            setVoiceState("IDLE");
            sendMessage(liveTranscript.trim());
          } else {
            setVoiceError(err.message || "Failed to transcribe audio.");
            setVoiceState("IDLE");
          }
        } finally {
          audioChunksRef.current = [];
          mediaRecorderRef.current = null;
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, [liveTranscript, sendMessage]);

  const handleMicClick = useCallback(() => {
    if (voiceState === "RECORDING") {
      stopRecordingAndTranscribe();
    } else if (voiceState === "SPEAKING") {
      stopSpeaking();
    } else {
      startRecording();
    }
  }, [voiceState, stopRecordingAndTranscribe, stopSpeaking, startRecording]);

  // ── Draggable position ──────────────────────────────────────────────────────
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const widgetRef = useRef(null);

  useEffect(() => {
    setPosition(loadPosition());
  }, []);

  function handleDragStart(e) {
    const point = e.touches ? e.touches[0] : e;
    const rect = widgetRef.current.getBoundingClientRect();
    dragOffset.current = { dx: point.clientX - rect.left, dy: point.clientY - rect.top };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e) {
      const point = e.touches ? e.touches[0] : e;
      const rect = widgetRef.current.getBoundingClientRect();
      const next = clampToViewport(
        point.clientX - dragOffset.current.dx,
        point.clientY - dragOffset.current.dy,
        rect.width,
        rect.height
      );
      setPosition(next);
    }
    function handleUp() {
      setDragging(false);
      setPosition((current) => {
        savePosition(current);
        return current;
      });
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragging]);

  const wrapperStyle =
    position.x !== null
      ? { position: "fixed", left: position.x, top: position.y, right: "auto", bottom: "auto", zIndex: 40 }
      : { position: "fixed", right: 24, bottom: 24, zIndex: 40 };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopSpeaking();
      if (liveRecognitionRef.current) {
        try {
          liveRecognitionRef.current.abort();
        } catch {}
      }
    };
  }, [stopSpeaking]);

  // ── Confirm action ────────────────────────────────────────────────────────
  async function handleConfirmAction() {
    if (!pendingAction) return;
    const { action } = pendingAction;
    setConfirming(true);

    try {
      const res = await api.executeAiAction(action);
      const confirmMsg = `✅ ${res?.message || "Action processed successfully."}`;
      const confirmId = `conf_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: confirmId, role: "assistant", content: confirmMsg, displayText: confirmMsg, action: null },
      ]);

      if (typeof refetch === "function") {
        await refetch();
      }

      setPendingAction(null);
    } catch (err) {
      setError?.(err.message);
    } finally {
      setConfirming(false);
    }
  }

  // ── Status banner & label ──────────────────────────────────────────────────
  const headerStatus = (() => {
    if (voiceState === "RECORDING") return "Listening (Local Whisper)…";
    if (voiceState === "TRANSCRIBING") return "Transcribing with Whisper M4…";
    if (voiceState === "PROCESSING") return "Processing…";
    if (voiceState === "SPEAKING") return "Speaking (Samantha)…";
    if (chatLoading) return "Thinking…";
    return "Ready · drag header to move";
  })();

  return (
    <div ref={widgetRef} style={wrapperStyle}>
      {/* Trigger button */}
      {!chatOpen && (
        <motion.button
          onDoubleClick={() => setChatOpen(true)}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
          className="group relative flex items-center gap-2 rounded-full border border-horizon/40 bg-gradient-to-br from-horizon to-horizon/70 pl-4 pr-5 py-3 shadow-[0_8px_30px_var(--color-horizon-dim)] cursor-pointer"
          title="FinAI (Double click to open)"
        >
          <span className="absolute inset-0 rounded-full bg-horizon/40 animate-ping opacity-40" />
          <Sparkles className="h-4 w-4 text-[#0f1b33] relative z-10" />
          <span className="font-screamer text-sm tracking-widest text-[#0f1b33] relative z-10">FinAI</span>
          <span
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart(e);
            }}
            className="relative z-10 ml-1 cursor-grab active:cursor-grabbing rounded-full p-1 hover:bg-[#0f1b33]/10"
            title="Drag to move"
          >
            <GripVertical className="h-3.5 w-3.5 text-[#0f1b33]/60" />
          </span>
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-[390px] max-w-[92vw] h-[580px] rounded-2xl border border-horizon/25 bg-paper-raised/95 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden font-editorial"
          >
            {/* Header */}
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className="px-4 py-3 border-b border-line flex justify-between items-center bg-gradient-to-r from-horizon/15 to-transparent cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-horizon/25 text-horizon">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="font-screamer text-base text-ink uppercase leading-none tracking-wide">
                    FinAI
                  </h3>
                  <p className="text-[9px] text-ink-soft mt-0.5">{headerStatus}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Auto-speak toggle */}
                {ttsSupported && (
                  <button
                    onClick={() => {
                      const next = !autoSpeak;
                      setAutoSpeak(next);
                      if (!next) stopSpeaking();
                    }}
                    title={autoSpeak ? "Auto-speak ON (click to mute)" : "Auto-speak OFF (click to enable)"}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      autoSpeak
                        ? "border-horizon/40 bg-horizon/10 text-horizon"
                        : "border-line text-ink-soft hover:text-ink"
                    }`}
                  >
                    {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  </button>
                )}

                <button
                  onClick={() => {
                    setChatOpen(false);
                    stopSpeaking();
                  }}
                  className="text-ink-soft hover:text-ink cursor-pointer p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Voice error banner */}
            <AnimatePresence>
              {voiceError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-2 bg-red-500/10 border-b border-red-400/20 text-[11px] text-red-400 font-editorial flex items-center justify-between"
                >
                  <span>{voiceError}</span>
                  <button
                    onClick={() => setVoiceError("")}
                    className="text-red-400 hover:text-red-300 ml-2 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-ink-soft text-xs px-6 leading-relaxed gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-horizon/20 text-horizon">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p>
                    Ask about budgets, goals, or say{" "}
                    <span className="text-horizon font-semibold">&ldquo;Can I afford a ₹500 dinner?&rdquo;</span>{" "}
                    or{" "}
                    <span className="text-horizon font-semibold">&ldquo;Add ₹200 expense for coffee&rdquo;</span>.
                  </p>
                  <p className="text-[10px] text-ink-soft/70">
                    🎤 Click the microphone for 100% local, offline Whisper voice interaction.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isStreaming={streamingId === msg.id && chatLoading}
                    onReplay={ttsSupported ? handleReplay : null}
                    isSpeaking={speakingMsgId === msg.id && voiceState === "SPEAKING"}
                  />
                ))
              )}

              {/* Quick suggestions when only welcome greeting is present */}
              {messages.length === 1 && messages[0].id === "welcome_greeting" && (
                <div className="pt-1 pb-1 space-y-1.5">
                  <p className="text-[10px] text-ink-soft/70 uppercase tracking-wider font-semibold">
                    Suggested questions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Can I afford a ₹500 dinner?",
                      "Add ₹200 expense for coffee",
                      "How is my spending this month?",
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        type="button"
                        onClick={() => sendMessage(promptText)}
                        className="px-2.5 py-1 text-[11px] rounded-lg border border-line bg-paper text-ink-soft hover:text-ink hover:border-horizon/50 hover:bg-horizon/5 transition-all cursor-pointer text-left"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action confirm card / Consider card */}
              <AnimatePresence>
                {pendingAction && (
                  <ActionCard
                    action={pendingAction.action}
                    onConfirm={handleConfirmAction}
                    onDismiss={() => setPendingAction(null)}
                    confirming={confirming}
                  />
                )}
                {pendingConsider && (
                  <ConsiderCard
                    onAskAnother={handleAskAnotherOption}
                    onDismiss={() => setPendingConsider(null)}
                    disabled={chatLoading}
                  />
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSend} className="p-3 border-t border-line bg-paper space-y-2">
              {/* Recording / Listening State preview */}
              <AnimatePresence>
                {voiceState === "RECORDING" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-400/30"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                    <p className="text-[11px] text-red-400 flex-1 truncate font-medium">
                      {liveTranscript || "Listening (Offline Whisper)… speak now"}
                    </p>
                    <button
                      type="button"
                      onClick={stopRecordingAndTranscribe}
                      className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[10px] font-bold cursor-pointer"
                    >
                      Done
                    </button>
                  </motion.div>
                )}

                {voiceState === "TRANSCRIBING" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-horizon/10 border border-horizon/30"
                  >
                    <Loader2 className="w-3.5 h-3.5 text-horizon animate-spin shrink-0" />
                    <p className="text-[11px] text-horizon flex-1">
                      Transcribing with local Whisper.cpp…
                    </p>
                  </motion.div>
                )}

                {voiceState === "SPEAKING" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/30"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                      <p className="text-[11px] text-emerald-400 font-medium">
                        Speaking response… (Samantha)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      className="text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
                    >
                      <Square className="h-2.5 w-2.5 fill-current" />
                      Stop
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Text input and microphone row */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={chatLoading || voiceState === "TRANSCRIBING"}
                  title={
                    voiceState === "RECORDING"
                      ? "Stop listening & transcribe"
                      : voiceState === "SPEAKING"
                      ? "Stop voice playback"
                      : "Voice input (100% local Whisper)"
                  }
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    voiceState === "RECORDING"
                      ? "bg-red-500/20 text-red-400 border-red-400/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                      : voiceState === "SPEAKING"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-400/50"
                      : chatLoading || voiceState === "TRANSCRIBING"
                      ? "opacity-40 cursor-not-allowed border-line text-ink-soft"
                      : "border-line text-ink-soft hover:border-horizon hover:text-horizon hover:bg-horizon/5"
                  }`}
                >
                  {voiceState === "RECORDING" ? (
                    <MicOff className="h-4 w-4 animate-pulse" />
                  ) : voiceState === "SPEAKING" ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                <input
                  type="text"
                  placeholder={
                    voiceState === "RECORDING"
                      ? "Listening to your voice…"
                      : voiceState === "TRANSCRIBING"
                      ? "Transcribing with Whisper…"
                      : "Ask FinAI or speak with mic…"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={chatLoading || voiceState === "RECORDING" || voiceState === "TRANSCRIBING"}
                  className="flex-1 px-3 py-2.5 bg-paper-raised border border-line rounded-lg text-xs text-ink focus-visible:outline-none focus:border-horizon disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={chatLoading || !input.trim() || voiceState === "RECORDING" || voiceState === "TRANSCRIBING"}
                  className="px-4 bg-horizon text-[#0f1b33] rounded-lg font-screamer text-xs uppercase cursor-pointer disabled:opacity-50 transition-opacity"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
