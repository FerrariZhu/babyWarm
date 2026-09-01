import { redirect } from "next/navigation";
import { getAddPageData } from "@/legacy-wardrobe/lib/wardrobe";
import { AppShell } from "@/components/stitch/app-shell";
import { ScanWardrobeForm } from "@/legacy-wardrobe/components/scan-wardrobe-form";
import { suggestBabyCurrentSize } from "@/lib/suggest-size";

export default async function ScanWardrobePage() {
  const data = await getAddPageData();
  if (!data) redirect("/login");

  const { baby, materials, sizes, thicknesses } = data;
  const defaultSizeLabel = baby?.birth_date
    ? suggestBabyCurrentSize({ birthDate: baby.birth_date })
    : null;

  return (
    <AppShell
      babyName={baby?.name}
      avatarUrl={baby?.avatar_url}
      babyGender={baby?.gender}
      headerVariant="centered"
    >
      <main className="relative mx-auto flex w-full max-w-md flex-col px-margin-mobile pt-6">
        <ScanWardrobeForm
          materials={materials}
          sizes={sizes}
          thicknesses={thicknesses}
          babyId={baby?.id}
          defaultSizeLabel={defaultSizeLabel}
        />
      </main>
    </AppShell>
  );
}
