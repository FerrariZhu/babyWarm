"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  describeSwapCurrentRow,
  describeSwapOptionRow,
  type AdviceItem,
  type SlotSwapGroup,
  type SlotSwapOption,
  type SwapPickerRow,
} from "@warmrobot/core/client";

const POPOVER_WIDTH = 280;
const VIEWPORT_MARGIN = 12;
const GAP = 8;

type Props = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  current: AdviceItem;
  alternatives: SlotSwapOption[];
  alternativeGroups?: SlotSwapGroup[];
  onSelect: (index: number) => void;
  onClose: () => void;
};

type PopoverPosition = {
  top: number;
  left: number;
  placement: "below" | "above";
};

function WarmthPill({
  value,
  tone,
}: {
  value: number;
  tone: "current" | "option";
}) {
  const className =
    tone === "current"
      ? "shrink-0 rounded-full border border-primary/20 bg-surface px-2 py-0.5 font-label-sm tabular-nums text-primary"
      : "shrink-0 rounded-full border border-outline-variant/30 bg-surface-container/80 px-2 py-0.5 font-label-sm tabular-nums text-on-surface-variant";
  return (
    <span className={className} aria-label={`穿衣指数 ${value}`}>
      指数 {value}
    </span>
  );
}

function optionAriaLabel(row: SwapPickerRow): string {
  const parts = [row.title];
  if (row.detail) parts.push(row.detail);
  if (row.showWarmth && row.warmthValue != null) parts.push(`指数 ${row.warmthValue}`);
  return parts.join("，");
}

function CurrentRow({ item }: { item: AdviceItem }) {
  const row = describeSwapCurrentRow(item);
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/8 px-3 py-2.5"
      aria-current="true"
    >
      <div className="min-w-0 flex-1">
        <p className="font-label-sm mb-1 text-primary">当前</p>
        <p className="font-label-md font-medium text-on-surface">{row.title}</p>
        {row.detail ? (
          <p className="mt-0.5 font-label-sm leading-snug text-on-surface-variant">
            {row.detail}
          </p>
        ) : null}
      </div>
      {row.showWarmth && row.warmthValue != null ? (
        <WarmthPill value={row.warmthValue} tone="current" />
      ) : null}
    </div>
  );
}

function OptionRow({
  option,
  current,
  onSelect,
}: {
  option: SlotSwapOption;
  current: AdviceItem;
  onSelect: () => void;
}) {
  const row = describeSwapOptionRow(option, current);

  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      aria-label={optionAriaLabel(row)}
      onClick={onSelect}
      className="flex min-h-12 w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-primary/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
    >
      <div className="min-w-0 flex-1">
        <p className="font-label-md text-on-surface">{row.title}</p>
        {row.detail ? (
          <p className="mt-0.5 font-label-sm leading-snug text-on-surface-variant">
            {row.detail}
          </p>
        ) : null}
      </div>
      {row.showWarmth && row.warmthValue != null ? (
        <WarmthPill value={row.warmthValue} tone="option" />
      ) : null}
    </button>
  );
}

function computePosition(
  anchor: HTMLElement,
  popoverHeight: number
): PopoverPosition {
  const rect = anchor.getBoundingClientRect();
  const maxLeft = window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN;
  const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - POPOVER_WIDTH, maxLeft));

  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const preferBelow = spaceBelow >= popoverHeight || spaceBelow >= spaceAbove;

  if (preferBelow) {
    return { top: rect.bottom + GAP, left, placement: "below" };
  }
  return { top: rect.top - popoverHeight - GAP, left, placement: "above" };
}

function flatIndexForGroupOption(
  alternatives: SlotSwapOption[],
  groups: SlotSwapGroup[],
  groupIndex: number,
  optionIndex: number
): number {
  let offset = 0;
  for (let g = 0; g < groupIndex; g++) {
    offset += groups[g]!.options.length;
  }
  return offset + optionIndex;
}

export function SlotSwapPopover({
  open,
  anchorRef,
  current,
  alternatives,
  alternativeGroups,
  onSelect,
  onClose,
}: Props) {
  const listId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  const groups =
    alternativeGroups && alternativeGroups.length > 0 ? alternativeGroups : null;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;
    const height = popover.offsetHeight || 160;
    setPosition(computePosition(anchor, height));
  }, [anchorRef]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, alternatives.length, groups?.length, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onScrollOrResize = () => updatePosition();

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, onClose, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, anchorRef]);

  if (!open || !mounted) return null;

  const style = position
    ? { top: position.top, left: position.left, width: POPOVER_WIDTH }
    : { top: -9999, left: -9999, width: POPOVER_WIDTH, visibility: "hidden" as const };

  return createPortal(
    <div
      ref={popoverRef}
      role="listbox"
      id={listId}
      aria-label={`${current.label} 的其他可选类型`}
      className="popover-fade-in fixed z-[70] overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0px_8px_24px_rgba(0,0,0,0.12),0px_2px_8px_rgba(0,0,0,0.06)]"
      style={style}
      onTransitionEnd={() => {
        if (open && !position) updatePosition();
      }}
    >
      {position ? (
        <span
          aria-hidden
          className={`absolute h-2.5 w-2.5 rotate-45 border-outline-variant/40 bg-surface-container-lowest ${
            position.placement === "below"
              ? "-top-1.5 right-4 border-l border-t"
              : "-bottom-1.5 right-4 border-b border-r"
          }`}
        />
      ) : null}

      <div className="relative p-2 pb-1.5">
        <CurrentRow item={current} />
      </div>

      <div className="max-h-[min(240px,50vh)] overflow-y-auto px-2 pb-2 pt-0.5">
        {groups ? (
          groups.map((group, groupIndex) => (
            <section key={group.id} aria-label={group.title}>
              <p className="px-3 pb-0.5 pt-2 font-label-sm text-on-surface-variant/60">
                {group.title}
              </p>
              <ul>
                {group.options.map((option, optionIndex) => {
                  const flatIndex = flatIndexForGroupOption(
                    alternatives,
                    groups,
                    groupIndex,
                    optionIndex
                  );
                  return (
                    <li key={`${group.id}:${option.item.id}:${flatIndex}`}>
                      <OptionRow
                        option={option}
                        current={current}
                        onSelect={() => onSelect(flatIndex)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <ul>
            {alternatives.map((option, index) => (
              <li key={`${option.item.id}:${option.item.label}:${index}`}>
                <OptionRow
                  option={option}
                  current={current}
                  onSelect={() => onSelect(index)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}
