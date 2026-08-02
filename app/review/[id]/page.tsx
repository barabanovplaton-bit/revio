"use client";

import { useState, useEffect, use } from "react";
import {
  subscribeToProject,
  updateProject,
  hasRoundsLeft,
  type Project,
} from "@/lib/projects";
import { createMarkers } from "@/lib/markers";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  notifyDraftChanged,
  newDraftId,
} from "@/lib/review-draft";
import { MarkerCanvas } from "@/app/_components/marker-canvas";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [sending, setSending] = useState(false);

  const [showDoneModal, setShowDoneModal] = useState(false);
  const [emptyDraftOpen, setEmptyDraftOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [generalOpen, setGeneralOpen] = useState(false);
  const [generalText, setGeneralText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeToProject(id, (p) => {
      if (cancelled) return;
      if (!p) {
        setError("Проект не найден");
      } else {
        setProject(p);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  // Количество черновиков в заголовке
  useEffect(() => {
    const upd = () => setDraftCount(loadDraft(id).length);
    upd();
    window.addEventListener("revio:draft-changed", upd);
    return () => window.removeEventListener("revio:draft-changed", upd);
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          <p className="text-text-muted">{error || "Проект не найден"}</p>
        </div>
      </div>
    );
  }

  // No images yet
  if (!project.imageUrls || project.imageUrls.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">{project.name}</h1>
          <p className="text-text-muted">Не переживайте, фрилансер скоро загрузит макеты.</p>
        </div>
      </div>
    );
  }

  const submitted = !!project.clientSubmitted;
  const locked =
    !hasRoundsLeft(project) || project.status === "exhausted" || submitted;
  const round = project.currentRound || 1;

  const handleDoneClick = () => {
    if (locked) return;
    const count = loadDraft(id).length;
    if (count === 0) {
      setEmptyDraftOpen(true);
      return;
    }
    setSendConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    if (sending) return;
    const items = loadDraft(id);
    if (items.length === 0) return;
    setSending(true);
    try {
      await createMarkers(
        items.map((d) => ({
          projectId: id,
          round,
          type: d.type,
          x: d.x,
          y: d.y,
          imageIndex: d.imageIndex,
          text: d.text,
        }))
      );
      await updateProject(id, { clientSubmitted: true });
      clearDraft(id);
      setSendConfirmOpen(false);
      setShowDoneModal(true);
    } catch (e) {
      console.error("Failed to send draft:", e);
    } finally {
      setSending(false);
    }
  };

  const addGeneral = () => {
    const text = generalText.trim();
    if (!text) return;
    const items = loadDraft(id);
    const order =
      items.reduce((m, d) => Math.max(m, d.order), 0) + 1;
    saveDraft(id, [
      ...items,
      { id: newDraftId(), type: "general", text, order },
    ]);
    notifyDraftChanged();
    setGeneralText("");
    setGeneralOpen(false);
  };

  return (
    <div className="flex h-screen flex-col bg-bg-page">
      <header className="flex items-center justify-between gap-3 border-b border-border-strong bg-bg-card px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-text-primary">
            {project.name}
          </h1>
          <p className="text-xs text-text-muted">
            Раунд {round} · осталось раундов: {project.roundsLeft ?? 0}
            {locked
              ? submitted
                ? " · правки отправлены"
                : " · правки закрыты"
              : " · нажмите на картинку, чтобы добавить правку"}
          </p>
        </div>
        {locked ? (
          <span className="shrink-0 rounded-xl bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400">
            {submitted ? "Правки отправлены" : "Правки закрыты"}
          </span>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setGeneralOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-text-primary/40 bg-text-primary/10 px-3 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-text-primary/20"
              title="Добавить общий комментарий"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Общий комментарий
            </button>
            <button
              type="button"
              onClick={handleDoneClick}
              className="rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Готово{draftCount > 0 ? ` (${draftCount})` : ""}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        <MarkerCanvas
          imageUrls={project.imageUrls}
          projectId={id}
          round={round}
          isLocked={locked}
        />
      </main>

      {locked && !submitted && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <div className="pointer-events-auto max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400 backdrop-blur-sm">
            Раунды правок в этом проекте исчерпаны. Свяжитесь с фрилансером, чтобы продолжить.
          </div>
        </div>
      )}

      {locked && submitted && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <div className="pointer-events-auto max-w-md rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center text-sm text-green-400 backdrop-blur-sm">
            Правки отправлены дизайнеру. Когда начнётся новый раунд, вы снова сможете их добавить.
          </div>
        </div>
      )}

      {/* Подтверждение отправки пакета */}
      {sendConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-text-primary">
              Отправить {draftCount} {draftCount === 1 ? "правку" : draftCount > 0 && draftCount < 5 ? "правки" : "правок"} дизайнеру?
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-text-muted">
              Это будет пакет правок раунда {round}. После отправки вы не сможете их изменить
              до следующего раунда.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSendConfirmOpen(false)}
                disabled={sending}
                className="flex-1 rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={sending}
                className="flex-1 rounded-xl bg-text-primary px-4 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Правок ещё нет */}
      {emptyDraftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-text-primary">
              Правок пока нет
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-text-muted">
              Добавьте хотя бы одну правку на макетах, затем нажмите «Готово».
            </p>
            <button
              type="button"
              onClick={() => setEmptyDraftOpen(false)}
              className="w-full rounded-xl bg-text-primary px-4 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Общий комментарий */}
      {generalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                Общий комментарий
              </h2>
              <button
                type="button"
                onClick={() => {
                  setGeneralOpen(false);
                  setGeneralText("");
                }}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={generalText}
              onChange={(e) => setGeneralText(e.target.value)}
              placeholder="Опишите общие правки..."
              rows={4}
              autoFocus
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addGeneral}
                disabled={!generalText.trim()}
                className="rounded-xl bg-text-primary px-5 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Правки отправлены */}
      {showDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-text-primary/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-text-primary">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">Правки отправлены!</h2>
            <p className="mb-6 text-sm leading-relaxed text-text-muted">
              Дизайнер получит уведомление и пришлёт исправленную версию.
            </p>
            <button
              type="button"
              onClick={() => setShowDoneModal(false)}
              className="w-full rounded-xl bg-text-primary px-4 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
