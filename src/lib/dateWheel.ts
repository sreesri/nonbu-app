import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';

/** Days offered either side of the starting value in the day column. */
const DAY_SPAN = 7;

export const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** A date split into the columns of the wheel picker. */
export type WheelParts = { day: Date; hour12: number; minute: number; pm: boolean };

export function toParts(date: Date): WheelParts {
  const hours = date.getHours();
  return { day: startOfDay(date), hour12: hours % 12 || 12, minute: date.getMinutes(), pm: hours >= 12 };
}

export function fromParts({ day, hour12, minute, pm }: WheelParts): Date {
  const date = new Date(day);
  date.setHours((hour12 % 12) + (pm ? 12 : 0), minute, 0, 0);
  return date;
}

export function clampDate(date: Date, min?: Date, max?: Date): Date {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

/** Calendar days around `value` that fall within [min, max]. */
export function dayOptions(value: Date, min?: Date, max?: Date): Date[] {
  const days: Date[] = [];
  for (let offset = -DAY_SPAN; offset <= DAY_SPAN; offset++) {
    const day = startOfDay(addDays(value, offset));
    if ((min && day < startOfDay(min)) || (max && day > startOfDay(max))) continue;
    days.push(day);
  }
  return days;
}

export function dayLabel(day: Date, today: Date): string {
  switch (differenceInCalendarDays(day, today)) {
    case 0:
      return 'Today';
    case -1:
      return 'Yesterday';
    case 1:
      return 'Tomorrow';
    default:
      return format(day, 'EEE d MMM');
  }
}
