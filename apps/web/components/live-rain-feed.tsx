import type { WeatherSnapshot } from "@/lib/types";

export function LiveRainFeed({ weather }: { weather: WeatherSnapshot }) {
  return (
    <div className="card metric-card">
      <div className="label">Live rainfall</div>
      <div className="metric">{weather.rainfall.toString()} mm</div>
      <div className={`pill ${weather.breached ? "warning" : ""} fadeIn`}>
        {weather.breached ? "Threshold breached" : "Below threshold"}
      </div>
    </div>
  );
}
