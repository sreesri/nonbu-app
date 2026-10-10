import type { Session, SessionKind } from '@/api/types';
import { HOURS_PER_DAY } from './goals';

const HOUR_MS = 3600_000;

export type DaySegment = { kind: SessionKind; start: number; end: number; planned: boolean };

/**
 * Today's timeline, from `dayStart` to `dayEnd` (ms): what was actually fasted or eaten up to
 * `now`, then the plan for the rest of the day. The plan lets the current session run to its
 * target (or ends it now, if it's overdue) and then alternates fasting and eating windows from
 * the user's schedule. Gaps with no session are left out.
 */
export function todaySegments({
  sessions,
  current,
  fastHours,
  now,
  dayStart,
  dayEnd,
}: {
  sessions: Session[];
  current: Session | null;
  fastHours: number;
  now: number;
  dayStart: number;
  dayEnd: number;
}): DaySegment[] {
  const segments: DaySegment[] = [];
  const add = (kind: SessionKind, start: number, end: number, planned: boolean) => {
    const a = Math.max(start, dayStart);
    const b = Math.min(end, dayEnd);
    if (b > a) segments.push({ kind, start: a, end: b, planned });
  };

  // The current session may be missing from the list (e.g. switched offline) or newer than it.
  const byId = new Map(sessions.map((s) => [s.id, s]));
  if (current) byId.set(current.id, current);
  for (const s of byId.values()) {
    const end = s.ended_at ? new Date(s.ended_at).getTime() : now;
    add(s.kind, new Date(s.started_at).getTime(), Math.min(end, now), false);
  }

  if (current) {
    const lengthOf = (kind: SessionKind) => (kind === 'fast' ? fastHours : HOURS_PER_DAY - fastHours) * HOUR_MS;
    let kind = current.kind;
    let start = now;
    let end = Math.max(new Date(current.started_at).getTime() + current.target_hours * HOUR_MS, now);
    while (start < dayEnd) {
      add(kind, start, end, true);
      kind = kind === 'fast' ? 'eat' : 'fast';
      start = end;
      end = start + lengthOf(kind);
    }
  }

  return segments.sort((a, b) => a.start - b.start);
}
