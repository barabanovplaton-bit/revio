"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  saveOnboarding,
  type Occupation,
  type ReferralSource,
} from "@/lib/user-profile";

interface OnboardingModalProps {
  uid: string;
  defaultName: string;
  onComplete: () => void;
}

const OCCUPATIONS: { value: Occupation; label: string; emoji: string }[] = [
  { value: "web-designer", label: "Веб-дизайнер", emoji: "🎨" },
  { value: "web-dev", label: "Веб-разработчик", emoji: "💻" },
  { value: "card-designer", label: "Дизайнер карточек", emoji: "🃏" },
  { value: "interior-designer", label: "Дизайнер интерьеров", emoji: "🏠" },
  { value: "illustrator", label: "Иллюстратор", emoji: "✏️" },
  { value: "copywriter", label: "Копирайтер", emoji: "📝" },
  { value: "marketer", label: "Маркетолог", emoji: "📈" },
  { value: "short-video-editor", label: "Монтажёр видео", emoji: "🎬" },
  { value: "long-video-editor", label: "Видеоредактор", emoji: "🎥" },
  { value: "other", label: "Другое", emoji: "💼" },
];

const REFERRAL_SOURCES: { value: ReferralSource; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "vk", label: "VK" },
  { value: "telegram", label: "Telegram" },
  { value: "ai", label: "ИИ (ChatGPT и т.д.)" },
  { value: "search", label: "Поиск (Google и т.д.)" },
  { value: "friend", label: "Посоветовал друг" },
  { value: "other", label: "Другое" },
];

export function OnboardingModal({
  uid,
  defaultName,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const [referral, setReferral] = useState<ReferralSource | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!name.trim() || !occupation || !referral) return;
    setSaving(true);
    await saveOnboarding(uid, {
      displayName: name.trim(),
      occupation,
      referralSource: referral,
    });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-page">
      <div className="w-full max-w-md px-4">
        {/* Индикатор шага */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step
                  ? "w-8 bg-text-primary"
                  : "w-4 bg-border-strong"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Шаг 1: Имя */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-2 text-center font-display text-xl font-semibold text-text-primary">
                Как вас зовут?
              </h2>
              <p className="mb-6 text-center text-sm text-text-muted">
                Или кем podemos обращаться
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                autoFocus
                className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => name.trim() && setStep(1)}
                disabled={!name.trim()}
                className="mt-4 h-12 w-full rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              >
                Далее
              </button>
            </motion.div>
          )}

          {/* Шаг 2: Должность */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-2 text-center font-display text-xl font-semibold text-text-primary">
                Чем вы занимаетесь?
              </h2>
              <p className="mb-6 text-center text-sm text-text-muted">
                Выберите основную деятельность
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OCCUPATIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOccupation(o.value)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      occupation === o.value
                        ? "border-text-primary bg-bg-card"
                        : "border-border-strong bg-bg-card hover:border-text-primary/30"
                    }`}
                  >
                    <span className="text-base">{o.emoji}</span>
                    <span className="text-text-primary">{o.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="h-12 flex-1 rounded-xl border border-border-strong bg-bg-input text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => occupation && setStep(2)}
                  disabled={!occupation}
                  className="h-12 flex-1 rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                >
                  Далее
                </button>
              </div>
            </motion.div>
          )}

          {/* Шаг 3: Откуда узнали */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-2 text-center font-display text-xl font-semibold text-text-primary">
                Откуда вы о нас узнали?
              </h2>
              <p className="mb-6 text-center text-sm text-text-muted">
                Это поможет нам стать лучше
              </p>
              <div className="space-y-2">
                {REFERRAL_SOURCES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReferral(r.value)}
                    className={`flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      referral === r.value
                        ? "border-text-primary bg-bg-card"
                        : "border-border-strong bg-bg-card hover:border-text-primary/30"
                    }`}
                  >
                    <span className="text-text-primary">{r.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 flex-1 rounded-xl border border-border-strong bg-bg-input text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={!referral || saving}
                  className="h-12 flex-1 rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                >
                  {saving ? "..." : "Готово"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
