export function formatRelativeTime(value) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, seconds] of units) {
    if (absSeconds >= seconds || unit === "second") {
      const valueForUnit = Math.round(diffSeconds / seconds);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        valueForUnit,
        unit,
      );
    }
  }

  return "Just now";
}

export function scoreColor(score) {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#EAB308";
  return "#EF4444";
}
