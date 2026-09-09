import type { AdviceItem } from "./daily-brief-types";
import { CATEGORY_DISPLAY_LABELS } from "./daily-brief-types";
import { checklistDisplayChips, type ChecklistDisplayChip } from "./checklist-display";

const AXIS_FIELDS = {
  material: "material", fit: "fitType", style: "bodysuitStyle",
  sock_height: "sockHeight", pant_length: "pantLength", thickness: "thickness",
} as const;
export type ChecklistAxis = ChecklistDisplayChip["key"];

function pool(item: AdviceItem): AdviceItem[] {
  return item.selectionVariants ?? [];
}

function closest(current: AdviceItem, candidates: AdviceItem[]): AdviceItem {
  const score = (candidate: AdviceItem) => Object.values(AXIS_FIELDS).reduce(
    (sum, field) => sum + (candidate[field] === current[field] ? 1 : 0), 0
  );
  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/** One entry per eligible category; fabric and style never become category rows. */
export function checklistCategoryChoices(item: AdviceItem) {
  const groups = new Map<string, AdviceItem[]>();
  for (const candidate of [item, ...pool(item)]) {
    if (!candidate.category) continue;
    groups.set(candidate.category, [...(groups.get(candidate.category) ?? []), candidate]);
  }
  return [...groups].map(([value, candidates]) => ({
    value,
    label: CATEGORY_DISPLAY_LABELS[candidates[0].category!] ?? candidates[0].label,
    item: closest(item, candidates),
  }));
}

/** Each choice selects a real eligible row, preserving other axes where possible. */
export function checklistAxisChoices(item: AdviceItem, axis: ChecklistAxis) {
  const field = AXIS_FIELDS[axis];
  const groups = new Map<string, AdviceItem[]>();
  for (const candidate of [item, ...pool(item)]) {
    if (candidate.category !== item.category || candidate.hatKind !== item.hatKind) continue;
    const value = candidate[field];
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), candidate]);
  }
  return [...groups].map(([value, candidates]) => {
    const selected = closest(item, candidates);
    const label = checklistDisplayChips(selected).find((chip) => chip.key === axis)?.value ?? value;
    return { value, label, item: selected };
  });
}

export function checklistAxisValue(item: AdviceItem, axis: ChecklistAxis): string {
  return item[AXIS_FIELDS[axis]] ?? "";
}

/** Keep the original weather-filtered pool fixed across repeated edits. */
export function applyChecklistSelection(current: AdviceItem, selected: AdviceItem): AdviceItem | null {
  if (selected !== current && !pool(current).includes(selected)) return null;
  const { alternatives: _alternatives, alternativeGroups: _groups, selectionVariants: _pool, ...value } = selected;
  return { ...value, selectionVariants: current.selectionVariants };
}
