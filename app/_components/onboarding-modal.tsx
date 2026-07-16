"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  saveOnboarding,
  type Occupation,
  type ReferralSource,
} from "@/lib/user-profile";

interface OnboardingModalProps {
  uid: string;
  defaultName: string;
  email: string | null;
  photoURL: string | null;
  onComplete: () => void;
}

const OCCUPATIONS: {
  value: Occupation;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "web-designer",
    label: "Дизайнер сайтов",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <circle cx="7" cy="6" r="0.5" fill="currentColor" />
        <circle cx="10" cy="6" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "card-designer",
    label: "Дизайнер карточек",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="2" y="5" width="14" height="14" rx="2" />
        <rect x="8" y="2" width="14" height="14" rx="2" />
      </svg>
    ),
  },
  {
    value: "interior-designer",
    label: "Дизайнер интерьеров",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M3 21V8l9-5 9 5v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    value: "illustrator",
    label: "Иллюстратор",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    ),
  },
  {
    value: "video-editor",
    label: "Видеоредактор",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    value: "other",
    label: "Другое",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </svg>
    ),
  },
];

const REFERRAL_SOURCES: {
  value: ReferralSource;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "youtube",
    label: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    ),
  },
  {
    value: "tiktok",
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52V6.94a4.84 4.84 0 0 1-1-.25z" />
      </svg>
    ),
  },
  {
    value: "instagram",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    value: "vk",
    label: "VK",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M21.55 7.04a1 1 0 0 0-1.04-.17c-2.45 1.23-5.07 1.72-7.73 1.46a.85.85 0 0 0-.72.34l-.58.98c-.15.25-.44.34-.7.22-1.46-.67-2.85-1.55-4.1-2.65a.84.84 0 0 0-.86-.2.97.97 0 0 0-.57.52c-.17.45-.18.94-.03 1.39.57 1.7 1.5 3.24 2.71 4.53a.85.85 0 0 0 .64.22c.24-.02.46-.13.6-.33l.78-1.14a.85.85 0 0 1 1.27-.07c.9.77 1.91 1.38 3 1.78a.85.85 0 0 0 1.05-.53c.07-.25.06-.51-.02-.76l-.63-1.94a.85.85 0 0 1 .1-.84c.2-.27.48-.44.78-.52 2.1-.56 3.89-1.62 5.33-3.07a.85.85 0 0 0 .07-1.06z" />
      </svg>
    ),
  },
  {
    value: "telegram",
    label: "Telegram",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.67 3.38a1.78 1.78 0 0 0-1.8-.23L3.3 10.05a1.78 1.78 0 0 0 .08 3.34l.46.15 1.88 6.08a1.28 1.28 0 0 0 2.02.64l2.9-2.2 4.28 3.16a1.78 1.78 0 0 0 2.76-1.08l2.23-10.6a1.78 1.78 0 0 0-1.24-2.1zm-7.8 11.03-1.7 4.84-1.08-3.58 6.5-4.31-3.72 3.05z" />
      </svg>
    ),
  },
  {
    value: "ai",
    label: "ИИ (ChatGPT и т.д.)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M8 14s-4 1-4 4a8 8 0 0 0 16 0c0-3-4-4-4-4" />
        <circle cx="9" cy="8" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="8" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    value: "search",
    label: "Поиск (Google и т.д.)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    value: "friend",
    label: "Посоветовал друг",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    value: "other",
    label: "Другое",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </svg>
    ),
  },
];

export function OnboardingModal({
  uid,
  defaultName,
  email,
  photoURL,
  onComplete,
}: OnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const [otherOccupation, setOtherOccupation] = useState("");
  const [referral, setReferral] = useState<ReferralSource | null>(null);
  const [otherReferral, setOtherReferral] = useState("");
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

  const STEP_LABELS = ["Как вас зовут?", "Чем занимаетесь?", "Откуда узнали?"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-page">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-10 bg-bg-page px-4 pt-4 pb-2">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs text-text-muted transition-colors hover:text-text-primary"
            >
              ← На главную
            </button>
            <span className="text-xs text-text-muted">
              {step + 1} / 3
            </span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-border-strong"
              >
                <motion.div
                  className="absolute inset-y-0 left-0 bg-text-primary"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {/* Шаг 1: Имя */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {/* Аватарка */}
                <div className="mb-6 flex justify-center">
                  {photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoURL}
                      alt="аватар"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
                      style={{
                        backgroundColor: "var(--avatar-bg)",
                        color: "var(--avatar-fg)",
                      }}
                    >
                      {name ? name.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                </div>
                <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                  Как вас зовут?
                </h2>
                {email && (
                  <p className="mb-6 text-center text-xs text-text-muted">
                    {email}
                  </p>
                )}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) setStep(1);
                  }}
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
                transition={{ duration: 0.15 }}
              >
                <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                  Чем вы занимаетесь?
                </h2>
                <p className="mb-6 text-center text-xs text-text-muted">
                  Это поможет подобрать шаблоны
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {OCCUPATIONS.map((o, i) => {
                    const isLastOdd =
                      OCCUPATIONS.length % 2 !== 0 &&
                      i === OCCUPATIONS.length - 1;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setOccupation(o.value)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all ${
                          isLastOdd ? "col-span-2" : ""
                        } ${
                          occupation === o.value
                            ? "border-text-primary bg-bg-card"
                            : "border-border-strong bg-bg-card hover:border-text-primary/30"
                        }`}
                      >
                        <span className="text-text-muted">{o.icon}</span>
                        <span className="text-text-primary">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
                {occupation === "other" && (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    type="text"
                    value={otherOccupation}
                    onChange={(e) => setOtherOccupation(e.target.value)}
                    placeholder="Напишите чем занимаетесь"
                    autoFocus
                    className="mt-2 h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                  />
                )}
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
                transition={{ duration: 0.15 }}
              >
                <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                  Откуда вы о нас узнали?
                </h2>
                <p className="mb-6 text-center text-xs text-text-muted">
                  Это поможет нам стать лучше
                </p>
                <div className="space-y-2">
                  {REFERRAL_SOURCES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReferral(r.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                        referral === r.value
                          ? "border-text-primary bg-bg-card"
                          : "border-border-strong bg-bg-card hover:border-text-primary/30"
                      }`}
                    >
                      <span className="text-text-muted">{r.icon}</span>
                      <span className="text-text-primary">{r.label}</span>
                    </button>
                  ))}
                </div>
                {referral === "other" && (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    type="text"
                    value={otherReferral}
                    onChange={(e) => setOtherReferral(e.target.value)}
                    placeholder="Расскажите подробнее"
                    autoFocus
                    className="mt-2 h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                  />
                )}
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
    </div>
  );
}
