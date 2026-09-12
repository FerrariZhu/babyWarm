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
  outfitItems: AdviceItem[];
  index: number;
  selected: AdviceItem;
  requiredWarmth: number;
  bottomSuggestion?: AdviceItem;
  bottomDecision?: "keep" | "remove";
};
export type CompleteSelectionResult = {
  outfitItems: AdviceItem[];
  notice: string;
  needsBottomDecision?: boolean;
  error?: string;
};

/** Transactional: callers commit the complete outfit only after any user decision. */
export function completeChecklistSelection(input: CompleteSelectionInput): CompleteSelectionResult {
  const unchanged = { outfitItems: input.outfitItems, notice: "" };
  const previous = input.outfitItems[input.index];
  const selected = previous && applyChecklistSelection(previous, input.selected);
  if (!selected) return { ...unchanged, error: "这个选项已失效，请重新选择。" };
  selected.userModified = true;
  selected.autoAddedBottom = previous.autoAddedBottom;
  let outfitItems = input.outfitItems.map((item, index) => ({ ...(index === input.index ? selected : item) }));
  let notice = `已选择${selected.label}`;

  if (selected.outfitSlot === "base_top") {
    const needsBottom = topNeedsBottom(selected, input.requiredWarmth);
    const bottoms = outfitItems.filter((item) => item.outfitSlot === "bottom");
    if (needsBottom && bottoms.length === 0) {
      if (!input.bottomSuggestion) return { ...unchanged, error: "这件上衣需要搭配裤子，但当前没有符合天气和保暖范围的裤装，暂时无法切换。" };
      const added = { ...input.bottomSuggestion, autoAddedBottom: true, userModified: false };
      const topIndex = outfitItems.findIndex((item) => item.outfitSlot === "base_top");
      outfitItems.splice(topIndex < 0 ? outfitItems.length : topIndex + 1, 0, added);
      notice += `，已补充${added.label}，可调整`;
    } else if (!needsBottom) {
      const userBottoms = bottoms.filter((item) => item.userModified);
      if (userBottoms.length && topNeedsBottom(previous, input.requiredWarmth) && !input.bottomDecision) {
        return { ...unchanged, needsBottomDecision: true, notice: "这款包屁衣已满足当前下身穿搭需求。你调整过的裤子要保留吗？" };
      }
      const remove = (item: AdviceItem) => item.outfitSlot === "bottom" && (
        (item.autoAddedBottom && !item.userModified) ||
        (item.userModified && input.bottomDecision === "remove")
      );
      const count = outfitItems.filter(remove).length;
      outfitItems = outfitItems.filter((item) => !remove(item));
      if (count) notice += "，已移除不再需要的裤装";
      if (input.bottomDecision === "keep") notice += "，已保留你选择的裤子";
    }
  }
  applyOutfitIndex(outfitItems, input.requiredWarmth);
  return { outfitItems, notice };
}
