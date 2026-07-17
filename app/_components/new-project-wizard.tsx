"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createProject } from "@/lib/projects";
import {
  PROJECT_COLORS,
  PROJECT_ICONS,
  ProjectIcon,
} from "@/lib/project-icons";

interface NewProjectWizardProps {
  open: boolean;
  ownerUid: string;
  userPlan: "free" | "pro";
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

export function NewProjectWizard({
  open,
  ownerUid,
  userPlan,
  onClose,
  onCreated,
}: NewProjectWizardProps) {
  const [step, setStep] = useState(0);
  const [color, setColor] = useState(PROJECT_COLORS[0]);
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
    setColor(PROJECT_COLORS[0]);
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
          iconIndex: selectedIcon,
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
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl transition-colors">
                    <ProjectIcon
                      index={selectedIcon}
                      color={color}
                      className="h-12 w-12"
                    />
                  </div>
                </div>

                {/* Палитра цветов */}
                <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted">
                  Цвет
                </p>
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {PROJECT_COLORS.map((c) => (
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
                  {PROJECT_ICONS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedIcon(i)}
                      className={`flex h-12 items-center justify-center rounded-xl border transition-all ${
                        selectedIcon === i
                          ? "border-text-primary bg-bg-card"
                          : "border-border-strong bg-bg-card hover:border-text-primary/30"
                      }`}
                    >
                      <ProjectIcon
                        index={i}
                        color={color}
                        className="h-6 w-6"
                      />
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
                    <ProjectIcon
                      index={selectedIcon}
                      color={color}
                      className="h-10 w-10 shrink-0"
                    />
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
