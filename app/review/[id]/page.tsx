"use client";

import { useState, useEffect, use } from "react";
import { getProject, updateProject } from "@/lib/projects";
import { MarkerCanvas } from "@/app/_components/marker-canvas";
import { createNotification } from "@/lib/notifications";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

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

  const handleSubmitRevisions = async () => {
    if (!project) return;
    setIsSubmitting(true);
    try {
      const newRoundsLeft = Math.max(0, project.roundsLeft - 1);
      await updateProject(project.id, {
        isLocked: true,
        roundsLeft: newRoundsLeft,
        status: newRoundsLeft === 0 ? "exhausted" : "in_progress",
      });

      await createNotification({
        ownerUid: project.ownerUid,
        projectId: project.id,
        projectName: project.name,
        type: "revisions_submitted",
        message: `Клиент отправил правки по проекту «${project.name}» (круг ${project.currentRound})`,
      });

      setShowSubmitConfirm(false);
      setJustSubmitted(true);
      const updated = await getProject(id);
      setProject(updated);
    } catch (error) {
      console.error("Failed to submit revisions:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  // Error / not found
  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p className="text-text-muted">{error || "Проект не найден"}</p>
        </div>
      </div>
    );
  }

  // No images uploaded yet
  if (project.status === "waiting_for_images" || !project.imageUrls || project.imageUrls.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">
            {project.name}
          </h1>
          <p className="text-text-muted">
            Макеты ещё не загружены. Фрилансер готовит проект.
          </p>
        </div>
      </div>
    );
  }

  // Client just submitted — thank you screen
  if (justSubmitted || (project.isLocked && project.roundsLeft >= 0)) {
    const isExhausted = project.status === "exhausted" || project.roundsLeft <= 0;
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <svg className="h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">
            {justSubmitted ? "Спасибо!" : isExhausted ? "Лимит правок исчерпан" : "Правки отправлены"}
          </h1>
          <p className="text-sm text-text-muted">
            {justSubmitted
              ? "Ваши правки отправлены фрилансеру. Ожидайте обновлённую версию."
              : isExhausted
                ? project.limitMessage || "Все круги правок использованы. Свяжитесь с фрилансером для обсуждения."
                : "Фрилансер вносит правки. Ссылка станет активной после загрузки новой версии."}
          </p>
          {isExhausted && (
            <p className="mt-4 text-xs text-text-muted">
              Проект: {project.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Active state — show MarkerCanvas
  return (
    <div className="flex h-screen flex-col bg-bg-page">
      <header className="flex items-center justify-between border-b border-border-strong bg-bg-card px-4 py-3">
        <div>
          <h1 className="font-semibold text-text-primary">{project.name}</h1>
          <p className="text-xs text-text-muted">
            Круг {project.currentRound}/{project.roundsTotal}
            {project.roundsLeft > 0 && ` · осталось ${project.roundsLeft}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-2 rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
            <span className="hidden sm:inline">Отправить правки</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <MarkerCanvas
          imageUrls={project.imageUrls}
          projectId={project.id}
          round={project.currentRound}
          isLocked={false}
        />
      </main>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-strong rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Отправить правки?
            </h2>
            <p className="text-sm text-text-muted mb-2">
              Фрилансер получит уведомление и увидит ваши метки.
            </p>
            {project.roundsLeft <= 1 && (
              <p className="text-sm text-yellow-400 mb-4">
                Это последний круг правок. Дальнейшие правки будут невозможны.
              </p>
            )}
            {project.roundsLeft > 1 && (
              <p className="text-xs text-text-muted mb-4">
                Останется {project.roundsLeft - 1} {project.roundsLeft - 1 === 1 ? "круг" : "кругов"} правок.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmitRevisions}
                disabled={isSubmitting}
                className="rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
