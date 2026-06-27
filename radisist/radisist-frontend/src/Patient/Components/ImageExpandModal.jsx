import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Minus, PenSquare, Plus, Save, X } from "lucide-react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rectFromPoints(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

export default function ImageExpandModal({ isOpen, imageSrc, onClose, onSaveCrop, saving = false }) {
  const imageRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [drawMode, setDrawMode] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [draftRect, setDraftRect] = useState(null);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setDrawMode(false);
      setDragStart(null);
      setDraftRect(null);
      setSelection(null);
    }
  }, [isOpen]);

  const activeRect = useMemo(() => draftRect || selection, [draftRect, selection]);

  if (!isOpen || !imageSrc) {
    return null;
  }

  const getRelativePoint = (event) => {
    const image = imageRef.current;
    if (!image) {
      return null;
    }

    const bounds = image.getBoundingClientRect();
    const x = clamp(event.clientX - bounds.left, 0, bounds.width);
    const y = clamp(event.clientY - bounds.top, 0, bounds.height);
    return { x, y };
  };

  const handlePointerDown = (event) => {
    if (!drawMode) {
      return;
    }

    const point = getRelativePoint(event);
    if (!point) {
      return;
    }

    setDragStart(point);
    setDraftRect({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (event) => {
    if (!drawMode || !dragStart) {
      return;
    }

    const point = getRelativePoint(event);
    if (!point) {
      return;
    }

    setDraftRect(rectFromPoints(dragStart, point));
  };

  const handlePointerUp = (event) => {
    if (!drawMode || !dragStart) {
      return;
    }

    const point = getRelativePoint(event);
    if (!point) {
      setDragStart(null);
      setDraftRect(null);
      return;
    }

    const nextSelection = rectFromPoints(dragStart, point);
    if (nextSelection.width < 12 || nextSelection.height < 12) {
      setSelection(null);
    } else {
      setSelection(nextSelection);
    }
    setDragStart(null);
    setDraftRect(null);
  };

  const handleSave = async () => {
    const image = imageRef.current;
    if (!image || !selection) {
      return;
    }

    const bounds = image.getBoundingClientRect();
    const scaleX = image.naturalWidth / bounds.width;
    const scaleY = image.naturalHeight / bounds.height;

    const cropX = Math.round(selection.x * scaleX);
    const cropY = Math.round(selection.y * scaleY);
    const cropWidth = Math.round(selection.width * scaleX);
    const cropHeight = Math.round(selection.height * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const context = canvas.getContext("2d");
    context.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      return;
    }

    await onSaveCrop({
      blob,
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-[#7d1f3f]">Expand Image</h2>
            <p className="text-sm text-gray-500">Zoom in, draw a crop box, and save the region for later review.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 p-3 text-gray-500 transition hover:border-[#7d1f3f] hover:text-[#7d1f3f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row">
          <div className="flex-1 overflow-hidden rounded-[1.75rem] border border-gray-100 bg-[#f7f7fb] p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((value) => clamp(value + 0.25, 1, 3))}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#7d1f3f] transition hover:border-[#7d1f3f]"
              >
                <Plus size={16} /> Zoom In
              </button>
              <button
                type="button"
                onClick={() => setZoom((value) => clamp(value - 0.25, 1, 3))}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#7d1f3f] transition hover:border-[#7d1f3f]"
              >
                <Minus size={16} /> Zoom Out
              </button>
              <button
                type="button"
                onClick={() => setDrawMode((value) => !value)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${drawMode ? "bg-[#7d1f3f] text-white" : "border border-gray-200 text-[#7d1f3f] hover:border-[#7d1f3f]"}`}
              >
                <PenSquare size={16} /> {drawMode ? "Drawing Enabled" : "Draw Box"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelection(null);
                  setDraftRect(null);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 transition hover:border-gray-300"
              >
                <ImagePlus size={16} /> Clear Box
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto rounded-[1.5rem] bg-white p-4">
              <div className="relative mx-auto w-fit">
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Expanded scan"
                  style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
                  className="select-none rounded-[1.25rem] border border-gray-100 shadow-sm"
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  draggable={false}
                />

                {activeRect && imageRef.current && (
                  <div
                    className="pointer-events-none absolute border-2 border-[#7d1f3f] bg-[#7d1f3f]/10 shadow-[0_0_0_9999px_rgba(125,31,63,0.1)]"
                    style={{
                      left: `${activeRect.x}px`,
                      top: `${activeRect.y}px`,
                      width: `${activeRect.width}px`,
                      height: `${activeRect.height}px`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="w-full rounded-[1.75rem] border border-gray-100 bg-[#fcfbfd] p-6 lg:w-[320px]">
            <h3 className="text-lg font-bold text-[#7d1f3f]">Crop Workspace</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Draw a box over the region you want to preserve. The selected crop can be saved and attached to this scan.
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#7d1f3f]/25 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7d1f3f]/70">Selection</p>
              {selection ? (
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p><span className="font-semibold text-gray-900">X:</span> {Math.round(selection.x)}</p>
                  <p><span className="font-semibold text-gray-900">Y:</span> {Math.round(selection.y)}</p>
                  <p><span className="font-semibold text-gray-900">Width:</span> {Math.round(selection.width)}</p>
                  <p><span className="font-semibold text-gray-900">Height:</span> {Math.round(selection.height)}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">No crop selected yet. Enable draw mode and drag a box over the image.</p>
              )}
            </div>

            <button
              type="button"
              disabled={!selection || saving}
              onClick={handleSave}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7d1f3f] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#641831] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} /> {saving ? "Saving Crop..." : "Save Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
