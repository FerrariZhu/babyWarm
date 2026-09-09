import { applyOutfitIndex } from "./checklist-warmth";
import type { AdviceItem } from "./daily-brief-types";
import { applyChecklistSelection } from "./checklist-selection";

/** Bare-leg bodysuits need another layer outside the hot band; long-leg styles cover it. */
export function topNeedsBottom(top: AdviceItem, requiredWarmth: number): boolean {
  if (top.category?.startsWith("bodysuit_")) {
    return top.bodysuitStyle !== "long_leg" && requiredWarmth >= 25;
  }
  return top.outfitSlot === "base_top";
}

export type CompleteSelectionInput = {
  indoorItems: AdviceItem[];
  outdoorAdditions: AdviceItem[];
  zone: "indoor" | "outdoor";
  index: number;
  selected: AdviceItem;
  requiredWarmth: number;
  bottomSuggestion?: AdviceItem;
  bottomDecision?: "keep" | "remove";
};
export type CompleteSelectionResult = {
  indoorItems: AdviceItem[];
  outdoorAdditions: AdviceItem[];
  notice: string;
  needsBottomDecision?: boolean;
  error?: string;
};

/** Transactional: callers commit both zones together, only after any user decision. */
export function completeChecklistSelection(input: CompleteSelectionInput): CompleteSelectionResult {
  const unchanged = { indoorItems: input.indoorItems, outdoorAdditions: input.outdoorAdditions, notice: "" };
  const list = input.zone === "indoor" ? input.indoorItems : input.outdoorAdditions;
  const previous = list[input.index];
  const selected = previous && applyChecklistSelection(previous, input.selected);
  if (!selected) return { ...unchanged, error: "这个选项已失效，请重新选择。" };
  selected.userModified = true;
  selected.autoAddedBottom = previous.autoAddedBottom;
  let indoor = input.indoorItems.map((item, index) => ({ ...(input.zone === "indoor" && index === input.index ? selected : item) }));
  let outdoor = input.outdoorAdditions.map((item, index) => ({ ...(input.zone === "outdoor" && index === input.index ? selected : item) }));
  let notice = `已选择${selected.label}`;

  if (selected.outfitSlot === "base_top") {
    const needsBottom = topNeedsBottom(selected, input.requiredWarmth);
    const bottoms = [...indoor, ...outdoor].filter((item) => item.outfitSlot === "bottom");
    if (needsBottom && bottoms.length === 0) {
      if (!input.bottomSuggestion) return { ...unchanged, error: "这件上衣需要搭配裤子，但当前没有符合天气和保暖范围的裤装，暂时无法切换。" };
      const added = { ...input.bottomSuggestion, autoAddedBottom: true, userModified: false };
      const topIndex = indoor.findIndex((item) => item.outfitSlot === "base_top");
      indoor.splice(topIndex < 0 ? indoor.length : topIndex + 1, 0, added);
      notice += `，已补充${added.label}，可调整`;
    } else if (needsBottom && !indoor.some((item) => item.outfitSlot === "bottom")) {
      indoor.push(...outdoor.filter((item) => item.outfitSlot === "bottom"));
      outdoor = outdoor.filter((item) => item.outfitSlot !== "bottom");
      notice += "，已将裤装移入家里穿";
    } else if (!needsBottom) {
      const userBottoms = bottoms.filter((item) => item.userModified);
      if (userBottoms.length && topNeedsBottom(previous, input.requiredWarmth) && !input.bottomDecision) {
        return { ...unchanged, needsBottomDecision: true, notice: "这款包屁衣已满足当前下身穿搭需求。你调整过的裤子要保留吗？" };
      }
      const remove = (item: AdviceItem) => item.outfitSlot === "bottom" && (
        (item.autoAddedBottom && !item.userModified) ||
        (item.userModified && input.bottomDecision === "remove")
      );
      const count = [...indoor, ...outdoor].filter(remove).length;
      indoor = indoor.filter((item) => !remove(item));
      outdoor = outdoor.filter((item) => !remove(item));
      if (count) notice += "，已移除不再需要的裤装";
      if (input.bottomDecision === "keep") notice += "，已保留你选择的裤子";
    }
  }
  applyOutfitIndex(indoor, outdoor, input.requiredWarmth);
  return { indoorItems: indoor, outdoorAdditions: outdoor, notice };
}
