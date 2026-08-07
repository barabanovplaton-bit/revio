"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CanvasViewer } from "./canvas-viewer";
import { subscribeToProjectMarkers, type Marker } from "@/lib/markers";
import {
  loadDraft,
  saveDraft,
  newDraftId,
  loadPendingPoints,
  savePendingPoints,
  type ReviewDraftItem,
  type PendingPoint,
} from "@/lib/review-draft";
import { cn } from "@/lib/utils";

interface MarkerCanvasProps {
  imageUrls: string[];
  projectId: string;
  round: number;
  isLocked: boolean;
  markersVisible?: boolean;
  onToggleMarkers?: () => void;
  onImageChange?: (index: number) => void;
  /** Общий комментарий (управляется с review-страницы) */
  generalOpen?: boolean;
  generalText?: string;
  onGeneralTextChange?: (t: string) => void;
  onAddGeneral?: () => void;
  onGeneralClose?: () => void;
  /** Переопределить отправленные маркеры (для просмотра старых раундов) */
  sentMarkersOverride?: Marker[];
}

export function MarkerCanvas({
  imageUrls,
  projectId,
  round,
  isLocked,
  markersVisible,
  onToggleMarkers,
  onImageChange,
  generalOpen = false,
  generalText = "",
  onGeneralTextChange,
  onAddGeneral,
  onGeneralClose,
  sentMarkersOverride,
}: MarkerCanvasProps) {
  const [sentMarkers, setSentMarkers] = useState<Marker[]>([]);
  const [draft, setDraft] = useState<ReviewDraftItem[]>([]);
  const [markerText, setMarkerText] = useState("");
  // Несохранённые точечные правки: поставлены, но не «Добавить». Хранятся в
  // localStorage и рисуются на фото, чтобы текст не терялся при закрытии.
  const [pendingPoints, setPendingPoints] = useState<PendingPoint[]>([]);
  // id точки, которую сейчас редактируем (в правой панели)
  const [activePendingId, setActivePendingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // Выбранная правка для правой деталь-панели
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  // Режим «Переписать» (редактирование текста черновика)
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    item: ReviewDraftItem;
    number: number | null;
  } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches || "ontouchstart" in window);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (sentMarkersOverride) {
      setSentMarkers(sentMarkersOverride);
      return;
    }
    const unsub = subscribeToProjectMarkers(projectId, round, (m) => {
      setSentMarkers(m);
    });
    return () => unsub();
  }, [projectId, round, sentMarkersOverride]);

  // Черновик из localStorage + обновление извне (общий комментарий из шапки)
  useEffect(() => {
    setDraft(loadDraft(projectId));
    const onDraft = () => setDraft(loadDraft(projectId));
    window.addEventListener("revio:draft-changed", onDraft);
    return () => window.removeEventListener("revio:draft-changed", onDraft);
  }, [projectId]);

  // Несохранённые точки из localStorage
  useEffect(() => {
    setPendingPoints(loadPendingPoints(projectId));
    const onPending = () => setPendingPoints(loadPendingPoints(projectId));
    window.addEventListener("revio:pending-changed", onPending);
    return () => window.removeEventListener("revio:pending-changed", onPending);
  }, [projectId]);

  // При открытии общего комментария снимаем выделение активной точки.
  // Пустая (без текста) активная точка при этом удаляется с холста.
  useEffect(() => {
    if (generalOpen) {
      if (activePendingId && activePending && !(activePending.text || "").trim()) {
        setPending(pendingPoints.filter((p) => p.id !== activePendingId));
      }
      setActivePendingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generalOpen]);

  const persist = useCallback(
    (next: ReviewDraftItem[]) => {
      setDraft(next);
      saveDraft(projectId, next);
    },
    [projectId]
  );

  const nextOrder =
    draft.reduce((m, d) => Math.max(m, d.order), 0) + 1;

  // Ключ точки (округлённые координаты), чтобы находить «ту же точку» при повторном клике
  const pointKey = (x: number, y: number, imageIndex: number) =>
    `${imageIndex}:${Math.round(x * 100)}:${Math.round(y * 100)}`;

  const activePending = pendingPoints.find((p) => p.id === activePendingId) || null;

  // Номер активной pending-точки только среди точечных правок (общие не считаются):
  // отправленные точки + мои точечные черновики + точечные pending раньше этой.
  const activePendingNumber = useMemo(() => {
    if (!activePending) return null;
    const sentPts = sentMarkers.filter((m) => m.type === "point").length;
    const myPointDrafts = draft.filter((d) => d.type === "point").length;
    const earlierPending =
      pendingPoints.filter(
        (p) => p.id !== activePending.id && p.order < activePending.order
      ).length;
    return sentPts + myPointDrafts + earlierPending + 1;
  }, [activePending, draft, pendingPoints, sentMarkers]);

  const setPending = (next: PendingPoint[]) => {
    setPendingPoints(next);
    savePendingPoints(projectId, next);
  };

  const handleAddPoint = (
    x: number,
    y: number,
    imageIndex: number
  ) => {
    if (isLocked) return;
    // Если в этом месте уже есть несохранённая точка — открываем её (с текстом)
    const existing = pendingPoints.find(
      (p) =>
        p.imageIndex === imageIndex &&
        pointKey(p.x, p.y, p.imageIndex) === pointKey(x, y, imageIndex)
    );
    if (existing) {
      setActivePendingId(existing.id);
      setMarkerText(existing.text);
      setSelectedDraftId(null);
      setEditing(false);
      return;
    }
    // Сбрасываем несохранённые точки БЕЗ текста (чтобы не копились пустые),
    // но точки, где юзер уже начал писать, сохраняем в черновик (текст не теряется).
    const kept = pendingPoints.filter((p) => p.id === activePendingId ? false : (p.text || "").trim().length > 0);
    const pp: PendingPoint = {
      id: newDraftId(),
      x,
      y,
      imageIndex,
      text: "",
      order: nextOrder + kept.length,
    };
    setPending([...kept, pp]);
    setActivePendingId(pp.id);
    setMarkerText("");
    setSelectedDraftId(null);
    setEditing(false);
  };

  const handleMarkerTextChange = (t: string) => {
    setMarkerText(t);
    if (activePending) {
      setPending(
        pendingPoints.map((p) =>
          p.id === activePending.id ? { ...p, text: t } : p
        )
      );
    }
  };

  // «Закрыть» форму. Если в точке нет текста — она полностью пропадает с холста
  // (не остаётся пустой). Если текст есть — точка сохраняется на фото с текстом.
  const closePending = () => {
    if (activePending) {
      if (!(activePending.text || "").trim()) {
        setPending(pendingPoints.filter((p) => p.id !== activePending.id));
      }
    }
    setActivePendingId(null);
    setMarkerText("");
  };

  const handleAddMarker = () => {
    const text = markerText.trim();
    if (!text) return;
    if (activePending) {
      persist([
        ...draft,
        {
          id: newDraftId(),
          type: "point",
          x: activePending.x,
          y: activePending.y,
          imageIndex: activePending.imageIndex,
          text,
          order: nextOrder,
        },
      ]);
      setPending(pendingPoints.filter((p) => p.id !== activePending.id));
      setActivePendingId(null);
      setSelectedDraftId(null);
    } else {
      persist([
        ...draft,
        { id: newDraftId(), type: "general", text, order: nextOrder },
      ]);
    }
    setMarkerText("");
  };

  const handleDeletePending = (id: string) => {
    setPending(pendingPoints.filter((p) => p.id !== id));
    if (activePendingId === id) {
      setActivePendingId(null);
      setMarkerText("");
    }
  };

  const handleDeleteDraft = (id: string) => {
    persist(draft.filter((d) => d.id !== id));
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
      setEditing(false);
    }
    if (activePendingId) setActivePendingId(null);
  };

  const draftDeleteNumber = (d: ReviewDraftItem): number | null => {
    if (d.type !== "point") return null;
    const idx = draft
      .filter((x) => x.type === "point")
      .findIndex((x) => x.id === d.id);
    return idx >= 0 ? sentPointCount + idx + 1 : null;
  };

  const requestDelete = (d: ReviewDraftItem) => {
    setDeleteConfirm({ item: d, number: draftDeleteNumber(d) });
  };

  const onDeleteMarker = (id: string) => {
    const d = draft.find((x) => x.id === id);
    if (!d) return;
    requestDelete(d);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    handleDeleteDraft(deleteConfirm.item.id);
    setDeleteConfirm(null);
  };

  const sentPointCount = sentMarkers.filter((m) => m.type === "point").length;
  const sentGeneralCount = sentMarkers.filter((m) => m.type === "general").length;

  // Выбранная правка для правой деталь-панели (из черновика или отправленных)
  const selectedDraft =
    (selectedDraftId ? draft.find((d) => d.id === selectedDraftId) : null) ??
    (selectedDraftId
      ? sentMarkers.find((m) => m.id === selectedDraftId)
      : null) ??
    null;

  const selectedMarkerNumber = (() => {
    if (!selectedDraft) return null;
    if (selectedDraft.type === "general") return null;
    const points = draft
      .filter((d) => d.type === "point")
      .sort((a, b) => a.order - b.order);
    const idx = points.findIndex((d) => d.id === selectedDraft.id);
    if (idx >= 0) return sentPointCount + idx + 1;
    const sentIdx = sentMarkers
      .filter((m) => m.type === "point")
      .sort(
        (a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
      )
      .findIndex((m) => m.id === selectedDraft.id);
    return sentIdx >= 0 ? sentIdx + 1 : null;
  })();

  // Номер выбранной общей правки (отдельная нумерация среди общих)
  const selectedGeneralNumber = (() => {
    if (!selectedDraft || selectedDraft.type !== "general") return null;
    const generals = draft.filter((d) => d.type === "general");
    const gi = generals.findIndex((d) => d.id === selectedDraft.id);
    if (gi >= 0) return sentGeneralCount + gi + 1;
    const sentGenerals = sentMarkers.filter((m) => m.type === "general");
    const sgi = sentGenerals.findIndex((m) => m.id === selectedDraft.id);
    return sgi >= 0 ? sgi + 1 : null;
  })();

  const saveEdit = () => {
    if (!selectedDraftId || !editValue.trim()) return;
    persist(
      draft.map((d) =>
        d.id === selectedDraftId ? { ...d, text: editValue.trim() } : d
      )
    );
    setEditing(false);
  };

  // Объединяем отправленные правки, черновик и несохранённые точки для отрисовки на фото
  const markers: Marker[] = useMemo(() => {
    const sentMax = sentMarkers.reduce(
      (m, x) => Math.max(m, x.createdAt?.toMillis() || 0),
      0
    );
    const drafts: Marker[] = draft.map((d) => ({
      id: d.id,
      projectId,
      round,
      type: d.type,
      x: d.x,
      y: d.y,
      imageIndex: d.imageIndex,
      text: d.text,
      createdAt: {
        toMillis: () => sentMax + 1 + d.order,
      } as Marker["createdAt"],
    }));
    const pendings: Marker[] = pendingPoints.map((p) => ({
      id: p.id,
      projectId,
      round,
      type: "point",
      x: p.x,
      y: p.y,
      imageIndex: p.imageIndex,
      text: p.text,
      pending: true,
      createdAt: {
        toMillis: () => sentMax + 2 + p.order,
      } as Marker["createdAt"],
    }));
    return [...sentMarkers, ...drafts, ...pendings];
  }, [sentMarkers, draft, pendingPoints, projectId, round]);

  const draftIds = useMemo(() => new Set(draft.map((d) => d.id)), [draft]);

  // На десктопе форма живёт в правой панели; на мобиле — старая, у точки
  const pointForm = isMobile && activePending ? (() => {
    const alignX = activePending.x >= 0.5 ? "left" : "right";
    const alignY = activePending.y >= 0.5 ? "top" : "bottom";
    const posStyle: CSSProperties =
      alignY === "top"
        ? { top: 16, bottom: undefined }
        : { top: undefined, bottom: 16 };
    if (alignX === "left") {
      posStyle.left = 16;
      posStyle.right = undefined;
    } else {
      posStyle.left = undefined;
      posStyle.right = 16;
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute z-30 w-72 max-w-[min(18rem,80vw)] rounded-xl border border-white/20 bg-bg-card p-4 shadow-2xl"
        style={posStyle}
      >
        <textarea
          value={markerText}
          onChange={(e) => handleMarkerTextChange(e.target.value)}
          placeholder="Опишите правку..."
          rows={3}
          autoFocus
          className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
        />
        <div className="mt-3">
          <button
            type="button"
            onClick={handleAddMarker}
            disabled={!markerText.trim()}
            className="w-full rounded-lg bg-text-primary px-3 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </motion.div>
    );
  })() : null;

  const draftPanel = (() => {
    const points = draft
      .filter((d) => d.type === "point")
      .sort((a, b) => a.order - b.order);
    const generals = draft
      .filter((d) => d.type === "general")
      .sort((a, b) => a.order - b.order);
    return (
      <>
        <div className="border-b border-border-strong px-4 py-2.5 text-xs font-medium text-text-primary">
          Мои правки ({draft.length})
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {draft.length === 0 && (
            <p className="px-2 py-3 text-center text-xs leading-relaxed text-text-muted">
              Нажмите на картинку, чтобы добавить первую правку.
            </p>
          )}
          <div className="space-y-0.5">
            {points.map((d, i) => ({ d, i }))
              .reverse()
              .map(({ d, i }) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDraftId(d.id);
                    setEditing(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-cardHover",
                    selectedDraftId === d.id && "bg-bg-cardHover"
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-bg-page">
                    {sentPointCount + i + 1}
                  </span>
                  <span className="line-clamp-1 min-w-0 flex-1 break-words text-xs leading-snug text-text-primary">
                    {d.text}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(d);
                    }}
                    className="shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-red-400"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                </button>
              ))}
          </div>
          {generals.length > 0 && (
            <>
              <div className="mt-3 border-t border-border-strong pt-2">
                <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                  Общие правки · {generals.length}
                </p>
              </div>
              <div className="space-y-0.5">
                {[...generals].reverse().map((d, gi) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDraftId(d.id);
                      setEditing(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-cardHover",
                      selectedDraftId === d.id && "bg-bg-cardHover"
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary/15 text-[10px] font-bold text-text-primary">
                      {sentGeneralCount + generals.length - gi}
                    </span>
                    <span className="line-clamp-1 min-w-0 flex-1 break-words text-xs leading-snug text-text-primary">
                      {d.text}
                    </span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDelete(d);
                      }}
                      className="shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-red-400"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </>
    );
  })();

  // Правая деталь-панель (десктоп): форма общего/точечного комментария
  // или просмотр правки. Всегда видна на десктопе — вместо оверлея на фото.
  const detailPanel = !isMobile ? (
    <aside className="flex w-[19rem] shrink-0 flex-col border-l border-border-strong bg-bg-card">
      {generalOpen ? (
        <>
          <div className="flex items-center justify-between border-b border-border-strong px-4 py-3">
            <p className="text-sm font-medium text-text-primary">Общий комментарий</p>
            <button
              type="button"
              onClick={() => onGeneralClose?.()}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <textarea
              value={generalText}
              onChange={(e) => onGeneralTextChange?.(e.target.value)}
              placeholder="Опишите общие правки..."
              rows={6}
              autoFocus
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2 border-t border-border-strong p-3">
            <button
              type="button"
              onClick={() => onAddGeneral?.()}
              disabled={!generalText.trim()}
              className="flex-1 rounded-xl bg-text-primary px-3 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
            >
              Добавить
            </button>
          </div>
        </>
      ) : activePending ? (
        <>
          <div className="flex items-center justify-between border-b border-border-strong px-4 py-3">
            <p className="text-sm font-medium text-text-primary">
              Точка №{activePendingNumber}
            </p>
            <button
              type="button"
              onClick={closePending}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <textarea
              value={markerText}
              onChange={(e) => handleMarkerTextChange(e.target.value)}
              placeholder="Опишите правку..."
              rows={4}
              autoFocus
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
            />
          </div>
          <div className="flex border-t border-border-strong p-3">
            <button
              type="button"
              onClick={handleAddMarker}
              disabled={!markerText.trim()}
              className="w-full rounded-xl bg-text-primary px-3 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
            >
              Добавить
            </button>
          </div>
        </>
      ) : selectedDraft ? (
        <>
          <div className="flex items-center justify-between border-b border-border-strong px-4 py-3">
            <p className="text-sm font-medium text-text-primary">
              {selectedDraft.type === "general"
                ? `Общая правка №${selectedGeneralNumber}`
                : `Правка №${selectedMarkerNumber}`}
            </p>
            <button
              type="button"
              onClick={() => setSelectedDraftId(null)}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {editing ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={6}
                autoFocus
                className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-text-primary focus:outline-none"
              />
            ) : (
              <p className="break-words text-sm leading-relaxed text-text-primary">
                {selectedDraft.text}
              </p>
            )}
          </div>
          <div className="flex gap-2 border-t border-border-strong p-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-xl border border-border-strong px-3 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!editValue.trim()}
                  className="flex-1 rounded-xl bg-text-primary px-3 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
                >
                  Сохранить
                </button>
              </>
            ) : (
              <>
                {draft.some((d) => d.id === selectedDraft.id) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(true);
                        setEditValue(selectedDraft.text);
                      }}
                      className="flex-1 rounded-xl border border-border-strong px-3 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
                    >
                      Переписать
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        requestDelete(selectedDraft as ReviewDraftItem);
                      }}
                      className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-all hover:bg-red-500/20"
                    >
                      Удалить
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-text-muted">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-xs leading-relaxed text-text-muted">
            Нажмите на макет, чтобы добавить правку,
            <br />
            или добавьте общий комментарий.
          </p>
        </div>
      )}
    </aside>
  ) : null;

  const canvas = (
    <div className="relative min-w-0 flex-1 h-full">
      <CanvasViewer
        imageUrls={imageUrls}
        markers={markers}
        canAdd={!isLocked}
        locked={isLocked}
        onAddPoint={handleAddPoint}
        onDeleteMarker={isLocked ? undefined : onDeleteMarker}
        canDeleteIds={draftIds}
        pointForm={pointForm}
        showToggle={false}
        markersVisible={markersVisible}
        onToggleMarkers={onToggleMarkers}
        onImageChange={onImageChange}
        selectedId={activePendingId ?? selectedDraftId}
        onSelectMarker={(id) => {
          if (id && pendingPoints.some((p) => p.id === id)) {
            const pp = pendingPoints.find((p) => p.id === id);
            setActivePendingId(id);
            setMarkerText(pp?.text || "");
            setSelectedDraftId(null);
          } else {
            setActivePendingId(null);
            setSelectedDraftId(id);
          }
          setEditing(false);
        }}
        showBottomCard={false}
      />
    </div>
  );

  return (
    <div className="relative h-full w-full">
      {isMobile ? (
        <>
          {canvas}

          {/* Мобильная панель «Мои правки» */}
          {!isLocked && (
            <AnimatePresence>
              {panelOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  className="absolute inset-x-0 bottom-0 z-40 flex max-h-[45%] flex-col overflow-hidden rounded-t-2xl border-t border-border-strong bg-bg-card shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="flex items-center justify-center gap-1.5 border-b border-border-strong px-4 py-2 text-xs font-medium text-text-primary"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                    Свернуть
                  </button>
                  {draftPanel}
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border-strong bg-bg-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xl"
                >
                  Мои правки ({draft.length})
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </>
      ) : (
        <div className="flex h-full w-full">
          {!isLocked && (
            <div className="flex w-60 shrink-0 flex-col overflow-hidden border-r border-border-strong bg-bg-card">
              {draftPanel}
            </div>
          )}
          <div className="relative min-w-0 flex-1">
            {canvas}
          </div>
          {detailPanel}
        </div>
      )}

      {/* Подтверждение удаления правки */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-text-primary">
              {deleteConfirm.number !== null
                ? `Удалить правку №${deleteConfirm.number}?`
                : "Удалить общий комментарий?"}
            </h2>
            <p className="mb-6 max-h-32 overflow-y-auto break-words text-sm leading-relaxed text-text-muted">
              «{deleteConfirm.item.text}» будет удалено из черновика.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-600"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
