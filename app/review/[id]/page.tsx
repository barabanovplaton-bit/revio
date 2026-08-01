"use client";

import { useState, useEffect, use } from "react";
import {
  getProject,
  updateProject,
  hasRoundsLeft,
  type Project,
} from "@/lib/projects";
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
  const [showDoneModal, setShowDoneModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getProject(id);
        if (cancelled) return;
        if (!p) {
          setError("Проект не найден");
        } else {
          setProject(p);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить проект");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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

  const locked = !hasRoundsLeft(project) || project.status === "exhausted";

  const handleDone = async () => {
    try {
      await updateProject(project.id, { clientSubmitted: true });
    } catch (e) {
      console.error(e);
    }
    setShowDoneModal(true);
  };

  return (
    <div className="flex h-screen flex-col bg-bg-page">
      <header className="flex items-center justify-between border-b border-border-strong bg-bg-card px-4 py-3">
        <div>
          <h1 className="font-semibold text-text-primary">{project.name}</h1>
          <p className="text-xs text-text-muted">
            Раунд {project.currentRound || 1} · осталось раундов:{" "}
            {project.roundsLeft ?? 0}
            {locked ? " · правки закрыты" : " · нажмите на картинку, чтобы оставить правку"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDone}
          className="shrink-0 rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Готово
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        <MarkerCanvas
          imageUrls={project.imageUrls}
          projectId={project.id}
          round={project.currentRound || 1}
          isLocked={locked}
        />
      </main>

      {locked && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <div className="pointer-events-auto max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400 backdrop-blur-sm">
            Раунды правок в этом проекте исчерпаны. Свяжитесь с фрилансером, чтобы продолжить.
          </div>
        </div>
      )}

      {showDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-text-primary/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-text-primary">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">Правки отправлены!</h2>
            <p className="mb-6 text-sm text-text-muted">
              Дизайнер получит уведомление и пришлёт исправленную версию. Ты можешь вернуться позже и добавить правки.
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
