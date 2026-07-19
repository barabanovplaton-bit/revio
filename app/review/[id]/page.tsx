"use client";

import { useState, useEffect, use } from "react";
import { getProject, updateProject, type Project, type ProjectPackage } from "@/lib/projects";
import {
  subscribeToAllProjectMarkers,
  type Marker,
} from "@/lib/markers";
import { MarkerCanvas } from "@/app/_components/marker-canvas";
import { createNotification } from "@/lib/notifications";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // History viewer
  const [viewingHistory, setViewingHistory] = useState<number | null>(null);
  const [historyMarkers, setHistoryMarkers] = useState<Marker[]>([]);

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

  // Subscribe to markers for current round
  useEffect(() => {
    if (!project) return;
    const unsub = subscribeToAllProjectMarkers(project.id, (m) => setMarkers(m));
    return () => unsub();
  }, [project?.id]);

  // Load markers for history package
  useEffect(() => {
    if (viewingHistory === null || !project) {
      setHistoryMarkers([]);
      return;
    }
    const pkg = project.packageHistory?.[viewingHistory];
    if (!pkg) return;
    // Filter markers for this round
    const filtered = markers.filter((m) => m.round === pkg.round);
    setHistoryMarkers(filtered);
  }, [viewingHistory, project, markers]);

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

  // Error
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

  // No images
  if (project.status === "waiting_for_images" || !project.imageUrls || project.imageUrls.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">{project.name}</h1>
          <p className="text-text-muted">Макеты ещё не загружены. Фрилансер готовит проект.</p>
        </div>
      </div>
    );
  }

  // Just submitted / locked / exhausted
  const isExhausted = project.status === "exhausted" || (project.roundsLeft <= 0 && project.isLocked);
  if (justSubmitted || project.isLocked || isExhausted) {
    return (
      <div className="flex h-screen flex-col bg-bg-page">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border-strong bg-bg-card px-4 py-3">
          <div>
            <h1 className="font-semibold text-text-primary">{project.name}</h1>
            <p className="text-xs text-text-muted">
              {isExhausted ? "Лимит правок исчерпан" : justSubmitted ? "Правки отправлены" : "Ожидайте следующий пакет"}
            </p>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isExhausted ? "bg-red-500/20" : "bg-green-500/20"}`}>
            <svg className={`h-8 w-8 ${isExhausted ? "text-red-400" : "text-green-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {isExhausted ? (
                <>
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
                </>
              ) : (
                <path d="M20 6 9 17l-5-5" />
              )}
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-text-primary text-center">
            {isExhausted ? "Лимит правок исчерпан" : "Спасибо!"}
          </h2>
          <p className="text-sm text-text-muted text-center max-w-sm">
            {isExhausted
              ? project.limitMessage || "Свяжитесь с фрилансером для обсуждения."
              : "Ваши правки отправлены фрилансеру. Ожидайте обновлённую версию."}
          </p>

          {/* View previous packages */}
          {project.packageHistory && project.packageHistory.length > 0 && (
            <div className="mt-8 w-full max-w-md">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted text-center">
                Предыдущие пакеты
              </p>
              <div className="space-y-1.5">
                {project.packageHistory.slice().reverse().map((pkg, i) => {
                  const realIndex = project.packageHistory!.length - 1 - i;
                  const pkgMarkers = markers.filter((m) => m.round === pkg.round);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setViewingHistory(realIndex)}
                      className="flex w-full items-center justify-between rounded-xl border border-border-strong bg-bg-card px-4 py-3 text-left transition-all hover:border-text-primary/30"
                    >
                      <div>
                        <span className="text-sm font-medium text-text-primary">Пакет #{pkg.round}</span>
                        <span className="ml-2 text-xs text-text-muted">{pkg.imageUrls.length} изображений</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-muted">
                          {pkgMarkers.length} {pkgMarkers.length === 1 ? "метка" : "меток"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* History viewer overlay */}
        {viewingHistory !== null && project.packageHistory?.[viewingHistory] && (
          <div className="fixed inset-0 z-50 flex flex-col bg-bg-page">
            <div className="flex items-center justify-between border-b border-border-strong bg-bg-card px-4 py-3">
              <button onClick={() => setViewingHistory(null)} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-cardHover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-sm font-semibold text-text-primary">
                Пакет #{project.packageHistory[viewingHistory].round} (только просмотр)
              </h2>
              <div className="w-9" />
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="mx-auto max-w-4xl space-y-2">
                {project.packageHistory[viewingHistory].imageUrls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt="" className="w-full rounded-xl border border-border-strong" />
                    {/* Show markers for this round on this image */}
                    {historyMarkers
                      .filter((m) => m.type === "point" && m.x != null && m.y != null)
                      .map((marker) => {
                        const total = project.packageHistory![viewingHistory].imageUrls.length;
                        const cols = total <= 3 ? total : 3;
                        const rows = Math.ceil(total / cols);
                        const imgRow = Math.floor(idx / cols);
                        const imgCol = idx % cols;
                        const minX = imgCol / cols;
                        const maxX = (imgCol + 1) / cols;
                        const minY = imgRow / rows;
                        const maxY = (imgRow + 1) / rows;
                        if ((marker.x || 0) < minX || (marker.x || 0) >= maxX || (marker.y || 0) < minY || (marker.y || 0) >= maxY) return null;
                        return (
                          <div key={marker.id} className="absolute group" style={{ left: `${(marker.x || 0) * 100}%`, top: `${(marker.y || 0) * 100}%`, transform: "translate(-50%, -50%)" }}>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-text-primary border-2 border-white/80 shadow-lg">
                              <span className="text-[10px] font-bold text-bg-page">#</span>
                            </div>
                            <div className="absolute left-8 top-1/2 z-40 -translate-y-1/2 w-64 rounded-xl border border-border-strong bg-bg-card p-3 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                              <p className="text-sm text-text-primary">{marker.text}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active state — MarkerCanvas
  const currentMarkers = markers.filter((m) => m.round === project.currentRound);

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
              <path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" />
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
            <h2 className="text-lg font-semibold text-text-primary mb-2">Отправить правки?</h2>
            <p className="text-sm text-text-muted mb-2">
              Фрилансер получит уведомление и увидит ваши метки.
            </p>
            {project.roundsLeft <= 1 ? (
              <p className="text-sm text-yellow-400 mb-4">
                Это последний круг правок.
              </p>
            ) : (
              <p className="text-xs text-text-muted mb-4">
                Останется {project.roundsLeft - 1} {project.roundsLeft - 1 === 1 ? "круг" : "кругов"} правок.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowSubmitConfirm(false)} disabled={isSubmitting} className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50">
                Отмена
              </button>
              <button type="button" onClick={handleSubmitRevisions} disabled={isSubmitting} className="rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50">
                {isSubmitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
