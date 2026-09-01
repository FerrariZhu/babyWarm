"use client";

import type { AdminStyleGuide } from "@/lib/admin/style-guide-types";

type Props = {
  categoryId: string;
  categoryCode: string;
  categoryNameZh: string;
  initialGuides: AdminStyleGuide[];
  onGuidesChange?: (guides: AdminStyleGuide[]) => void;
};

/** Legacy panel — copy editing moved to garment_variants rows below. */
export function StyleGuideAdminPanel({
  categoryNameZh,
  initialGuides,
}: Props) {
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm">
      <h3 className="font-headline-md text-on-background">款式说明（已迁移）</h3>
      <p className="font-body-md mt-2 text-text-soft">
        优劣势与适用场景已迁至下方「细类型」表，每条属性组合独立维护。C 端点击「
        {categoryNameZh}」清单卡片时，展示该品类下全部活跃细类型文案。
      </p>
      {initialGuides.length > 0 ? (
        <p className="font-label-sm mt-3 text-on-surface-variant/80">
          旧版运营精选款式说明（{initialGuides.length} 条）仍保留在数据库中，C
          端已不再读取。
        </p>
      ) : null}
    </div>
  );
}
