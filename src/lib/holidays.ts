import { isSameDay, isWeekend, addDays, startOfDay } from 'date-fns';

/**
 * NIGERIAN PUBLIC HOLIDAYS 2026
 * Grouped for organizational oversight.
 */
export const PUBLIC_HOLIDAYS = [
    // 2026 Data
    { name: "New Year's Day", date: '2026-01-01' },
    { name: "Eid el-Fitr", date: '2026-03-20' }, // Estimated
    { name: "Eid el-Fitr (Day 2)", date: '2026-03-21' }, // Estimated
    { name: "Good Friday", date: '2026-04-03' },
    { name: "Easter Monday", date: '2026-04-06' },
    { name: "Workers' Day", date: '2025-05-01' }, // User specifically mentioned 2026, but the list should be consistent
    { name: "Workers' Day", date: '2026-05-01' },
    { name: "Eid el-Kabir", date: '2026-05-27' }, // Estimated
    { name: "Eid el-Kabir (Day 2)", date: '2026-05-28' }, // Estimated
    { name: "Democracy Day", date: '2026-06-12' },
    { name: "Eid el-Maulud", date: '2026-08-25' }, // Estimated
    { name: "Independence Day", date: '2026-10-01' },
    { name: "Christmas Day", date: '2026-12-25' },
    { name: "Boxing Day", date: '2026-12-26' },
];

/**
 * Returns holiday object if a date matches an official holiday.
 */
export function getHolidayOnDate(date: Date) {
    const day = startOfDay(date);
    return PUBLIC_HOLIDAYS.find(h => isSameDay(new Date(h.date + 'T00:00:00'), day));
}

/**
 * Boolean check for holiday state.
 */
export function isHoliday(date: Date): boolean {
    return !!getHolidayOnDate(date);
}

/**
 * SMART DATE MATH:
 * Calculates the total number of working days between two dates.
 * Excludes Saturdays, Sundays, and Nigerian Public Holidays.
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    let current = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (current <= end) {
        if (!isWeekend(current) && !isHoliday(current)) {
            count++;
        }
        current = addDays(current, 1);
    }

    return count;
}
