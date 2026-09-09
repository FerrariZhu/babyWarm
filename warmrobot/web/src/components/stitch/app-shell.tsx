import { AppHeader } from "@/components/stitch/app-header";
import { BottomNav } from "@/components/stitch/bottom-nav";

export function AppShell({
  children,
  babyName,
  avatarUrl,
  babyGender,
  headerVariant = "brand",
  headerTitle,
  showNav = true,
}: {
  children: React.ReactNode;
  babyName?: string;
  avatarUrl?: string | null;
  babyGender?: import("@/lib/baby-profile").BabyGender | string | null;
  headerVariant?: "brand" | "centered" | "none";
  headerTitle?: string;
  showNav?: boolean;
}) {
  return (
    <div
      className={`app-shell flex min-h-screen flex-col items-center bg-background text-on-background ${
        headerVariant === "none" ? "pt-safe" : ""
      }`}
    >
      {headerVariant !== "none" && (
        <AppHeader
          babyName={babyName}
          avatarUrl={avatarUrl}
          babyGender={babyGender}
          variant={headerVariant}
          title={headerTitle}
        />
      )}
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
