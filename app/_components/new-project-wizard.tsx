"use client";

import { useState } from "react";
import { createProject } from "@/lib/projects";

interface NewProjectWizardProps {
  open: boolean;
  ownerUid: string;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

export function NewProjectWizard({
  open,
  ownerUid,
  onClose,
  onCreated,
}: NewProjectWizardProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setName("");
    setDescription("");
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
          clientName: "",
          clientContact: "",
          roundsTotal: 5,
          roundsLeft: 5,
          limitMessage: "",
          status: "waiting_for_images",
        },
        ownerUid
      );
      onCreated(id);
      reset();
    } catch (e) {
      console.error(e);
      setError("Не удалось создать проект. Попробуй ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-page pb-24">
      <div className="flex w-full max-w-sm flex-col items-center px-6">
        <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
          Новый проект
        </h2>
        <p className="mb-6 text-center text-xs text-text-muted">
          Назовите проект
        </p>

        <label className="mb-1.5 block w-full text-center text-xs font-medium uppercase tracking-wide text-text-muted">
          Название
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Лендинг для кафе"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) handleCreate();
          }}
          className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
        />

        <label className="mb-1.5 mt-4 block w-full text-center text-xs font-medium uppercase tracking-wide text-text-muted">
          Описание (по желанию)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Пара слов о проекте или как связаться"
          rows={3}
          className="w-full resize-none rounded-xl border border-border-strong bg-bg-input px-4 py-3 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
        />

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 inset-x-0 px-6 pb-6 pt-4 bg-bg-page">
        <div className="mx-auto flex max-w-sm gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="h-12 flex-1 rounded-xl border border-border-strong bg-bg-input text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="h-12 flex-1 rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Создание..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
