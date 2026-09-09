import { createElement } from "react";
import { garmentIcon } from "@warmrobot/core/admin";

export function MaterialIcon({
  name,
  filled,
  className = "",
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  const icon = garmentIcon(name);
  if (icon) {
    return (
      <svg viewBox={icon.viewBox} width="1em" height="1em" fill="none"
        stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        className={`inline-block shrink-0 align-middle ${className}`} aria-hidden="true" focusable="false">
        {icon.nodes.map(({ tag, attrs }, i) => createElement(tag, { ...attrs, key: i }))}
      </svg>
    );
  }
  return (
    <span
      className={`material-symbols-outlined ${filled ? "fill-icon" : ""} ${className}`}
      aria-hidden
    >
      {name}
    </span>
  );
}
