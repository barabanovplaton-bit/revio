"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createMarker, subscribeToProjectMarkers, type Marker } from "@/lib/markers";

interface MarkerCanvasProps {
  imageUrls: string[];
  projectId: string;
  round: number;
  isLocked: boolean;
}

export function MarkerCanvas({
  imageUrls,
  projectId,
  round,
  isLocked,
}: MarkerCanvasProps) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [pendingMarker, setPendingMarker] = useState<{ x: number; y: number } | null>(null);
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [markerText, setMarkerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Подписка на метки в реалтайме
  useEffect(() => {
    const unsub = subscribeToProjectMarkers(projectId, round, (markers) => {
      setMarkers(markers);
    });
    return () => unsub();
  }, [projectId, round]);

  // Сброс зума при смене картинки
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (isLocked || scale > 1 || isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setPendingMarker({ x, y });
    setMarkerText("");
  };

  const handleSubmitMarker = async () => {
    if (!markerText.trim()) return;

    setIsSubmitting(true);
    try {
      if (pendingMarker) {
        // Точечный маркер
        await createMarker({
          projectId,
          round,
          type: "point",
          x: pendingMarker.x,
          y: pendingMarker.y,
          text: markerText.trim(),
        });
        setPendingMarker(null);
      } else {
        // Общий маркер
        await createMarker({
          projectId,
          round,
          type: "general",
          text: markerText.trim(),
        });
        setShowGeneralForm(false);
      }
      setMarkerText("");
    } catch (error) {
      console.error("Failed to create marker:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMarker = () => {
    setPendingMarker(null);
    setMarkerText("");
  };

  const handleCancelGeneral = () => {
    setShowGeneralForm(false);
    setMarkerText("");
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 1));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNextImage = () => {
    if (currentIndex < imageUrls.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const currentImageUrl = imageUrls[currentIndex];

  return (
    <div className="relative h-full w-full overflow-hidden" ref={containerRef}>
      {/* Контейнер с зумом и паном */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "crosshair" }}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          <img
            ref={imageRef}
            src={currentImageUrl}
            alt="Project"
            className="max-w-full max-h-full object-contain"
            onClick={handleImageClick}
            draggable={false}
          />
        </div>
      </div>

      {/* Метки на картинке */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute cursor-pointer group"
          style={{
            left: `${(marker.x || 0) * 100}%`,
            top: `${(marker.y || 0) * 100}%`,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <div className="relative">
            <div className="h-4 w-4 rounded-full bg-text-primary border-2 border-bg-page shadow-lg group-hover:scale-125 transition-transform" />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 max-w-xs bg-bg-card border border-border-strong rounded-lg px-3 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="text-sm text-text-primary">{marker.text}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Контролы зума */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-bg-card/90 backdrop-blur-sm border border-border-strong rounded-xl p-2">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="p-2 rounded-lg text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-sm text-text-primary min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="p-2 rounded-lg text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Контролы навигации по картинкам */}
      {imageUrls.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevImage}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-bg-card/90 backdrop-blur-sm border border-border-strong text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNextImage}
            disabled={currentIndex === imageUrls.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-bg-card/90 backdrop-blur-sm border border-border-strong text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg-card/90 backdrop-blur-sm border border-border-strong rounded-lg px-3 py-1.5 text-sm text-text-primary">
            {currentIndex + 1} / {imageUrls.length}
          </div>
        </>
      )}

      {/* Форма для точечного маркера */}
      <AnimatePresence>
        {pendingMarker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-10 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-4 w-72"
            style={{
              left: `${pendingMarker.x * 100}%`,
              top: `${pendingMarker.y * 100}%`,
              transform: `translate(-50%, -100%) translateY(-16px) scale(${scale})`,
            }}
          >
            <textarea
              value={markerText}
              onChange={(e) => setMarkerText(e.target.value)}
              placeholder="Опишите правку..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              autoFocus
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelMarker}
                disabled={isSubmitting}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmitMarker}
                disabled={!markerText.trim() || isSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-text-primary px-3 py-1.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Отправка..."
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Отправить
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка общего комментария */}
      {!isLocked && (
        <button
          type="button"
          onClick={() => setShowGeneralForm(true)}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-bg-page shadow-lg transition-all hover:opacity-90"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Общий комментарий</span>
        </button>
      )}

      {/* Форма общего комментария */}
      <AnimatePresence>
        {showGeneralForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 z-10 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-4 w-80"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">Общий комментарий</h3>
              <button
                type="button"
                onClick={handleCancelGeneral}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-cardHover hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={markerText}
              onChange={(e) => setMarkerText(e.target.value)}
              placeholder="Опишите общие правки..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              autoFocus
            />
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSubmitMarker}
                disabled={!markerText.trim() || isSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Отправка..."
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Отправить
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}