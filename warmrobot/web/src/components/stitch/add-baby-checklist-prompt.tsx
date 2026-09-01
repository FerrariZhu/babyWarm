import Link from "next/link";
import { MaterialIcon } from "./material-icon";

/** Shown in「穿搭清单」when the user has no baby profile yet. */
export function AddBabyChecklistPrompt() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-6 text-center cloud-shadow">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/30">
        <MaterialIcon name="child_care" className="text-[28px] text-primary" filled />
      </div>
      <h3 className="font-headline-md mb-1.5 text-on-surface">还没有宝宝档案</h3>
      <p className="font-body-md mb-4 max-w-xs leading-snug text-on-surface-variant">
        添加宝宝信息后即可查看个性化穿搭清单。
      </p>
      <Link
        href="/profile/add"
        className="font-label-md inline-flex min-h-touch-target-min items-center justify-center gap-2 rounded-full bg-primary px-8 text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
      >
        <MaterialIcon name="add" className="text-[20px]" />
        添加宝宝
      </Link>
    </div>
  );
}
