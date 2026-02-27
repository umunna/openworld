"use client";

interface TimeValues {
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
  ms: string;
}

interface ClockPanelProps {
  label: string;
  time: TimeValues;
  className?: string;
  children?: React.ReactNode;
}

export function ClockPanel({ label, time, className = "", children }: ClockPanelProps) {
  return (
    <div className={`clock-panel ${className}`} role="timer" aria-label={`${label} clock`}>
      <span className="panel-label">{label}</span>
      <div className="counter">
        <div className="time-box">
          <span>{time.days}</span>
          <label>D</label>
        </div>
        <span className="sep" aria-hidden="true">:</span>
        <div className="time-box">
          <span>{time.hours}</span>
          <label>H</label>
        </div>
        <span className="sep" aria-hidden="true">:</span>
        <div className="time-box">
          <span>{time.minutes}</span>
          <label>M</label>
        </div>
        <span className="sep" aria-hidden="true">:</span>
        <div className="time-box">
          <span>{time.seconds}</span>
          <label>S</label>
        </div>
        <span className="sep" aria-hidden="true">:</span>
        <div className="time-box">
          <span>{time.ms}</span>
          <label>Ms</label>
        </div>
      </div>
      {children}
    </div>
  );
}
