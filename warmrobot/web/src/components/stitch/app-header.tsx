import Link from "next/link";
import { MaterialIcon } from "./material-icon";
import { resolveBabyAvatarUrl } from "@/lib/baby-profile";
import type { BabyGender } from "@/lib/baby-profile";

type HeaderVariant = "brand" | "centered";

export function AppHeader({
  babyName,
  avatarUrl,
  babyGender,
  variant = "brand",
  title = "暖宝宝",
}: {
  babyName?: string;
  avatarUrl?: string | null;
  babyGender?: BabyGender | string | null;
  variant?: HeaderVariant;
  title?: string;
}) {
  const avatarSrc = resolveBabyAvatarUrl(avatarUrl, babyGender);

  if (variant === "centered") {
    return (
      <header data-analytics-module="page_header" className="sticky top-0 z-40 flex w-full items-center justify-center bg-background px-container-margin pt-safe-offset pb-2.5">
        <h1 className="font-headline-md text-primary">{title}</h1>
      </header>
    );
  }

  return (
    <header data-analytics-module="page_header" className="home-nav">
      <div className="home-nav-inner">
        <div className="home-nav-copy">
          <h1 className="home-nav-title">{title}</h1>
          <p className="home-nav-subtitle">
            <span>好天气，陪你和宝贝一起长大</span>
            <MaterialIcon name="favorite_border" className="home-nav-heart" />
          </p>
        </div>

        <div className="home-nav-profile-group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/pencil-system/navigation/eucalyptus-sprig-v1.png"
            alt=""
            aria-hidden="true"
            className="home-nav-sprig"
          />
          <Link
            href={babyName ? "/profile" : "/profile/add"}
            className="home-nav-baby"
            aria-label={babyName ? `查看${babyName}的宝宝档案` : "添加宝宝档案"}
          >
            <span className="home-nav-avatar" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img width="56" height="56" src={avatarSrc} alt="" />
            </span>
            <span className="home-nav-baby-name">{babyName ?? "添加宝宝"}</span>
            <MaterialIcon name="chevron_right" className="home-nav-chevron" />
          </Link>
        </div>
      </div>
    </header>
  );
}
