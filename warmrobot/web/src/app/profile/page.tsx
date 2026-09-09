import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfilePageData } from "@/lib/profile";
import { AppShell } from "@/components/stitch/app-shell";
import { MaterialIcon } from "@/components/stitch/material-icon";
import { SignOutButton } from "@/components/sign-out-button";
import { formatBabyAge } from "@/lib/baby-age-display";
import { genderLabel, resolveBabyAvatarUrl, warmthPreferenceLabel, wearsDiaperLabel } from "@/lib/baby-profile";

export default async function ProfilePage() {
  const data = await getProfilePageData();
  if (!data) redirect("/login");

  const { baby, warmthPreference } = data;

  return (
    <AppShell
      babyName={baby?.name}
      avatarUrl={baby?.avatar_url}
      babyGender={baby?.gender}
      headerVariant="centered"
      headerTitle="暖宝宝"
    >
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-section-spacing overflow-y-auto px-container-margin pt-2 pb-5">
        {baby ? (
          <section className="flex items-center gap-4 rounded-2xl bg-primary-fixed/60 p-5">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-surface-variant bg-surface-container shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                width="64" height="64" src={resolveBabyAvatarUrl(baby.avatar_url, baby.gender)}
                alt={baby.name}
                className="h-full w-full object-cover p-1"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <h2 className="font-headline-lg-mobile text-on-background">{baby.name}</h2>
              <p className="font-body-md text-text-soft">
                {formatBabyAge(baby.birth_date)}
                {baby.gender ? ` · ${genderLabel(baby.gender)}` : ""}
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-surface-variant/50 bg-surface-container-lowest p-5 text-center cloud-shadow">
            <MaterialIcon name="child_care" className="mb-2 text-[32px] text-primary/40" />
            <p className="font-body-md mb-3 text-on-surface-variant">暂无宝宝档案</p>
            <Link
              href="/profile/add"
              className="font-label-md inline-flex min-h-touch-target-min items-center justify-center gap-2 rounded-full bg-primary px-6 text-on-primary"
            >
              <MaterialIcon name="add" className="text-[18px]" />
              添加宝宝
            </Link>
          </section>
        )}

        {baby && (
          <section>
            <h3 className="font-headline-md mb-stack-gap text-on-background">宝宝档案</h3>
            <div className="profile-details flex flex-col rounded-2xl bg-surface-container-lowest p-5 cloud-shadow">
              <Field label="姓名">
                <p className="font-body-md rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface">
                  {baby.name}
                </p>
              </Field>
              <Field label="性别">
                <p className="font-body-md rounded-lg border border-primary bg-indoor-surface px-3 py-2 text-primary">
                  {genderLabel(baby.gender) || "—"}
                </p>
              </Field>
              <Field label="生日">
                <p className="font-body-md rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface">
                  {baby.birth_date || "—"}
                </p>
              </Field>
              <div className="grid grid-cols-2 gap-widget-gap">
                <Field label="身高">
                  <p className="font-body-md rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface">
                    {baby.height_cm ? `${Math.round(Number(baby.height_cm))} cm` : "—"}
                  </p>
                </Field>
                <Field label="体重">
                  <p className="font-body-md rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface">
                    {baby.weight_kg ? `${Number(baby.weight_kg).toFixed(1)} kg` : "—"}
                  </p>
                </Field>
              </div>
              <Field label="是否仍穿尿布">
                <p className="font-body-md rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface">
                  {wearsDiaperLabel(baby.wears_diaper)}
                </p>
              </Field>
              <Field
                label="冷暖偏好"
                trailing={
                  <span className="font-label-sm rounded-sm bg-primary/10 px-2 py-0.5 text-primary">
                    {warmthPreferenceLabel(warmthPreference)}
                  </span>
                }
              >
                <p className="font-body-md text-text-soft">可在编辑资料中调整</p>
              </Field>
              <Link
                href="/profile/edit"
                className="font-headline-md flex min-h-touch-target-min w-full items-center justify-center rounded-xl bg-primary py-4 text-on-primary shadow-sm transition-all hover:opacity-90"
              >
                编辑资料
              </Link>
            </div>
          </section>
        )}

        <SignOutButton />
      </main>
    </AppShell>
  );
}

function Field({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="font-label-md text-on-surface-variant">{label}</label>
        {trailing}
      </div>
      {children}
    </div>
  );
}
