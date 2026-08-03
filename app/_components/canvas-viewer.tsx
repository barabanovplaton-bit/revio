"use client";

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import type { Marker } from "@/lib/markers";
import { cn } from "@/lib/utils";

type Filter = "order" | "page" | "length";

interface CanvasViewerProps {
  imageUrls: string[];
  /** Начальная картинка (по умолчанию 0) */
  initialIndex?: number;
  /** Маркеры ТЕКУЩЕГО раунда (точки + общие) */
  markers: Marker[];
  /** Разрешено добавлять правки кликом по фото (режим клиента) */
  canAdd?: boolean;
  /** Всё заблокировано (раунды исчерпаны) */
  locked?: boolean;
  /** Режим кабинета: нельзя добавлять/удалять, можно отмечать «сделано» */
  readOnly?: boolean;
  onAddPoint?: (x: number, y: number, imageIndex: number) => void;
  onDeleteMarker?: (id: string) => void;
  /** id маркеров, которые можно удалить (для черновика клиента) */
  canDeleteIds?: ReadonlySet<string>;
  onToggleDone?: (id: string, done: boolean) => void;
  /** Показывать панель списка правок (кабинет) */
  showPanel?: boolean;
  /** Точка, которую сейчас ставит клиент (превью на фото) */
  pendingPoint?: { x: number; y: number } | null;
  /** Форма «Опишите правку» (рендерится внизу зоны фото) */
  pointForm?: ReactNode;
  /** Показывать встроенный тумблер «С маячками» (по умолчанию да) */
  showToggle?: boolean;
  /** Внешнее управление тумблером маячков (контролируемый режим) */
  markersVisible?: boolean;
  onToggleMarkers?: () => void;
  /** Смена текущей картинки (для счётчика страниц в шапке) */
  onImageChange?: (index: number) => void;
  /** Внешнее управление выбранным маркером (правая деталь-панель клиента) */
  selectedId?: string | null;
  onSelectMarker?: (id: string | null) => void;
  /** Скрыть нижнюю карточку выбранного маркера (клиент использует свою панель) */
  showBottomCard?: boolean;
  /** Затемнить всё вокруг зоны фото (режим «Точечный комментарий») */
  dimAroundZone?: boolean;
  onDimClick?: () => void;
  className?: string;
}

const MAX_SCALE = 3;

