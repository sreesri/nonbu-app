import { addDays, format, parseISO } from 'date-fns';

/** Local calendar date as YYYY-MM-DD (the API's `date` parameter). */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function shiftDateKey(key: string, days: number): string {
  return toDateKey(addDays(parseISO(key), days));
}

export function formatDayLabel(key: string): string {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === shiftDateKey(today, -1)) return 'Yesterday';
  return format(parseISO(key), 'EEE, d MMM');
}

/** Milliseconds → "H:MM:SS". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'h:mm a');
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'EEE d MMM, h:mm a');
}

/** Calories rounded, with thousands separators. */
export function formatKcal(n: number): string {
  return Math.round(n).toLocaleString();
}

export function round(n: number | null | undefined): string {
  return n == null ? '–' : String(Math.round(n));
}
