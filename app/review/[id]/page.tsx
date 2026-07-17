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
    return () => {
      cancelled = true;
    };
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
        message: `Клиент отправил правки по проекту «${project.name}»`,
      });

      setShowSubmitConfirm(false);
      const updated = await getProject(id);
      setProject(updated);
    } catch (error) {
      console.error("Failed to submit revisions:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p className="text-text-muted">{error || "Проект не найден"}</p>
        </div>
      </div>
    );
  }

  if (project.roundsLeft <= 0 && project.isLocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">
            Лимит правок исчерпан
          </h1>
          <p className="text-text-muted">
            {project.limitMessage ||
              "Свяжитесь с фрилансером для обсуждения дальнейших правок."}
          </p>
        </div>
      </div>
    );
  }

  if (project.isLocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">
            Проект заблокирован
          </h1>
          <p className="text-text-muted">
            Фрилансер вносит правки. Ссылка станет активной после загрузки
            новой версии.
          </p>
        </div>
      </div>
    );
  }

  if (project.roundsLeft <= 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">
            Лимит правок исчерпан
          </h1>
          <p className="text-text-muted">
            {project.limitMessage ||
              "Свяжитесь с фрилансером для обсуждения дальнейших правок."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg-page">
      <header className="flex items-center justify-between border-b border-border-strong bg-bg-card px-4 py-3">
        <div>
          <h1 className="font-semibold text-text-primary">{project.name}</h1>
          <p className="text-xs text-text-muted">
            Круг правок: {project.currentRound}/{project.roundsTotal} (осталось{" "}
            {project.roundsLeft})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-2 rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
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
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
            <span className="hidden sm:inline">Отправить правки</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: project.name,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16,6 12,2 8,6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="hidden sm:inline">Поделиться</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {project.imageUrls && project.imageUrls.length > 0 ? (
          <MarkerCanvas
            imageUrls={project.imageUrls}
            projectId={project.id}
            round={project.currentRound}
            isLocked={project.isLocked}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-text-muted">Нет загруженных изображений</p>
          </div>
        )}
      </main>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-strong rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Отправить правки?
            </h2>
            <p className="text-sm text-text-muted mb-4">
              После отправки фрилансер получит уведомление и проект будет
              заблокирован до загрузки новой версии.
            </p>
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