export function CanvasViewer({
  imageUrls,
  initialIndex = 0,
  markers,
  canAdd = false,
  locked = false,
  readOnly = false,
  onAddPoint,
  onDeleteMarker,
  canDeleteIds,
  onToggleDone,
  showPanel = false,
  pendingPoint = null,
  pointForm,
  showToggle = true,
  markersVisible,
  onToggleMarkers,
  onImageChange,
  selectedId,
  onSelectMarker,
  showBottomCard = true,
  dimAroundZone = false,
  onDimClick,
  className,
}: CanvasViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("order");
  const [mobile, setMobile] = useState(false);
  const [natSize, setNatSize] = useState<{ w: number; h: number } | null>(null);
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null);
  const [lastLoadedUrl, setLastLoadedUrl] = useState<string | null>(null);
  const [zoneRect, setZoneRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);

  // Затемнение вокруг зоны фото (режим «Точечный комментарий»)
  useEffect(() => {
    if (!dimAroundZone) return;
    const update = () => {
      const r = zoneRef.current?.getBoundingClientRect();
      if (r) setZoneRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom });
    };
    update();
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    if (zoneRef.current) ro.observe(zoneRef.current);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [dimAroundZone]);

  // Выбранный маркер: внешнее управление (правая панель клиента) или внутреннее
  const selectedMarkerId = selectedId !== undefined ? selectedId : internalSelectedId;
  const setSelectedMarkerId = (id: string | null) => {
    if (selectedId !== undefined) onSelectMarker?.(id);
    else setInternalSelectedId(id);
  };

  const markersShown = markersVisible ?? showMarkers;

  const zoneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Мобилка (грубый курсор / touch)
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setMobile(mq.matches || "ontouchstart" in window);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Предзагрузка всех картинок (чтобы при листании не мигало)
  useEffect(() => {
    imageUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [imageUrls]);

  // Натуральный размер текущей картинки
  useEffect(() => {
    const url = imageUrls[currentIndex];
    if (lastLoadedUrl === url) return;
    const img = new Image();
    img.onload = () => {
      setNatSize({ w: img.naturalWidth, h: img.naturalHeight });
      setLastLoadedUrl(url);
    };
    img.src = url;
  }, [imageUrls, currentIndex, lastLoadedUrl]);

  // Подгон размера картинки под зону (с сохранением пропорций, без увеличения мелких)
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone || !natSize) return;
    const compute = () => {
      const rect = zone.getBoundingClientRect();
      const availW = Math.max(1, rect.width - 4);
      const availH = Math.max(1, rect.height - 4);
      const s = Math.min(availW / natSize.w, availH / natSize.h, 1);
      setFit({
        w: Math.max(1, Math.round(natSize.w * s)),
        h: Math.max(1, Math.round(natSize.h * s)),
      });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(zone);
    return () => ro.disconnect();
  }, [natSize]);

  // Сброс масштаба при смене картинки
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSelectedMarkerId(null);
  }, [currentIndex]);

  // Сортировка точек по времени создания (для нумерации)
  const sortedPoints = useMemo(() => {
    return markers
      .filter((m) => m.type === "point" && m.x !== undefined && m.y !== undefined)
      .sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
  }, [markers]);

  const numberById = useMemo(() => {
    const map = new Map<string, number>();
    sortedPoints.forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [sortedPoints]);

  // Точки на текущей странице (старые без imageIndex показываются на всех)
  const pageMarkers = sortedPoints.filter(
    (m) => m.imageIndex === undefined || m.imageIndex === currentIndex
  );

  const generalMarkers = markers.filter((m) => m.type === "general");

  const currentUrl = imageUrls[currentIndex];
  const selectedMarker = markers.find((m) => m.id === selectedMarkerId) || null;

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  // Ограничиваем сдвиг, чтобы картинка не уезжала за край зоны
  const applyBounds = (pos: { x: number; y: number }, s: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect || !fit) return pos;
    const maxX = Math.max(0, (fit.w * s - rect.width) / 2 / s);
    const maxY = Math.max(0, (fit.h * s - rect.height) / 2 / s);
    return {
      x: clamp(pos.x, -maxX, maxX),
      y: clamp(pos.y, -maxY, maxY),
    };
  };

  // Зум в точку под курсором: точка под курсором остаётся на месте при приближении
  const handleWheel = (e: ReactWheelEvent) => {
    e.preventDefault();
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect || !fit) return;
    const step = 0.12;
    const next = Math.min(
      MAX_SCALE,
      Math.max(1, Math.round((scale + (e.deltaY < 0 ? step : -step)) * 100) / 100)
    );
    if (next === scale) return;
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    // Точка под курсором в координатах фото (stage)
    const px = (mx - position.x) / scale;
    const py = (my - position.y) / scale;
    const newPos = {
      x: mx - next * px,
      y: my - next * py,
    };
    setScale(next);
    setPosition(applyBounds(newPos, next));
  };

  // После изменения масштаба/размера возвращаем картинку в границы
  useEffect(() => {
    setPosition((p) => applyBounds(p, scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, fit]);

  const removeDragListeners = () => {
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", endDrag);
    window.removeEventListener("touchmove", handleWindowTouchMove);
    window.removeEventListener("touchend", endDrag);
  };

  const startDrag = (clientX: number, clientY: number) => {
    if (scale <= 1) return;
    draggingRef.current = true;
    dragMovedRef.current = false;
    suppressClickRef.current = false;
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag);
  };

  const handleWindowMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  };

  const handleWindowTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) dragMovedRef.current = true;
    setPosition(
      applyBounds(
        {
          x: dragStartRef.current.posX + dx,
          y: dragStartRef.current.posY + dy,
        },
        scale
      )
    );
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    if (dragMovedRef.current) suppressClickRef.current = true;
    draggingRef.current = false;
    dragMovedRef.current = false;
    setIsDragging(false);
    removeDragListeners();
  };

  const handleStageClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isDragging || dragMovedRef.current) return;
    if (!canAdd || locked || readOnly) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onAddPoint?.(
      Math.min(1, Math.max(0, x)),
      Math.min(1, Math.max(0, y)),
      currentIndex
    );
  };

  const goToMarker = (m: Marker) => {
    if (m.imageIndex !== undefined && m.imageIndex < imageUrls.length) {
      setCurrentIndex(m.imageIndex);
    }
    setSelectedMarkerId(m.id);
  };

  // Панель списка правок (кабинет)
  const panelList = useMemo(() => {
    let arr = [...sortedPoints];
    if (filter === "page") {
      arr.sort(
        (a, b) =>
          (a.imageIndex ?? 0) - (b.imageIndex ?? 0) ||
          (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
      );
    } else if (filter === "length") {
      arr.sort((a, b) => a.text.length - b.text.length);
    }
    return arr;
  }, [sortedPoints, filter]);

  const filterOptions: { key: Filter; label: string }[] = [
    { key: "order", label: "Порядок" },
    { key: "page", label: "Страницы" },
    { key: "length", label: "Длина" },
  ];

  const panel = (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden bg-bg-card",
        mobile
          ? "h-2/5 border-t border-border-strong"
          : "my-3 ml-3 max-h-full w-72 rounded-2xl border border-border-strong shadow-xl"
      )}
    >
      <div className="flex items-center justify-between border-b border-border-strong px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Правки · {sortedPoints.length}
        </p>
      </div>
      <div className="flex gap-1 border-b border-border-strong px-3 py-2">
        {filterOptions.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setFilter(o.key)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filter === o.key
                ? "bg-text-primary text-bg-page"
                : "text-text-muted hover:bg-bg-cardHover hover:text-text-primary"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {panelList.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => goToMarker(m)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors",
              selectedMarkerId === m.id
                ? "bg-bg-cardHover"
                : "hover:bg-bg-cardHover/60",
              m.done && "opacity-60"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                m.done
                  ? "bg-green-500 text-white"
                  : "bg-text-primary text-bg-page"
              )}
            >
              {numberById.get(m.id)}
            </span>
            <span className="min-w-0 flex-1 break-words text-xs leading-snug text-text-primary">
              {filter === "page" && (
                <span className="mr-1 text-[10px] text-text-muted">
                  стр. {(m.imageIndex ?? 0) + 1} ·
                </span>
              )}
              {m.text}
            </span>
            {onToggleDone && (
              <span
                role="checkbox"
                aria-checked={!!m.done}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDone(m.id, !m.done);
                }}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition-colors",
                  m.done
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-border-strong text-transparent hover:border-text-primary"
                )}
              >
                ✓
              </span>
            )}
          </button>
        ))}
        {generalMarkers.length > 0 && (
          <div className="mt-3 border-t border-border-strong pt-2">
            <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Общие правки · {generalMarkers.length}
            </p>
            {generalMarkers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1.5">
                <span className="min-w-0 flex-1 break-words text-xs leading-snug text-text-primary">
                  {m.text}
                </span>
                {onToggleDone && (
                  <span
                    role="checkbox"
                    aria-checked={!!m.done}
                    onClick={() => onToggleDone(m.id, !m.done)}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition-colors",
                      m.done
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-border-strong text-transparent hover:border-text-primary"
                    )}
                  >
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("relative flex h-full w-full overflow-hidden", className)}>
      {/* Затемнение вокруг зоны фото */}
      {dimAroundZone && zoneRect && (
        <>
          <div
            className="fixed z-40 bg-black/60"
            style={{ top: 0, left: 0, right: 0, height: zoneRect.top }}
            onClick={onDimClick}
          />
          <div
            className="fixed z-40 bg-black/60"
            style={{ top: zoneRect.bottom, left: 0, right: 0, height: `calc(100vh - ${zoneRect.bottom}px)` }}
            onClick={onDimClick}
          />
          <div
            className="fixed z-40 bg-black/60"
            style={{ top: zoneRect.top, left: 0, width: zoneRect.left, height: zoneRect.bottom - zoneRect.top }}
            onClick={onDimClick}
          />
          <div
            className="fixed z-40 bg-black/60"
            style={{ top: zoneRect.top, left: zoneRect.right, right: 0, height: zoneRect.bottom - zoneRect.top }}
            onClick={onDimClick}
          />
        </>
      )}

      {showPanel && !mobile && panel}

      {/* Зона фото */}
      <div
        className={cn(
          "relative flex-1 overflow-hidden bg-bg-page",
          dimAroundZone && "z-50"
        )}
        ref={zoneRef}
        onWheel={handleWheel}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={stageRef}
            className="relative select-none"
            style={{
              width: fit ? fit.w : undefined,
              height: fit ? fit.h : undefined,
              transform:
                scale === 1 && position.x === 0 && position.y === 0
                  ? undefined
                  : `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: "center",
              cursor: scale > 1 ? "grab" : canAdd ? "crosshair" : "default",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              startDrag(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 1)
                startDrag(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onClick={handleStageClick}
          >
            {currentUrl && (
              <img
                src={currentUrl}
                alt={`Макет ${currentIndex + 1}`}
                draggable={false}
                style={fit ? { width: fit.w, height: fit.h, display: "block" } : undefined}
                className={cn(
                  fit ? undefined : "max-h-full max-w-full object-contain",
                  lastLoadedUrl === currentUrl ? undefined : "opacity-0"
                )}
              />
            )}

            {/* Маркеры */}
            {markersShown &&
              pageMarkers.map((m) => (
                <div
                  key={m.id}
                  className="absolute"
                  style={{
                    left: `${(m.x || 0) * 100}%`,
                    top: `${(m.y || 0) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: selectedMarkerId === m.id ? 30 : 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMarkerId(m.id);
                    }}
                    className={cn(
                      "flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white/90 px-1 text-[11px] font-bold shadow-lg transition-transform hover:scale-110",
                      m.done
                        ? "bg-green-500 text-white"
                        : "bg-text-primary text-bg-page",
                      selectedMarkerId === m.id && "scale-125 ring-2 ring-white"
                    )}
                  >
                    {numberById.get(m.id)}
                  </button>
                </div>
              ))}

            {/* Превью точки, которую ставит клиент */}
            {markersShown && pendingPoint && canAdd && !locked && (
              <div
                className="pointer-events-none absolute z-20 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-text-primary/70 px-1 text-[11px] font-bold text-bg-page"
                style={{
                  left: `${pendingPoint.x * 100}%`,
                  top: `${pendingPoint.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {numberById.size + 1}
              </div>
            )}

            {/* Форма добавления правки (клиент) */}
            {pointForm}
          </div>
        </div>

        {/* Счётчик страниц вынесен в шапку (onImageChange) */}

        {/* Тумблер маячков */}
        {showToggle && (
          <button
            type="button"
            onClick={() => {
              if (onToggleMarkers) {
                onToggleMarkers();
              } else {
                setShowMarkers((v) => !v);
              }
              setSelectedMarkerId(null);
            }}
            className="absolute right-3 top-3 z-20 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            {markersShown ? "Без маячков" : "С маячками"}
          </button>
        )}

        {/* Листание */}
        {imageUrls.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex((p) => {
                  const next = Math.max(0, p - 1);
                  onImageChange?.(next);
                  return next;
                });
              }}
              disabled={currentIndex === 0}
              className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-30"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex((p) => {
                  const next = Math.min(imageUrls.length - 1, p + 1);
                  onImageChange?.(next);
                  return next;
                });
              }}
              disabled={currentIndex >= imageUrls.length - 1}
              className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-30"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Карточка выбранного маркера (внизу, только если включена) */}
        {showBottomCard && selectedMarker && (
          <div className="absolute bottom-20 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-white/20 bg-bg-card p-3 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <p className="max-h-[30vh] min-w-0 flex-1 break-words text-sm leading-relaxed text-text-primary">
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-bg-page align-middle">
                  {selectedMarker.type === "general"
                    ? "!"
                    : numberById.get(selectedMarker.id)}
                </span>
                {selectedMarker.text}
              </p>
              <button
                type="button"
                onClick={() => setSelectedMarkerId(null)}
                className="shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {onToggleDone && (
                <button
                  type="button"
                  onClick={() =>
                    onToggleDone(selectedMarker.id, !selectedMarker.done)
                  }
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    selectedMarker.done
                      ? "bg-green-500 text-white"
                      : "border border-border-strong text-text-primary hover:bg-bg-cardHover"
                  )}
                >
                  {selectedMarker.done ? "Сделано ✓" : "Отметить сделанным"}
                </button>
              )}
              {onDeleteMarker && !locked && canDeleteIds?.has(selectedMarker.id) && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMarker(selectedMarker.id);
                    setSelectedMarkerId(null);
                  }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Удалить
                </button>
              )}
            </div>
          </div>
        )}

        {/* Счётчик страниц */}
      </div>

      {showPanel && mobile && panel}
    </div>
  );
}
