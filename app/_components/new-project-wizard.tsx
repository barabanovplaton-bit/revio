"use client";

import { useState } from "react";
import { createProject, getMaxRoundsForPlan } from "@/lib/projects";

interface NewProjectWizardProps {
  open: boolean;
  ownerUid: string;
  plan?: "free" | "pro";
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

export function NewProjectWizard({
  open,
  ownerUid,
  plan = "free",
  onClose,
  onCreated,
}: NewProjectWizardProps) {
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const maxRounds = getMaxRoundsForPlan(plan);
  const isPro = plan === "pro";

  const reset = () => {
    setName("");
    setRounds(5);
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
          description: "",
          clientName: "",
          clientContact: "",
          roundsTotal: rounds,
          roundsLeft: rounds,
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

  const changeRounds = (delta: number) => {
    setRounds((p) => {
      const next = p + delta;
      if (isPro) return Math.max(1, Math.min(100, next));
      return Math.max(1, Math.min(maxRounds, next));
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-page pb-24">
      <div className="flex w-full max-w-sm flex-col items-center px-6">
        <h2 className="mb-1 text-center font-display text-xl font-semibold text-text-primary">
          Новый проект
        </h2>
        <p className="mb-6 text-center text-xs text-text-muted">
          Назовите проект и выберите, сколько раундов правок будет
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
        <p className="mt-1.5 text-center text-[11px] text-text-muted">
          Имя видно только вам — клиент видит правки, а не название проекта
        </p>

        <label className="mb-1.5 mt-6 block w-full text-center text-xs font-medium uppercase tracking-wide text-text-muted">
          Раунды правок
        </label>
        <div className="flex w-full items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => changeRounds(-1)}
            disabled={rounds <= 1}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-bg-input text-lg font-bold text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30"
          >
            −
          </button>
          <span className="w-12 text-center text-2xl font-semibold text-text-primary">
            {rounds}
          </span>
          <button
            type="button"
            onClick={() => changeRounds(1)}
            disabled={!isPro && rounds >= maxRounds}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-bg-input text-lg font-bold text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30"
          >
            +
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-text-muted">
          {isPro
            ? "Pro: раунды без ограничения"
            : `Бесплатный тариф: максимум ${maxRounds} раундов на проект`}
        </p>

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
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg-page/40 border-t-bg-page" />
                Создание...
              </span>
            ) : (
              "Создать"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
