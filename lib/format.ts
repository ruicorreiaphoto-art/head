export function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  const minutes = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}
export function elapsedClock(hours: number): string {
  const seconds = Math.max(0, Math.floor(hours * 3600));
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}
