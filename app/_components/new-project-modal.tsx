"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  createProject,
  PROJECT_TYPE_LABEL,
  type ProjectType,
} from "@/lib/projects";

interface NewProjectModalProps {
  open: boolean;
  ownerUid: string;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

const EMOJIS = ["📁", "🎨", "🚀", "💻", "📦", "🎬", "🛍", "🍔", "🏠", "✨"];

const TYPES: { id: ProjectType; label: string; hint: string }[] = [
  {
    id: "image",
    label: "Изображение / Макет",
    hint: "PNG, JPG — карточки WB, макеты из Figma",
  },
  {
    id: "video",
    label: "Видеоролик",
    hint: "MP4 — монтаж, рилзы, клипы",
  },
  {
    id: "site",
    label: "Живой сайт (URL)",
    hint: "Готовый сайт по ссылке — клиент кликает прямо там",
  },
];

export function NewProjectModal({
  open,
  ownerUid,
  onClose,
  onCreated,
}: NewProjectModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Шаг 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [emoji, setEmoji] = useState("📁");

  // Шаг 2
  const [type, setType] = useState<ProjectType | null>(null);

  // Шаг 3
  const [roundsTotal, setRoundsTotal] = useState("3");
  const [limitMessage, setLimitMessage] = useState(
    "Лимит бесплатных правок исчерпан. Свяжитесь со мной, чтобы продлить."
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const canNext =
    step === 1
      ? name.trim().length > 0
      : step === 2
        ? type !== null
        : Number(roundsTotal) > 0 && limitMessage.trim().length > 0;

  const reset = () => {
    setStep(1);
    setName("");
    setDescription("");
    setClientName("");
    setClientContact("");
    setEmoji("📁");
    setType(null);
    setRoundsTotal("3");
    setLimitMessage(
      "Лимит бесплатных правок исчерпан. Свяжитесь со мной, чтобы продлить."
    );
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!type) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createProject(
        {
          name: name.trim(),
          description: description.trim(),
          clientName: clientName.trim(),
          clientContact: clientContact.trim(),
          type,
          roundsTotal: Math.max(1, Number(roundsTotal) || 1),
          roundsLeft: Math.max(1, Number(roundsTotal) || 1),
          limitMessage: limitMessage.trim(),
          icon: emoji,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg animate-slide-up rounded-3xl border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шаг индикатор */}
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
          {/* Шаг 1: 基本信息 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Основная информация
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                Это увидит только вы — клиенту это не показывается
              </p>

              {/* Иконка */}
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Иконка проекта
              </label>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all",
                      emoji === e
                        ? "border-text-primary bg-bg-input"
                        : "border-border hover:bg-bg-input"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Название проекта *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Лендинг для кафе"
                autoFocus
                className="mb-4 w-full rounded-xl border bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
              />

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Описание (необязательно)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Пара слов о проекте"
                rows={2}
                className="mb-4 w-full resize-none rounded-xl border bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
              />

              {/* Контактные данные заказчика */}
              <div className="mb-2 rounded-xl border border-dashed bg-bg-input/40 p-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                  Контакт заказчика (чтобы не потерять)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Имя заказчика"
                  className="mb-2 w-full rounded-lg border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
                />
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="Телефон / Telegram / Email"
                  className="w-full rounded-lg border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
                />
              </div>
            </motion.div>
          )}

          {/* Шаг 2: Тип проекта */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Тип проекта
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                От этого зависит интерфейс рабочей зоны
              </p>
              <div className="space-y-2">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                      type === t.id
                        ? "border-text-primary bg-bg-input"
                        : "border-border hover:bg-bg-input"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        type === t.id
                          ? "border-text-primary bg-text-primary"
                          : "border-border-strong"
                      )}
                    >
                      {type === t.id && (
                        <div className="h-2 w-2 rounded-full bg-bg-page" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary">
                        {t.label}
                      </div>
                      <div className="text-xs text-text-muted">{t.hint}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Шаг 3: Настройки правок */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Настройки правок
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                Лимит пакетов правок для клиента
              </p>

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Сколько пакетов правок дать клиенту?
              </label>
              <input
                type="number"
                value={roundsTotal}
                onChange={(e) => setRoundsTotal(e.target.value)}
                min={1}
                max={20}
                className="no-spinners mb-1 w-full rounded-xl border bg-bg-input px-4 py-2.5 text-sm text-text-primary focus:border-border-strong focus:outline-none"
              />
              <p className="mb-4 text-xs text-text-muted">
                Каждый раз когда клиент нажимает «Отправить пакет правок» —
                списывается 1 пакет
              </p>

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Сообщение клиенту при исчерпании лимита
              </label>
              <textarea
                value={limitMessage}
                onChange={(e) => setLimitMessage(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border bg-bg-input px-4 py-2.5 text-sm text-text-primary focus:border-border-strong focus:outline-none"
              />
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
              disabled={saving}
              className="text-sm text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
            >
              ← Назад
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="text-sm text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
            >
              Отмена
            </button>
          )}

          <button
            type="button"
            disabled={!canNext || saving}
            onClick={step === 3 ? handleCreate : () => setStep((s) => (s + 1) as 1 | 2 | 3)}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
              canNext && !saving
                ? "bg-text-primary text-bg-page hover:opacity-90 active:scale-[0.98]"
                : "cursor-not-allowed bg-border-strong text-text-subtle"
            )}
          >
            {saving
              ? "Создаём..."
              : step === 3
                ? "Создать проект"
                : "Далее"}
          </button>
        </div>
      </div>
    </div>
  );
}
