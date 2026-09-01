import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MaterialIcon } from "@/components/stitch/material-icon";
import { breathabilityBadgeLabel, type Breathability } from "@/legacy-wardrobe/lib/clothing-display";

export default async function AddSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) redirect("/add");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("clothing_items")
    .select("id, name, size_label, breathability, image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!item) redirect("/add");

  const breathLabel = item.breathability
    ? breathabilityBadgeLabel(item.breathability as Breathability)
    : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-on-background">
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary-fixed-dim/30 blur-[100px]" />
      <div className="pointer-events-none fixed right-[-10%] bottom-[-10%] h-[50%] w-[50%] rounded-full bg-secondary-fixed-dim/20 blur-[100px]" />

      <main className="squishy-entrance z-10 flex w-full max-w-md flex-col items-center px-margin-mobile text-center">
        <div className="relative mb-6 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary-fixed opacity-40 blur-2xl" />
          <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-lowest cloud-shadow icon-pop">
            <MaterialIcon name="check_circle" filled className="text-[64px] text-primary" />
          </div>
        </div>

        <h1 className="font-display-lg-mobile mb-3 text-on-surface">添加成功</h1>
        <p className="font-body-lg mb-10 max-w-[280px] text-on-surface-variant">
          {item.name}已存入衣柜
        </p>

        <div className="mb-12 flex w-full transform items-center gap-4 rounded-[2rem] bg-surface-container-lowest p-4 cloud-shadow transition-transform duration-300 hover:scale-[1.02]">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.5rem] bg-surface-container">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MaterialIcon name="checkroom" className="text-[32px] text-primary/30" />
              </div>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="font-data-heavy mb-1 text-on-surface">{item.name}</div>
            <div className="flex items-center gap-2">
              {breathLabel && (
                <span className="font-label-caps inline-flex items-center rounded-full bg-tertiary-fixed px-2 py-1 text-on-tertiary-fixed">
                  <MaterialIcon name="air" className="mr-1 text-[14px]" />
                  {breathLabel}
                </span>
              )}
              {item.size_label && (
                <span className="text-sm text-on-surface-variant">{item.size_label}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Link
            href="/wardrobe"
            className="font-label-caps flex h-[56px] w-full items-center justify-center gap-2 rounded-full bg-primary text-on-primary shadow-[0_8px_24px_rgba(62,102,88,0.2)] transition-transform duration-200 active:scale-95"
          >
            <MaterialIcon name="checkroom" className="text-[20px]" />
            回到衣柜
          </Link>
          <Link
            href="/add"
            className="font-label-caps flex h-[56px] w-full items-center justify-center gap-2 rounded-full bg-surface-container text-on-surface transition-transform duration-200 hover:bg-surface-container-high active:scale-95"
          >
            <MaterialIcon name="add" className="text-[20px]" />
            继续添加
          </Link>
        </div>
      </main>
    </div>
  );
}
