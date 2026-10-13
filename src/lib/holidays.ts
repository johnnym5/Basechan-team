/**
 * Official Nigerian Public Holidays Utility
 */

import { isWeekend, eachDayOfInterval, format, startOfDay } from 'date-fns';

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  country: 'NG';
  isRecurring: boolean;
}

export const NIGERIAN_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { date: '2026-01-01', name: "New Year's Day", country: 'NG', isRecurring: true },
  { date: '2026-04-03', name: 'Good Friday', country: 'NG', isRecurring: false },
  { date: '2026-04-06', name: 'Easter Monday', country: 'NG', isRecurring: false },
  { date: '2026-05-01', name: "Workers' Day", country: 'NG', isRecurring: true },
  { date: '2026-06-12', name: 'Democracy Day', country: 'NG', isRecurring: true },
  { date: '2026-10-01', name: 'Independence Day', country: 'NG', isRecurring: true },
  { date: '2026-12-25', name: 'Christmas Day', country: 'NG', isRecurring: true },
  { date: '2026-12-26', name: 'Boxing Day', country: 'NG', isRecurring: true },
];

export const PUBLIC_HOLIDAYS = NIGERIAN_PUBLIC_HOLIDAYS;

/**
 * Helper to check if a specific YYYY-MM-DD string is an official Nigerian public holiday.
 */
export function getNigerianHoliday(dateStr: string): PublicHoliday | undefined {
  if (!dateStr) return undefined;

  const exact = NIGERIAN_PUBLIC_HOLIDAYS.find(h => h.date === dateStr);
  if (exact) return exact;

  const monthDay = dateStr.slice(5); // "MM-DD"
  return NIGERIAN_PUBLIC_HOLIDAYS.find(h => h.isRecurring && h.date.slice(5) === monthDay);
}

/**
 * Checks if a given Date instance falls on an official public holiday.
 */
export function isHoliday(date: Date): boolean {
  if (!date) return false;
  const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
  return !!getNigerianHoliday(dateStr);
}

/**
 * Gets the PublicHoliday object for a given Date, if any.
 */
export function getHolidayOnDate(date: Date): PublicHoliday | undefined {
  if (!date) return undefined;
  const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
  return getNigerianHoliday(dateStr);
}

/**
 * Calculates working days between two dates excluding weekends and official public holidays.
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  if (!startDate || !endDate || startDate > endDate) return 0;

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  let workingDays = 0;

  for (const day of days) {
    if (!isWeekend(day) && !isHoliday(day)) {
      workingDays++;
    }
  }

  return workingDays;
}
