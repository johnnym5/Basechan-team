/**
 * Formats a duration from total seconds into a HH:MM:SS string.
 * @param totalSeconds - The total duration in seconds.
 * @returns A string formatted as HH:MM:SS.
 */
export function formatDuration(totalSeconds: number | undefined | null): string {
    if (totalSeconds == null || totalSeconds < 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};