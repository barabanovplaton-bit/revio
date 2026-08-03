"use client";

import { useState, useEffect, use, useMemo } from "react";
import {
  subscribeToProject,
  updateProject,
  hasRoundsLeft,
  type Project,
} from "@/lib/projects";
import { createMarkers, subscribeToAllProjectMarkers, type Marker } from "@/lib/markers";
import { createNotification } from "@/lib/notifications";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  notifyDraftChanged,
  newDraftId,
} from "@/lib/review-draft";
import { MarkerCanvas } from "@/app/_components/marker-canvas";
import { CanvasViewer } from "@/app/_components/canvas-viewer";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

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
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);

  const [showDoneModal, setShowDoneModal] = useState(false);
  const [emptyDraftOpen, setEmptyDraftOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [generalOpen, setGeneralOpen] = useState(false);
  const [generalText, setGeneralText] = useState("");
  const [pointMode, setPointMode] = useState(false);

  useEffect(() => {
    setPointMode(false);
  }, [project?.clientSubmitted, project?.status]);

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

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeToAllProjectMarkers(id, (m) => {
      if (!cancelled) setAllMarkers(m);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  // Автозакрытие модалки «Правки отправлены»
  useEffect(() => {
    if (!showDoneModal) return;
    const t = setTimeout(() => setShowDoneModal(false), 2600);
    return () => clearTimeout(t);
  }, [showDoneModal]);

  // Количество черновиков в заголовке
  useEffect(() => {
    const upd = () => setDraftCount(loadDraft(id).length);
    upd();
    window.addEventListener("revio:draft-changed", upd);
    return () => window.removeEventListener("revio:draft-changed", upd);
  }, [id]);

  // Просматриваемый раунд (по умолчанию — текущий) и тумблер маячков
  const [viewRound, setViewRound] = useState(project?.currentRound || 1);
  const [markersVisible, setMarkersVisible] = useState(true);
  // Текущая страница (для счётчика «N / M» в шапке)
  const [viewIndex, setViewIndex] = useState(0);
  useEffect(() => {
    setViewRound(project?.currentRound || 1);
  }, [project?.currentRound]);
  useEffect(() => {
    setViewIndex(0);
  }, [viewRound]);

  // Раунды с изображениями, доступные клиенту для просмотра
  const availableRounds = useMemo(() => {
    const current = project?.currentRound || 1;
    const rounds: number[] = [current];
    for (const pkg of project?.packageHistory || []) {
      if (pkg.imageUrls.length > 0 && !rounds.includes(pkg.round)) {
        rounds.push(pkg.round);
      }
    }
    return rounds.sort((a, b) => a - b);
  }, [project?.currentRound, project?.packageHistory]);

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

  const imagesForRound = (r: number) => {
    if (r === round) return project.imageUrls || [];
    const pkg = project.packageHistory?.find((p) => p.round === r);
    return pkg?.imageUrls || [];
  };

  const markersForRound = (r: number) =>
    allMarkers.filter((m) => m.round === r);

  const handleDoneClick = () => {
    if (locked) return;
    const count = loadDraft(id).length;
    if (count === 0) {
      setEmptyDraftOpen(true);
      return;
    }
    setSendError(null);
    setSendConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    if (sending) return;
    const items = loadDraft(id);
    if (items.length === 0) return;
    setSending(true);
    setSendError(null);
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
      try {
        await createNotification({
          ownerUid: project.ownerUid,
          projectId: id,
          projectName: project.name,
          type: "revisions_submitted",
          message: `Клиент отправил ${items.length} ${items.length === 1 ? "правку" : items.length < 5 ? "правки" : "правок"} по проекту «${project.name}»`,
        });
      } catch (e) {
        console.error("Failed to send notification:", e);
      }
      clearDraft(id);
      setSendConfirmOpen(false);
      setShowDoneModal(true);
    } catch (e) {
      console.error("Failed to send draft:", e);
      setSendError("Не удалось отправить правки. Проверьте соединение и попробуйте ещё раз.");
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
      <header className="flex items-center justify-between gap-3 border-b border-border-strong bg-bg-card px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {availableRounds.length > 1 ? (
            <div className="flex items-center gap-0.5 rounded-lg border border-border-strong bg-bg-input p-0.5">
              <button
                type="button"
                onClick={() => setViewRound((r) => Math.max(availableRounds[0], r - 1))}
                disabled={viewRound <= availableRounds[0]}
                className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span className="min-w-0 px-1 text-center text-[11px] font-medium text-text-primary">
                Раунд {viewRound}/{availableRounds.length}
              </span>
              <button
                type="button"
                onClick={() => setViewRound((r) => Math.min(availableRounds[availableRounds.length - 1], r + 1))}
                disabled={viewRound >= availableRounds[availableRounds.length - 1]}
                className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          ) : (
            <p className="text-[11px] font-medium text-text-muted">Раунд {round}</p>
          )}
          {(() => {
            const n = imagesForRound(viewRound).length;
            return n > 1 ? (
              <span className="inline-flex shrink-0 items-center rounded-md border border-border-strong bg-bg-input px-1.5 py-0.5 text-[11px] font-medium text-text-primary">
                {Math.min(viewIndex + 1, n)} / {n}
              </span>
            ) : null;
          })()}
        </div>
        {locked ? (
          <span className="shrink-0 rounded-lg bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400">
            {submitted ? "Правки отправлены" : "Правки закрыты"}
          </span>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPointMode(false);
                  setGeneralOpen((v) => !v);
                  setGeneralText("");
                }}
                className="flex items-center gap-1.5 rounded-lg border border-text-primary/40 bg-text-primary/10 px-2.5 py-1.5 text-xs font-semibold text-text-primary transition-all hover:bg-text-primary/20"
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
              <AnimatePresence>
                {generalOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onMouseDown={() => setGeneralOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-border-strong bg-bg-card p-4 shadow-2xl"
                    >
                      <p className="mb-2 text-xs font-medium text-text-primary">Общий комментарий</p>
                      <textarea
                        value={generalText}
                        onChange={(e) => setGeneralText(e.target.value)}
                        placeholder="Опишите общие правки..."
                        rows={3}
                        autoFocus
                        className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={addGeneral}
                          disabled={!generalText.trim()}
                          className="rounded-xl bg-text-primary px-5 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          Добавить
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={() => {
                setGeneralOpen(false);
                setPointMode((v) => !v);
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                pointMode
                  ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "border-border-strong bg-bg-input text-text-primary hover:bg-bg-cardHover"
              )}
              title={pointMode ? "Отменить добавление точки" : "Поставить точку на картинке"}
            >
              {pointMode ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Отмена
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                  Точечный комментарий
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMarkersVisible((v) => !v)}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                markersVisible
                  ? "border-border-strong bg-bg-input text-text-primary hover:bg-bg-cardHover"
                  : "border-border-strong bg-bg-card text-text-muted hover:text-text-primary"
              )}
              title={markersVisible ? "Скрыть маячки" : "Показать маячки"}
            >
              {markersVisible ? "Без маячков" : "С маячками"}
            </button>
            <button
              type="button"
              onClick={handleDoneClick}
              className="rounded-lg bg-text-primary px-3.5 py-1.5 text-xs font-semibold text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Готово
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        {viewRound === round ? (
          <MarkerCanvas
            imageUrls={project.imageUrls}
            projectId={id}
            round={round}
            isLocked={locked}
            markersVisible={markersVisible}
            onToggleMarkers={() => setMarkersVisible((v) => !v)}
            onImageChange={setViewIndex}
            pointMode={pointMode}
            onTogglePointMode={() => setPointMode((v) => !v)}
          />
        ) : (
          <CanvasViewer
            imageUrls={imagesForRound(viewRound)}
            markers={markersForRound(viewRound)}
            readOnly
            showPanel
            showToggle={false}
            markersVisible={markersVisible}
            onToggleMarkers={() => setMarkersVisible((v) => !v)}
            onImageChange={setViewIndex}
            showBottomCard={false}
          />
        )}
      </main>

      {locked && !submitted && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <div className="pointer-events-auto max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400 backdrop-blur-sm">
            Раунды правок в этом проекте исчерпаны. Свяжитесь с фрилансером, чтобы продолжить.
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
            <p className="mb-4 text-sm leading-relaxed text-text-muted">
              Это будет пакет правок раунда {round}. После отправки вы не сможете их изменить
              до следующего раунда.
            </p>
            {sendError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {sendError}
              </div>
            )}
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

      {/* Правки отправлены */}
      {showDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-text-primary/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-text-primary">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">Пакет правок отправлен</h2>
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
