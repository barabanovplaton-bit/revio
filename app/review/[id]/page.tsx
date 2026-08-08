"use client";

import { useState, useEffect, use, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  clearPendingPoints,
} from "@/lib/review-draft";
import { MarkerCanvas } from "@/app/_components/marker-canvas";
import { cn } from "@/lib/utils";

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
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  // Авто-закрытие справки при клике за пределами плашки
  useEffect(() => {
    if (!helpOpen) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [helpOpen]);

  // Черновик общего комментария не пропадает при случайном закрытии
  useEffect(() => {
    if (!generalOpen) return;
    try {
      const saved = window.localStorage.getItem(`revio:general:${id}`);
      if (saved) setGeneralText(saved);
    } catch {
      /* ignore */
    }
  }, [generalOpen, id]);

  useEffect(() => {
    if (!generalOpen) return;
    try {
      window.localStorage.setItem(`revio:general:${id}`, generalText);
    } catch {
      /* ignore */
    }
  }, [generalOpen, generalText, id]);

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

  // При переключении раундов сбрасываем незафиксированные черновики (точки не «протекают»)
  useEffect(() => {
    if (viewRound !== (project?.currentRound || 1)) {
      clearPendingPoints(id);
    }
  }, [viewRound, project?.currentRound, id]);

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

  // Fallback для старых проектов: если текущий пакет пуст, берём последний из истории
  const fallbackImages = useMemo(() => {
    const history = project?.packageHistory || [];
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].imageUrls.length > 0) return history[i].imageUrls;
    }
    return [] as string[];
  }, [project?.packageHistory]);

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
  // Режим Read-Only: просмотр архивного раунда или текущий завершён
  const readOnly = viewRound !== round || locked;

  const imagesForRound = (r: number) => {
    if (r === round) {
      if (project.imageUrls && project.imageUrls.length > 0) {
        return project.imageUrls;
      }
      return fallbackImages;
    }
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
      // Параллельно: пакет правок (один writeBatch) + обновление проекта
      await Promise.all([
        createMarkers(
          items.map((d) => ({
            projectId: id,
            round,
            type: d.type,
            text: d.text,
            ...(d.type === "point"
              ? { x: d.x, y: d.y, imageIndex: d.imageIndex }
              : {}),
          }))
        ),
        updateProject(id, { clientSubmitted: true, roundsLeft: Math.max(0, (project.roundsLeft ?? 1) - 1) }),
      ]);
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
      clearPendingPoints(id);
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
    try {
      window.localStorage.removeItem(`revio:general:${id}`);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-screen flex-col bg-bg-page">
      <header className="relative flex items-center justify-between gap-3 border-b border-border-strong bg-bg-card px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {availableRounds.length > 1 ? (
            <div className="flex items-center gap-0.5 rounded-xl border border-border-strong bg-bg-input p-1">
              <button
                type="button"
                onClick={() => setViewRound((r) => Math.max(availableRounds[0], r - 1))}
                disabled={viewRound <= availableRounds[0]}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span className="min-w-0 px-1 text-center text-xs font-medium text-text-primary">
                Раунд {viewRound}/{availableRounds.length}
              </span>
              <button
                type="button"
                onClick={() => setViewRound((r) => Math.min(availableRounds[availableRounds.length - 1], r + 1))}
                disabled={viewRound >= availableRounds[availableRounds.length - 1]}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          ) : (
            <p className="text-xs font-medium text-text-muted">Раунд {round}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Справка — кнопка в шапке (скрыта в закрытых раундах Read-Only) */}
          {!readOnly && (
            <div ref={helpRef} className="relative">
              <button
                type="button"
                onClick={() => setHelpOpen((v) => !v)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold transition-all",
                  helpOpen
                    ? "border-text-primary/60 bg-text-primary text-bg-page"
                    : "border-border-strong bg-bg-input text-text-primary hover:bg-bg-cardHover hover:text-white"
                )}
                aria-label="Справка"
              >
                ?
              </button>
              <AnimatePresence>
                {helpOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-full w-80 rounded-b-2xl rounded-tl-2xl border border-t-0 border-border-strong bg-bg-card p-5 shadow-2xl"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-text-primary">Как оставить правки</h3>
                      <button
                        type="button"
                        onClick={() => setHelpOpen(false)}
                        className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
                        aria-label="Закрыть справку"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <ol className="space-y-3 text-sm leading-relaxed text-text-muted">
                      <li className="flex gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[11px] font-bold text-bg-page">1</span>
                        <span>Кликните по холсту, чтобы поставить точку и написать правку.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[11px] font-bold text-bg-page">2</span>
                        <span>Нажмите «Готово», когда добавите все комментарии.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[11px] font-bold text-bg-page">3</span>
                        <span>Фрилансер получит уведомление и загрузит обновленные макеты.</span>
                      </li>
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Переключатель маячков доступен на всех раундах (текущих и закрытых) */}
          <button
            type="button"
            onClick={() => setMarkersVisible((v) => !v)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
              markersVisible
                ? "border-border-strong bg-bg-input text-text-primary hover:bg-bg-cardHover"
                : "border-border-strong bg-bg-card text-text-muted hover:text-text-primary"
            )}
          >
            {markersVisible ? "Без маячков" : "С маячками"}
          </button>

          {viewRound === round ? (
            <>
              {!locked ? (
                <>
                  <button
                    type="button"
                    onClick={() => setGeneralOpen((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                      generalOpen
                        ? "border-text-primary bg-text-primary/15 text-text-primary"
                        : "border-text-primary/40 bg-text-primary/10 text-text-primary hover:bg-text-primary/20"
                    )}
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
                    {generalOpen ? "Закрыть" : "Общий комментарий"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDoneClick}
                    disabled={draftCount === 0}
                    className="rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Готово
                  </button>
                </>
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Раунд №{round} завершен. Правки отправлены
                </span>
              )}
            </>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Раунд №{viewRound} завершен. Правки отправлены
            </span>
          )}
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        {viewRound === round ? (
          <MarkerCanvas
            imageUrls={imagesForRound(viewRound)}
            projectId={id}
            round={round}
            isLocked={locked}
            markersVisible={markersVisible}
            onToggleMarkers={() => setMarkersVisible((v) => !v)}
            onImageChange={setViewIndex}
            generalOpen={generalOpen}
            generalText={generalText}
            onGeneralTextChange={setGeneralText}
            onAddGeneral={addGeneral}
            onGeneralClose={() => setGeneralOpen(false)}
          />
        ) : (
          <MarkerCanvas
            imageUrls={imagesForRound(viewRound)}
            projectId={id}
            round={viewRound}
            isLocked
            markersVisible={markersVisible}
            onToggleMarkers={() => setMarkersVisible((v) => !v)}
            onImageChange={setViewIndex}
            sentMarkersOverride={markersForRound(viewRound)}
          />
        )}

        {/* Правки отправлены: компактный баннер по центру, фото остаётся видимым */}
        <AnimatePresence>
          {showDoneModal && (
            <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex max-w-md items-center gap-3 rounded-2xl border border-green-500/30 bg-bg-card px-5 py-4 shadow-2xl"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-400">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    Правки отправлены
                  </h2>
                  <p className="text-xs leading-relaxed text-text-muted">
                    Дизайнер скоро пришлёт исправленную версию.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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

    </div>
  );
}
