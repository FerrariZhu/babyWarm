import { redirect } from "next/navigation";
import { AppShell } from "@/components/stitch/app-shell";
import { DressingRecordList } from "@/components/stitch/dressing-record-list";
import { listOwnDressingRecords } from "@/lib/dressing-records/list";
import { getProfilePageData } from "@/lib/profile";

export default async function RecordsPage() {
  const [profileData, records] = await Promise.all([
    getProfilePageData(),
    listOwnDressingRecords(),
  ]);
  if (!profileData || records == null) redirect("/login");

  const { baby } = profileData;

  return (
    <AppShell
      babyName={baby?.name}
      avatarUrl={baby?.avatar_url}
      babyGender={baby?.gender}
      headerVariant="centered"
      headerTitle="穿衣记录"
    >
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-section-spacing px-container-margin pt-2 pb-5">
        <DressingRecordList records={records} />
      </main>
    </AppShell>
  );
}
