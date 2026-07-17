"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createProject } from "@/lib/projects";

interface NewProjectWizardProps {
  open: boolean;
  ownerUid: string;
  userPlan: "free" | "pro";
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

const COLORS = [
  "#E880FC",
  "#F87171",
  "#FB923C",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#C084FC",
  "#F472B6",
  "#94A3B8",
  "#FFFFFF",
];

const PROJECT_ICONS: {
  label: string;
  svg: React.ReactNode;
}[] = [
  {
    label: "Дизайн",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="10.5" r="2.5" />
        <circle cx="8.5" cy="7.5" r="2.5" />
        <circle cx="6.5" cy="12" r="2.5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
  },
  {
    label: "Веб-сайт",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 21l4-4 4 4" />
      </svg>
    ),
  },
  {
    label: "Мобильное",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    label: "Интерьер",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M3 21V8l9-5 9 5v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    label: "Иллюстрация",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    ),
  },
  {
    label: "Фото",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
  },
  {
    label: "Брендинг",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    label: "Видео",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
        <rect x="2" y="6" width="14" height="12" rx="2" />
      </svg>
    ),
  },
  {
    label: "Маркетинг",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    label: "Упаковка",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    label: "Другое",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  {
    label: "Пиар",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export function NewProjectWizard({
  open,
  ownerUid,
  userPlan,
  onClose,
  onCreated,
}: NewProjectWizardProps) {
  const [step, setStep] = useState(0);
  const [color, setColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [rounds, setRounds] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxRounds = userPlan === "pro" ? 999 : 5;

  if (!open) return null;

  const reset = () => {
    setStep(0);
    setColor(COLORS[0]);
    setSelectedIcon(0);
    setName("");
    setDescription("");
    setClientName("");
    setClientContact("");
    setRounds(3);
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const icon = PROJECT_ICONS[selectedIcon];
      const id = await createProject(
        {
          name: name.trim(),
          description: description.trim(),
          clientName: clientName.trim(),
          clientContact: clientContact.trim(),
          roundsTotal: rounds,
          roundsLeft: rounds,
          limitMessage:
            "Лимит правок исчерпан. Свяжитесь со мной для продления.",
          icon: icon.label,
          iconColor: color,
          status: "waiting_for_images",
        },
        ownerUid
      );
      reset();
      onCreated(id);
    } catch (e) {
      console.error(e);
      setError("Не удалось создать проект. Попробуй ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-page">
      {/* Content — scrollable */}
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 pt-6 pb-4">
        <div className="w-full max-w-md pb-2">
          <AnimatePresence mode="wait">
            {/* Шаг 1: Цвет + Иконка + Название */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                  Новый проект
                </h2>
                <p className="mb-5 text-center text-xs text-text-muted">
                  Выберите цвет и иконку
                </p>

                {/* Выбранная иконка — большая */}
                <div className="mb-4 flex justify-center">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl transition-colors"
                    style={{ color }}
                  >
                    {PROJECT_ICONS[selectedIcon].svg}
                  </div>
                </div>

                {/* Палитра цветов */}
                <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted">
                  Цвет
                </p>
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        color === c
                          ? "scale-110 border-text-primary"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Сетка иконок */}
                <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted">
                  Иконка
                </p>
                <div className="mb-5 grid grid-cols-6 gap-2">
                  {PROJECT_ICONS.map((icon, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedIcon(i)}
                      className={`flex h-12 items-center justify-center rounded-xl border transition-all ${
                        selectedIcon === i
                          ? "border-text-primary bg-bg-card"
                          : "border-border-strong bg-bg-card hover:border-text-primary/30"
                      }`}
                      style={{ color }}
                    >
                      {icon.svg}
                    </button>
                  ))}
                </div>

                {/* Название */}
                <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted">
                  Название *
                </p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Название проекта"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) setStep(1);
                  }}
                  className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />
              </motion.div>
            )}

            {/* Шаг 2: Описание + клиент */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                  Описание и клиент
                </h2>
                <p className="mb-6 text-center text-xs text-text-muted">
                  Расскажите о проекте
                </p>

                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Пара слов о проекте"
                  rows={3}
                  className="mb-4 w-full resize-none rounded-xl border border-border-strong bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />

                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                  Имя клиента
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Например: Иван Олегович"
                  className="mb-4 h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />

                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                  Контакт клиента
                </label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="Email, Telegram, WhatsApp..."
                  className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />
              </motion.div>
            )}

            {/* Шаг 3: Круги + Превью */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                  Круги правок
                </h2>
                <p className="mb-6 text-center text-xs text-text-muted">
                  Сколько раундов правок доступно клиенту
                </p>

                <div className="mb-6 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setRounds(Math.max(1, rounds - 1))}
                    disabled={rounds <= 1}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-strong bg-bg-input text-lg font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30"
                  >
                    −
                  </button>
                  <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-border-strong bg-bg-card">
                    <span className="font-display text-3xl font-bold text-text-primary">
                      {rounds}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRounds(Math.min(maxRounds, rounds + 1))}
                    disabled={rounds >= maxRounds}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-strong bg-bg-input text-lg font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                {userPlan === "free" && (
                  <p className="mb-4 text-center text-xs text-text-muted">
                    Free: макс. 5 кругов.{" "}
                    <a
                      href="/pricing"
                      className="underline hover:text-text-primary"
                    >
                      Обновить до Pro
                    </a>
                  </p>
                )}

                {/* Превью проекта */}
                <div className="rounded-xl border border-border-strong bg-bg-card p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ color }}
                    >
                      {PROJECT_ICONS[selectedIcon].svg}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {name || "Без названия"}
                      </div>
                      <div className="text-xs text-text-muted">
                        {rounds}{" "}
                        {rounds === 1
                          ? "круг"
                          : rounds < 5
                            ? "круга"
                            : "кругов"}{" "}
                        правок
                      </div>
                    </div>
                  </div>
                  {description && (
                    <p className="mb-2 text-xs text-text-muted line-clamp-2">
                      {description}
                    </p>
                  )}
                  {clientName && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {clientName}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="shrink-0 bg-bg-page px-4 py-4">
        <div className="mx-auto flex max-w-md gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={saving}
              className="h-12 flex-1 rounded-xl border border-border-strong bg-bg-input text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-40"
            >
              Назад
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="h-12 flex-1 rounded-xl border border-border-strong bg-bg-input text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-40"
            >
              Отмена
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !name.trim()}
              className="h-12 flex-1 rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="h-12 flex-1 rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? "Создание..." : "Создать"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
