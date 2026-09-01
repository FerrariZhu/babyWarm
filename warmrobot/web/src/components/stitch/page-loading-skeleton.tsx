export function PageLoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background pb-[88px] text-on-background">
      <header className="flex w-full max-w-[1200px] animate-pulse items-center justify-between px-margin-mobile pt-safe-offset pb-2.5 md:px-margin-desktop">
        <div className="h-10 w-32 rounded-full bg-surface-container-high" />
        <div className="h-10 w-10 rounded-full bg-surface-container-high" />
      </header>
      <main className="mt-3 flex w-full max-w-[1200px] flex-col gap-5 px-margin-mobile md:px-margin-desktop">
        <div className="h-56 animate-pulse rounded-[2rem] bg-primary-fixed/40" />
        <div className="flex flex-col gap-4">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-surface-container-high" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-xl bg-surface-container-low" />
            <div className="h-40 animate-pulse rounded-xl bg-surface-container-low" />
          </div>
        </div>
      </main>
    </div>
  );
}
