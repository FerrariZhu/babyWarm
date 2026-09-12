import { redirect } from "next/navigation";
import { getProfilePageData } from "@/lib/profile";
import { AppShell } from "@/components/stitch/app-shell";
import { AddBabyForm } from "@/components/stitch/add-baby-form";

export default async function AddBabyPage() {
  const data = await getProfilePageData();
  if (!data) redirect("/login");
  if (data.baby) redirect("/profile");

  return (
    <AppShell headerVariant="centered" showNav={false}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[60%] rounded-full bg-primary-fixed-dim/20 blur-[100px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[50%] w-[50%] rounded-full bg-secondary-fixed-dim/10 blur-[120px]" />
      </div>
      <main data-analytics-module="add_baby_form" className="relative z-10 mx-auto max-w-[768px] px-margin-mobile pt-8 pb-32 md:px-margin-desktop md:pt-12">
        <AddBabyForm redirectTo="/" />
      </main>
    </AppShell>
  );
}
