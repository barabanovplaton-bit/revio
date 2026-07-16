"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createProject, updateProject } from "@/lib/projects";
import { ImageUploader, UploadedImage } from "./image-uploader";
import { type UploadResult } from "@/lib/cloudinary";

interface NewProjectModalProps {
  open: boolean;
  ownerUid: string;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

const EMOJIS = ["📁", "🎨", "🚀", "💻", "📦", "🎬", "🛍", "🍔", "🏠", "✨"];

export function NewProjectModal({
  open,
  ownerUid,
  onClose,
  onCreated,
}: NewProjectModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Шаг 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [roundsTotal, setRoundsTotal] = useState("3");
  const [limitMessage, setLimitMessage] = useState(
    "Лимит правок исчерпан. Свяжитесь со мной для продления."
  );

  // Шаг 2
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  if (!open) return null;

  const canNext =
    step === 1
      ? name.trim().length > 0 && Number(roundsTotal) > 0
      : imageUrls.length > 0;

  const reset = () => {
    setStep(1);
    setName("");
    setDescription("");
    setEmoji("📁");
    setRoundsTotal("3");
    setLimitMessage(
      "Лимит правок исчерпан. Свяжитесь со мной для продления."
    );
    setImageUrls([]);
    setError(null);
    setProjectId(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleUpload = (result: UploadResult) => {
    setImageUrls((prev) => [...prev, result.url]);
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateProject = async () => {
    setSaving(true);
    setError(null);
    try {
      const id = await createProject(
        {
          name: name.trim(),
          description: description.trim(),
          roundsTotal: Math.max(1, Number(roundsTotal) || 1),
          roundsLeft: Math.max(1, Number(roundsTotal) || 1),
          limitMessage: limitMessage.trim(),
          icon: emoji,
        },
        ownerUid
      );
      setProjectId(id);
      setStep(2);
    } catch (e) {
      console.error(e);
      setError("Не удалось создать проект. Попробуй ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      await updateProject(projectId, { imageUrls });
      reset();
      onCreated(projectId);
    } catch (e) {
      console.error(e);
      setError("Не удалось сохранить изображения. Попробуй ещё раз.");
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
        className="relative w-full max-w-lg animate-slide-up rounded-3xl border border-border-strong bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шаг индикатор */}
        <div className="mb-6 flex items-center gap-1.5">
          {[1, 2].map((s) => (
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
          {/* Шаг 1: Информация */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Новый проект
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                Название и настройки правок
              </p>

              {/* Иконка */}
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Иконка
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
                        : "border-border-strong hover:bg-bg-input"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Название *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Лендинг для кафе"
                autoFocus
                className="mb-4 w-full rounded-xl border border-border-strong bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              />

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Пара слов о проекте"
                rows={2}
                className="mb-4 w-full resize-none rounded-xl border border-border-strong bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              />

              {/* Настройки правок */}
              <div className="rounded-xl border border-dashed border-border-strong bg-bg-input/40 p-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                  Лимит кругов правок
                </label>
                <input
                  type="number"
                  value={roundsTotal}
                  onChange={(e) => setRoundsTotal(e.target.value)}
                  min="1"
                  max="10"
                  className="mb-2 w-full rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
                  Сообщение при исчерпании
                </label>
                <textarea
                  value={limitMessage}
                  onChange={(e) => setLimitMessage(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                />
              </div>
            </motion.div>
          )}

          {/* Шаг 2: Загрузка картинок */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-1 text-xl font-semibold text-text-primary">
                Загрузка картинок
              </h2>
              <p className="mb-5 text-sm text-text-muted">
                Макеты для правок (макс. 5MB)
              </p>

              <div className="space-y-4">
                <ImageUploader
                  onUpload={handleUpload}
                  onError={setError}
                  disabled={saving}
                  maxSize={5}
                />

                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {imageUrls.map((url, index) => (
                      <UploadedImage
                        key={index}
                        url={url}
                        onRemove={() => handleRemoveImage(index)}
                        canRemove={!saving}
                      />
                    ))}
                  </div>
                )}
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
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!canNext || saving}
                className="rounded-xl bg-text-primary px-6 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Создание..." : "Далее"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={saving}
                className="rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={!canNext || saving}
                className="rounded-xl bg-text-primary px-6 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Готово"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
