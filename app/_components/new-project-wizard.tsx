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

export function NewProjectWizard({
  open,
  ownerUid,
  userPlan,
  onClose,
  onCreated,
}: NewProjectWizardProps) {
  const [step, setStep] = useState(0);
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
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-bg-page">
      <div className="flex min-h-0 w-full max-w-md flex-1 flex-col items-center overflow-y-auto px-6 pt-10 pb-4">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
            >
              <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                Новый проект
              </h2>
              <p className="mb-6 text-center text-xs text-text-muted">
                Назовите проект
              </p>

              <label className="mb-1.5 block text-center text-xs font-medium uppercase tracking-wide text-text-muted">
                Название
              </label>
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

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
            >
              <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
                Описание и клиент
              </h2>
              <p className="mb-6 text-center text-xs text-text-muted">
                Расскажите о проекте
              </p>

              <label className="mb-1.5 block text-center text-xs font-medium uppercase tracking-wide text-text-muted">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Пара слов о проекте"
                rows={3}
                className="mb-4 w-full resize-none rounded-xl border border-border-strong bg-bg-input px-4 py-3 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              />

              <label className="mb-1.5 block text-center text-xs font-medium uppercase tracking-wide text-text-muted">
                Имя клиента
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Например: Иван Олегович"
                className="mb-4 h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              />

              <label className="mb-1.5 block text-center text-xs font-medium uppercase tracking-wide text-text-muted">
                Контакт клиента
              </label>
              <input
                type="text"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="Email, Telegram, WhatsApp..."
                className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
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

              <div className="rounded-xl border border-border-strong bg-bg-card p-4">
                <div className="text-center text-sm font-medium text-text-primary">
                  {name || "Без названия"}
                </div>
                <div className="text-center text-xs text-text-muted">
                  {rounds}{" "}
                  {rounds === 1
                    ? "круг"
                    : rounds < 5
                      ? "круга"
                      : "кругов"}{" "}
                  правок
                </div>
                {description && (
                  <p className="mt-2 text-center text-xs text-text-muted line-clamp-2">
                    {description}
                  </p>
                )}
                {clientName && (
                  <div className="mt-1 text-center text-xs text-text-muted">
                    {clientName}
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 bg-bg-page px-6 py-4">
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
