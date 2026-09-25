const indiaTimeZone = "Asia/Kolkata";

function indiaHour(now: Date) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: indiaTimeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now).find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}

export function indianTimeGreeting(now: Date) {
  const hour = indiaHour(now);
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

export function formatIndianTime(now: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: indiaTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
}
