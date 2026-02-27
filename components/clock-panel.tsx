"use client";

export interface TimeValues {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  ms: string;
}

interface ClockPanelProps {
  label: string;
  time: TimeValues;
  variant?: "realtime" | "pseudotime";
  children?: React.ReactNode;
}

const units: (keyof TimeValues)[] = ["days", "hours", "minutes", "seconds", "ms"];
const unitLabels: Record<keyof TimeValues, string> = {
  days: "D",
  hours: "H",
  minutes: "M",
  seconds: "S",
  ms: "Ms",
};

export function ClockPanel({
  label,
  time,
  variant = "realtime",
  children,
}: ClockPanelProps) {
  const borderClass =
    variant === "realtime"
      ? "border-green-600/40"
      : "border-green-800/40";

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border bg-white/15 px-5 py-5 backdrop-blur-xl sm:gap-4 sm:px-7 sm:py-6 ${borderClass}`}
      role="timer"
      aria-label={`${label} clock`}
    >
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-green-950/70 sm:text-xs">
        {label}
      </span>

      <div className="flex items-center gap-1 sm:gap-2">
        {units.map((unit, i) => (
          <div key={unit} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <span
                className="pb-4 text-sm font-bold text-green-950/30 sm:pb-5 sm:text-lg"
                aria-hidden="true"
              >
                {":"}
              </span>
            )}

            <div className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-black/[0.08] bg-black/[0.12] text-sm font-bold tabular-nums text-green-950 sm:h-12 sm:w-12 sm:rounded-lg sm:text-xl md:h-14 md:w-14 md:text-2xl">
                {time[unit]}
              </span>
              <span className="text-[0.5rem] font-semibold uppercase tracking-[0.15em] text-green-950/60 sm:text-[0.6rem]">
                {unitLabels[unit]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}
