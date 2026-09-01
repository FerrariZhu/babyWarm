import { redirect } from "next/navigation";
import { getHomeDailyBriefPageData } from "@/lib/daily-brief/get-home-daily-brief";
import { resolveHourOverride } from "@/lib/daily-brief/format";
import { AppShell } from "@/components/stitch/app-shell";
import { LiveWeatherSection } from "@/components/stitch/live-weather-section";
import { DailyAdviceSection } from "@/components/stitch/daily-advice-section";
import { MaterialIcon } from "@/components/stitch/material-icon";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ refresh?: string; at?: string }>;
}) {
  const params = await searchParams;
  const force = params.refresh === "1";
  const hourOverride = resolveHourOverride(params.at);

  const data = await getHomeDailyBriefPageData({ force, at: hourOverride });
  if (!data) redirect("/login");

  const { baby, brief, observedAtDisplay, variantCopyByCategory, categoryIcons, savedToday } = data;

  return (
    <AppShell
      babyName={baby?.name}
      avatarUrl={baby?.avatar_url}
      babyGender={baby?.gender}
      headerVariant="none"
    >
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-section-spacing px-container-margin pb-5">
        {brief && (
          <>
            <LiveWeatherSection
              fallbackWeather={{
                temp: brief.weather.temp,
                feelsLike: brief.weather.feelsLike,
                humidity: brief.weather.humidity,
                windSpeed: brief.weather.windSpeed,
                text: brief.weather.conditionText,
                precipProbability: brief.weather.precipProbability,
                uvIndex: brief.weather.uvIndex,
                observedAt: brief.weather.observedAt,
              }}
              fallbackLocationLabel={brief.weather.locationLabel}
              fallbackObservedAtDisplay={observedAtDisplay}
              requiredWarmth={brief.advice.current.requiredWarmth}
              selectedHourKey={hourOverride}
            />
            <DailyAdviceSection
              advice={brief.advice}
              weather={brief.weather}
              showChecklist={Boolean(baby)}
              variantCopyByCategory={variantCopyByCategory}
              categoryIcons={categoryIcons}
              saveContext={
                baby
                  ? {
                      babyId: baby.id,
                      babyName: baby.name,
                      weather: brief.weather,
                      alreadySaved: savedToday,
                    }
                  : null
              }
              diaperContext={
                baby
                  ? {
                      babyId: baby.id,
                      wearsDiaper: baby.wears_diaper ?? null,
                      promptState: {
                        wearsDiaper: baby.wears_diaper ?? null,
                        lastShownAt: baby.diaper_prompt_last_shown_at ?? null,
                        lastAnsweredAt: baby.diaper_prompt_last_answered_at ?? null,
                        lastAnswer: baby.diaper_prompt_last_answer ?? null,
                      },
                    }
                  : null
              }
            />
          </>
        )}

        {!brief && (
          <section className="mt-6 rounded-2xl bg-error-container p-8 text-center">
            <MaterialIcon name="cloud_off" className="mb-3 text-[40px] text-on-error-container" />
            <h2 className="font-headline-md mb-2 text-on-error-container">暂时无法获取天气</h2>
            <p className="font-body-md text-on-error-container/90">
              请检查网络后下拉刷新，或在「我的」中确认定位城市。
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
