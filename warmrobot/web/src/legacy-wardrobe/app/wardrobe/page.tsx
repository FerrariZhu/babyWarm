import { redirect } from "next/navigation";
import { getWardrobePageData } from "@/legacy-wardrobe/lib/wardrobe";
import { AppShell } from "@/components/stitch/app-shell";
import { WardrobeView } from "@/legacy-wardrobe/components/wardrobe-view";

export default async function WardrobePage() {
  const data = await getWardrobePageData();
  if (!data) redirect("/login");

  const { baby, items, materials } = data;

  return (
    <AppShell
      babyName={baby?.name}
      avatarUrl={baby?.avatar_url}
      babyGender={baby?.gender}
      headerVariant="centered"
    >
      <main className="mt-4 flex w-full flex-grow flex-col gap-8 px-margin-mobile md:mx-auto md:max-w-[1200px] md:w-full">
        <WardrobeView items={items} materials={materials} />
      </main>
    </AppShell>
  );
}
