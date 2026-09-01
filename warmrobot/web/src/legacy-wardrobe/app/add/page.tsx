import { redirect } from "next/navigation";
import { getAddPageData } from "@/legacy-wardrobe/lib/wardrobe";
import { normalizeCategoryCode } from "@/lib/clothing-categories";
import { AppShell } from "@/components/stitch/app-shell";
import { AddClothingForm } from "@/legacy-wardrobe/components/add-clothing-form";

export default async function AddClothingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const data = await getAddPageData();
  if (!data) redirect("/login");

  const { category: categoryParam } = await searchParams;
  const { baby, materials, sizes, thicknesses } = data;
  const initialCategory = normalizeCategoryCode(categoryParam);

  return (
    <AppShell babyName={baby?.name} avatarUrl={baby?.avatar_url} babyGender={baby?.gender} headerVariant="centered">
      <main className="relative mx-auto flex w-full max-w-md flex-col gap-8 px-margin-mobile pt-6">
        <AddClothingForm
          materials={materials}
          sizes={sizes}
          thicknesses={thicknesses}
          babyId={baby?.id}
          babyProfile={
            baby
              ? {
                  birthDate: baby.birth_date,
                  heightCm: baby.height_cm ?? null,
                  weightKg: baby.weight_kg ?? null,
                }
              : undefined
          }
          initialCategory={initialCategory}
        />
      </main>
    </AppShell>
  );
}
