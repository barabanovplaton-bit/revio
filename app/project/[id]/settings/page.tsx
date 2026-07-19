"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { subscribeToAuth, type User } from "@/lib/auth";
import {
  getProject,
  updateProject,
  toggleArchive,
  deleteProject,
  addExtraRounds,
  type Project,
} from "@/lib/projects";
import { ConfirmModal } from "@/app/_components/confirm-modal";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [roundsTotal, setRoundsTotal] = useState(3);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [confirmExtraRounds, setConfirmExtraRounds] = useState(false);
  const [extraRoundsCount, setExtraRoundsCount] = useState(1);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const hasFirstPackage =
    project && project.imageUrls && project.imageUrls.length > 0;
  const usedRounds = project
    ? project.roundsTotal - project.roundsLeft
    : 0;

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const p = await getProject(id);
      if (cancelled) return;
      if (!p) {
        router.push("/");
        return;
      }
      setProject(p);
      setName(p.name);
      setDescription(p.description || "");
      setClientName(p.clientName || "");
      setClientContact(p.clientContact || "");
      setRoundsTotal(p.roundsTotal);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, user, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const update: Partial<Project> = {
        name: name.trim(),
        description: description.trim(),
        clientName: clientName.trim(),
        clientContact: clientContact.trim(),
      };

      if (project && roundsTotal !== project.roundsTotal && !hasFirstPackage) {
        const newLeft = Math.max(0, roundsTotal - usedRounds);
        update.roundsTotal = roundsTotal;
        update.roundsLeft = newLeft;

        if (project.status === "exhausted" && newLeft > 0) {
          update.status = "in_progress";
          update.isLocked = false;
        }
      }

      await updateProject(id, update);
      showToast("Сохранено");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExtraRounds = async () => {
    setConfirmExtraRounds(false);
    await addExtraRounds(id, extraRoundsCount);
    const p = await getProject(id);
    if (p) {
      setProject(p);
      setRoundsTotal(p.roundsTotal);
    }
    showToast("Добавлено " + extraRoundsCount + " доп. кругов");
  };

  const handleDelete = async () => {
    await deleteProject(id);
    router.push("/");
  };

  const handleArchive = async () => {
    if (!project) return;
    await toggleArchive(id, !project.archived);
    setConfirmArchive(false);
    showToast(project.archived ? "Восстановлено" : "В архиве");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-4 py-3 shadow-lg">
          <button type="button" onClick={() => router.push("/project/" + id)} className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-text-primary">Настройки проекта</h1>
        </header>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Название
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Описание
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Пара слов о проекте" rows={3} className="w-full resize-none rounded-xl border border-border-strong bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Имя клиента
            </label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Имя клиента" className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Контакт клиента
            </label>
            <input type="text" value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Email, Telegram, WhatsApp..." className="h-12 w-full rounded-xl border border-border-strong bg-bg-input px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none" />
          </div>

          {/* Rounds */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Круги правок
            </label>

            {hasFirstPackage ? (
              <div className="rounded-xl border border-border-strong bg-bg-card p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border-strong bg-bg-input">
                    <span className="font-display text-xl font-bold text-text-primary">{roundsTotal}</span>
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  Основные: {roundsTotal - (project?.extraRoundsAdded || 0)} &middot; Доп: {project?.extraRoundsAdded || 0} &middot; Использовано: {usedRounds}
                </p>
                <p className="mt-2 text-xs text-yellow-400">Круги нельзя изменить после начала проекта</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setRoundsTotal(Math.max(1, roundsTotal - 1))} disabled={roundsTotal <= 1} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-bg-input text-lg font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30">&minus;</button>
                  <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border-strong bg-bg-card">
                    <span className="font-display text-xl font-bold text-text-primary">{roundsTotal}</span>
                  </div>
                  <button type="button" onClick={() => setRoundsTotal(Math.min(5, roundsTotal + 1))} disabled={roundsTotal >= 5} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-bg-input text-lg font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30">+</button>
                </div>
                <p className="mt-1.5 text-xs text-text-muted">Можно менять только до загрузки первого пакета</p>
              </div>
            )}

            {/* Extra rounds */}
            <div className="mt-3 rounded-xl border border-dashed border-border-strong bg-bg-input/30 p-3">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-muted">Дополнительные круги</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setExtraRoundsCount(Math.max(1, extraRoundsCount - 1))} disabled={extraRoundsCount <= 1} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-bg-input text-base font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30">&minus;</button>
                <div className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong bg-bg-card">
                  <span className="font-display text-xl font-bold text-text-primary">{extraRoundsCount}</span>
                </div>
                <button type="button" onClick={() => setExtraRoundsCount(Math.min(10, extraRoundsCount + 1))} disabled={extraRoundsCount >= 10} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-bg-input text-base font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-30">+</button>
                <button type="button" onClick={() => setConfirmExtraRounds(true)} className="h-10 rounded-lg bg-text-primary px-4 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]">Добавить</button>
              </div>
              <p className="mt-1.5 text-xs text-text-muted">Можно добавить в любой момент. Основные круги не меняются.</p>
            </div>

            {/* Save button */}
            <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="h-12 w-full rounded-xl bg-text-primary text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-8 space-y-3">
            <button type="button" onClick={() => setConfirmArchive(true)} className="h-12 w-full rounded-xl border border-border-strong bg-bg-input text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover">
              {project?.archived ? "Восстановить из архива" : "В архив"}
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="h-12 w-full rounded-xl border border-red-500/50 bg-red-500/10 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20">
              Удалить проект
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal open={confirmDelete} title="Удалить проект?" message="Проект будет удалён навсегда. Это действие нельзя отменить." confirmLabel="Удалить" danger onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
      <ConfirmModal open={confirmArchive} title={project?.archived ? "Восстановить проект?" : "Архивировать проект?"} message={project?.archived ? "Проект будет возвращён в основной список." : "Проект будет перемещён в архив."} confirmLabel={project?.archived ? "Восстановить" : "Архивировать"} onConfirm={handleArchive} onCancel={() => setConfirmArchive(false)} />
      <ConfirmModal open={confirmExtraRounds} title="Добавить дополнительные правки?" message={"Будет добавлено "+extraRoundsCount+" дополнительных кругов правок. Основные круги не меняются."} confirmLabel="Добавить" onConfirm={handleAddExtraRounds} onCancel={() => setConfirmExtraRounds(false)} />

      <div className="fixed bottom-0 inset-x-0 flex justify-center pb-6 pointer-events-none">
        <div className={"rounded-xl border border-border-strong bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-xl transition-all duration-300 " + (toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          {toast}
        </div>
      </div>
    </div>
  );
}
