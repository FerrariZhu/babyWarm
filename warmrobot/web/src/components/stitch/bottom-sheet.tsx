"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { MaterialIcon } from "./material-icon";

const SHEET_CLOSE_MS = 280;

type BottomSheetSize = "hug" | "tall";

export function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
  toolbar,
  footer,
  size = "hug",
  labelledBy,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  size?: BottomSheetSize;
  labelledBy?: string;
}) {
  const generatedId = useId();
  const titleId = labelledBy ?? generatedId;
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(onClose, SHEET_CLOSE_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [requestClose]);

  const panelHeight =
    size === "tall"
      ? "h-[90vh] max-h-[90vh] md:h-auto md:max-h-[90vh]"
      : "max-h-[85vh] md:max-h-[min(85vh,40rem)]";

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center bg-on-background/40 backdrop-blur-sm md:items-center md:p-6 ${
        isClosing ? "sheet-backdrop-out" : "sheet-backdrop-in"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={requestClose}
    >
      <div
        className={`flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface-container-lowest shadow-[0px_-8px_32px_rgba(0,0,0,0.12)] md:rounded-2xl ${panelHeight} ${
          isClosing ? "sheet-slide-down" : "sheet-slide-up"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-outline-variant/80" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-2">
          <div className="min-w-0">
            {subtitle ? (
              <p className="font-label-sm text-on-surface-variant">{subtitle}</p>
            ) : null}
            <h2 id={titleId} className="font-headline-md truncate text-on-surface">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="关闭"
          >
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        {toolbar ? <div className="shrink-0 px-4 pb-3">{toolbar}</div> : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-surface-container-high px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3">
            {footer}
          </div>
        ) : (
          <div className="h-[env(safe-area-inset-bottom,0px)]" />
        )}
      </div>
    </div>
  );
}
