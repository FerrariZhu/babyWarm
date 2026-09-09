"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { AdviceItem } from "@warmrobot/core/client";
import { createPortal } from "react-dom";
import { MaterialIcon } from "./material-icon";

type Choice = { value: string; label: string; item: AdviceItem };

export function GarmentChoicePicker({ label, garment, value, choices, onSelect, iconOnly = false }: {
  label: string;
  garment: string;
  value: string;
  choices: Choice[];
  onSelect: (item: AdviceItem) => void;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220, maxHeight: 300 });
  const current = choices.find((choice) => choice.value === value);

  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const below = window.innerHeight - anchor.bottom - 20;
    const above = anchor.top - 20;
    const maxHeight = Math.max(48, Math.min(300, Math.max(below, above)));
    const height = Math.min(panel.current.scrollHeight, maxHeight);
    const width = Math.min(Math.max(anchor.width, 220), window.innerWidth - 24);
    setPosition({
      width, maxHeight,
      left: Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12)),
      top: below >= height || below >= above ? anchor.bottom + 8 : Math.max(12, anchor.top - height - 8),
    });
    panel.current.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
    const outside = (event: Event) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", outside, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", outside, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return <span className={`garment-picker ${iconOnly ? "" : "garment-picker--field"}`}>
    <button ref={trigger} type="button" className={`garment-picker-trigger ${iconOnly ? "garment-picker-trigger--icon" : ""}`}
      aria-label={`${garment}：选择${label}`} aria-haspopup="listbox" aria-controls={open ? listId : undefined} aria-expanded={open} onClick={() => setOpen(!open)}
      onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}>
      {!iconOnly ? <><span className="garment-field-label">{label}</span><span className="garment-field-value">{current?.label ?? value}</span></> : null}
      <MaterialIcon name="expand_more" className="text-[20px]" />
    </button>
    {open ? createPortal(
      <div ref={panel} id={listId} role="listbox" aria-label={`${garment}：选择${label}`}
        className="garment-choice-popover" style={position}
        onKeyDown={(event) => {
          if (event.key === "Escape" || event.key === "Tab") {
            if (event.key === "Escape") event.preventDefault();
            close(); return;
          }
          const options = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
          const index = options.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "ArrowDown" ? (index + 1) % options.length
            : event.key === "ArrowUp" ? (index - 1 + options.length) % options.length
            : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : -1;
          if (next >= 0) { event.preventDefault(); options[next]?.focus(); }
        }}>
        {choices.map((choice) => <button key={choice.value} type="button" role="option" tabIndex={-1}
          className="garment-choice-option" aria-selected={choice.value === value}
          onClick={() => { onSelect(choice.item); close(); }}>
          <span>{choice.label}</span>
          {choice.value === value ? <MaterialIcon name="check" /> : null}
        </button>)}
      </div>, document.body
    ) : null}
  </span>;
}
