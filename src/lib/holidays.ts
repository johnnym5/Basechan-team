import { isSameDay } from 'date-fns';

/**
 * Public holiday configuration for the application.
 */
export const PUBLIC_HOLIDAYS = [
    { name: "New Year's Day", date: '2024-01-01' },
    { name: "Good Friday", date: '2024-03-29' },
    { name: "Easter Monday", date: '2024-04-01' },
    { name: "Labour Day", date: '2024-05-01' },
    { name: "Democracy Day", date: '2024-06-12' },
    { name: "Independence Day", date: '2024-10-01' },
    { name: "Christmas Day", date: '2024-12-25' },
    { name: "Boxing Day", date: '2024-12-26' },
    // 2025
    { name: "New Year's Day", date: '2025-01-01' },
    { name: "Good Friday", date: '2025-04-18' },
    { name: "Easter Monday", date: '2025-04-21' },
    { name: "Labour Day", date: '2025-05-01' },
    { name: "Democracy Day", date: '2025-06-12' },
    { name: "Independence Day", date: '2025-10-01' },
    { name: "Christmas Day", date: '2025-12-25' },
    { name: "Boxing Day", date: '2025-12-26' },
];

export function getHolidayOnDate(date: Date) {
    return PUBLIC_HOLIDAYS.find(h => isSameDay(new Date(h.date), date));
}

export function isHoliday(date: Date) {
    return !!getHolidayOnDate(date);
}
