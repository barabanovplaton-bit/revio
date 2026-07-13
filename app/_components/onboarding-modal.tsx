"use client";

import { useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  saveOnboarding,
  type Occupation,
  type ReferralSource,
} from "@/lib/user-profile";
import {
  WebDevIcon,
  WebDesignerIcon,
  CardDesignerIcon,
  InteriorDesignerIcon,
  ShortVideoEditorIcon,
  LongVideoEditorIcon,
  IllustratorIcon,
  CopywriterIcon,
  MarketerIcon,
  OtherIcon,
  YouTubeIcon,
  TikTokIcon,
  VKIcon,
  TelegramIcon,
  InstagramIcon,
  ChatGPTIcon,
  SearchSourceIcon,
  FriendIcon,
} from "./onboarding-icons";

interface OnboardingModalProps {
  uid: string;
  initialName: string | null;
  initialPhoto?: string | null;
  onComplete: (data: {
    displayName: string;
    occupation: Occupation;
    referralSource: ReferralSource;
  }) => void;
  onCancel?: () => void;
}

const OCCUPATIONS: {
  id: Occupation;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "web-dev", label: "Программист сайтов", Icon: WebDevIcon },
  { id: "web-designer", label: "Дизайнер сайтов", Icon: WebDesignerIcon },
  { id: "card-designer", label: "Дизайнер карточек WB", Icon: CardDesignerIcon },
  { id: "interior-designer", label: "Дизайнер интерьеров", Icon: InteriorDesignerIcon },
  { id: "short-video-editor", label: "Монтажёр коротких видео", Icon: ShortVideoEditorIcon },
  { id: "long-video-editor", label: "Монтажёр длинных видео", Icon: LongVideoEditorIcon },
  { id: "illustrator", label: "Иллюстратор", Icon: IllustratorIcon },
  { id: "other", label: "Другое", Icon: OtherIcon },
];

const REFERRALS: {
  id: ReferralSource;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "youtube", label: "YouTube", Icon: YouTubeIcon },
  { id: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { id: "instagram", label: "Instagram", Icon: InstagramIcon },
  { id: "vk", label: "ВКонтакте", Icon: VKIcon },
  { id: "telegram", label: "Telegram", Icon: TelegramIcon },
  { id: "ai", label: "ИИ", Icon: ChatGPTIcon },
  { id: "search", label: "Поисковик", Icon: SearchSourceIcon },
  { id: "friend", label: "Друг посоветовал", Icon: FriendIcon },
  { id: "other", label: "Другое", Icon: OtherIcon },
];

export function OnboardingModal({
  uid,
  initialName,
  initialPhoto,
  onComplete,
  onCancel,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState(initialName || "");
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const [occupationOther, setOccupationOther] = useState("");
  const [referral, setReferral] = useState<ReferralSource | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext =
    step === 1
      ? displayName.trim().length > 0
      : step === 2
        ? occupation !== null && (occupation !== "other" || occupationOther.trim().length > 0)
        : true;

  const handleNext = async () => {
    if (step === 1) {
      if (!displayName.trim()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!occupation) return;
      if (occupation === "other" && !occupationOther.trim()) return;
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
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-page">
      {/* Шапка с кнопкой Назад/Отменить */}
      <div className="shrink-0 px-6 pt-6">
        <div className="mx-auto max-w-2xl">
          {step === 1 ? (
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              ← Отменить
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              ← Назад
            </button>
          )}
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="shrink-0 px-6 pt-4">
        <div className="mx-auto flex max-w-2xl items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-colors duration-300",
                s <= step ? "bg-text-primary" : "bg-border-strong"
              )}
            />
          ))}
        </div>
      </div>

      {/* Контент — БОЛЬШОЙ отступ сверху (pt-24) + по центру */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 pt-24 pb-8">
        <div className="w-full max-w-2xl text-center">
          <AnimatePresence mode="wait">
            {/* Шаг 1: Имя + аватар */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                {initialPhoto && (
                  <div className="mb-6 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={initialPhoto}
                      alt="Аватар"
                      className="h-20 w-20 rounded-full border-2 border-border-strong object-cover"
                    />
                  </div>
                )}
                <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
                  Как вас зовут?
                </h1>
                <p className="mb-8 text-sm text-text-muted">
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
                    "mx-auto block w-full max-w-md rounded-xl border bg-bg-input px-4 py-3 text-center",
                    "text-base text-text-primary placeholder:text-text-muted",
                    "focus:border-border-strong focus:outline-none"
                  )}
                />
              </motion.div>
            )}

            {/* Шаг 2: Кто вы (10 карточек одинакового размера) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="mb-2 text-center font-display text-3xl font-semibold tracking-tight text-text-primary">
                  Кто вы?
                </h1>
                <p className="mb-8 text-center text-sm text-text-muted">
                  Покажем релевантные шаблоны брифов
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {OCCUPATIONS.map((o) => {
                    const isActive = occupation === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setOccupation(o.id)}
                        className={cn(
                          "flex h-28 flex-col items-center justify-center gap-2.5 rounded-xl border px-2 transition-all",
                          isActive
                            ? "border-text-primary bg-bg-card"
                            : "border-border hover:bg-bg-card hover:border-border-strong"
                        )}
                      >
                        <o.Icon
                          className={cn(
                            "h-6 w-6 shrink-0 transition-colors",
                            isActive ? "text-text-primary" : "text-text-muted"
                          )}
                        />
                        <span
                          className={cn(
                            "text-center text-xs font-medium leading-tight",
                            isActive ? "text-text-primary" : "text-text-muted"
                          )}
                        >
                          {o.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {occupation === "other" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    className="mt-4"
                  >
                    <input
                      type="text"
                      value={occupationOther}
                      onChange={(e) => setOccupationOther(e.target.value)}
                      placeholder="Опишите, чем занимаетесь"
                      autoFocus
                      className="block w-full rounded-xl border bg-bg-input px-4 py-3 text-center text-base text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Шаг 3: Откуда узнали (9 карточек, 3x3) */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="mb-2 text-center font-display text-3xl font-semibold tracking-tight text-text-primary">
                  Откуда узнали о нас?
                </h1>
                <p className="mb-8 text-center text-sm text-text-muted">
                  Помогает понять что работает
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  {REFERRALS.map((r) => {
                    const isActive = referral === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReferral(r.id)}
                        className={cn(
                          "flex h-28 flex-col items-center justify-center gap-2.5 rounded-xl border px-2 transition-all",
                          isActive
                            ? "border-text-primary bg-bg-card"
                            : "border-border hover:bg-bg-card hover:border-border-strong"
                        )}
                      >
                        <r.Icon
                          className={cn(
                            "h-6 w-6 shrink-0 transition-colors",
                            isActive ? "text-text-primary" : "text-text-muted"
                          )}
                        />
                        <span
                          className={cn(
                            "text-center text-xs font-medium leading-tight",
                            isActive ? "text-text-primary" : "text-text-muted"
                          )}
                        >
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Кнопка Далее — без бордюра */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={!canNext || saving}
            onClick={handleNext}
            className={cn(
              "w-full rounded-xl px-6 py-3 text-sm font-medium transition-all",
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
