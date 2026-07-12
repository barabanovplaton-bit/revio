"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  saveOnboarding,
  type Occupation,
  type ReferralSource,
} from "@/lib/user-profile";

interface OnboardingModalProps {
  uid: string;
  initialName: string | null;
  onComplete: (data: {
    displayName: string;
    occupation: Occupation;
    referralSource: ReferralSource;
  }) => void;
}

const OCCUPATIONS: { id: Occupation; label: string; emoji: string }[] = [
  { id: "web-dev", label: "Веб-разработчик", emoji: "💻" },
  { id: "designer", label: "Дизайнер", emoji: "🎨" },
  { id: "video-editor", label: "Монтажёр", emoji: "🎬" },
  { id: "tilda", label: "Тильдолог", emoji: "🧩" },
  { id: "other", label: "Другое", emoji: "✨" },
];

const REFERRALS: { id: ReferralSource; label: string; emoji: string }[] = [
  { id: "telegram-channel", label: "Telegram-канал", emoji: "📢" },
  { id: "telegram-chat", label: "Telegram-чат", emoji: "💬" },
  { id: "youtube", label: "YouTube", emoji: "▶️" },
  { id: "other", label: "Другое", emoji: "✨" },
];

export function OnboardingModal({ uid, initialName, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState(initialName || "");
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const [referral, setReferral] = useState<ReferralSource | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext =
    step === 1
      ? displayName.trim().length > 0
      : step === 2
        ? occupation !== null
        : true;

  const handleNext = async () => {
    if (step === 1) {
      if (!displayName.trim()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!occupation) return;
      setStep(3);
      return;
    }
    if (!occupation) return;
    const finalReferral: ReferralSource = referral || "none";
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(uid, {
        displayName: displayName.trim(),
        occupation,
        referralSource: finalReferral,
      });
      onComplete({
        displayName: displayName.trim(),
        occupation,
        referralSource: finalReferral,
      });
    } catch (e) {
      console.error(e);
      setError("Не удалось сохранить. Проверь интернет.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md animate-slide-up rounded-3xl border bg-bg-card p-6 shadow-2xl">
        {/* Прогресс-бар */}
        <div className="mb-6 flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-200",
                s <= step ? "bg-text-primary" : "bg-border-strong"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Шаг 1: Имя */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Как вас зовут?
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                Имя увидит клиент в письмах и ссылках
              </p>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше имя"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canNext) handleNext();
                }}
                className={cn(
                  "w-full rounded-xl border bg-bg-input px-4 py-3",
                  "text-sm text-text-primary placeholder:text-text-muted",
                  "focus:border-border-strong focus:outline-none"
                )}
              />
            </motion.div>
          )}

          {/* Шаг 2: Кто вы */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Кто вы?
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                Покажем релевантные шаблоны брифов
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {OCCUPATIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOccupation(o.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 transition-all",
                      occupation === o.id
                        ? "border-text-primary bg-bg-input"
                        : "border-border hover:bg-bg-input"
                    )}
                  >
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="text-xs font-medium text-text-primary text-center">
                      {o.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Шаг 3: Откуда узнали */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Откуда узнали о нас?
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                Помогает понять что работает
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REFERRALS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReferral(r.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 transition-all",
                      referral === r.id
                        ? "border-text-primary bg-bg-input"
                        : "border-border hover:bg-bg-input"
                    )}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-xs font-medium text-text-primary text-center">
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Кнопки */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              ← Назад
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            disabled={!canNext || saving}
            onClick={handleNext}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
              canNext && !saving
                ? "bg-text-primary text-bg-page hover:opacity-90 active:scale-[0.98]"
                : "cursor-not-allowed bg-border-strong text-text-subtle"
            )}
          >
            {saving ? "Сохраняем..." : step === 3 ? "Продолжить" : "Далее"}
          </button>
        </div>
      </div>
    </div>
  );
}
