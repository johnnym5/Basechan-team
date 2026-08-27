"use client"
import { useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { UserProfile, SystemConfig, Attendance } from '@/lib/types'

/**
 * Tactical Audio Hook
 * Monitors system time and triggers auditory chimes + visual toasts for key shift milestones.
 */
export function useShiftReminders(
  user: UserProfile | null,
  systemConfig: SystemConfig | null,
  attendance: Attendance | null
) {
  const { toast } = useToast()

  // Track played state to prevent looping within the same minute
  const playedFlags = useRef({
    start: false,
    warning: false,
    end: false,
    date: new Date().toDateString()
  })

  useEffect(() => {
    if (!user || !systemConfig) return

    const checkTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const todayStr = now.toDateString()

      // Reset flags if it's a new day
      if (playedFlags.current.date !== todayStr) {
        playedFlags.current = { start: false, warning: false, end: false, date: todayStr }
      }

      // 1. SHIFT START (e.g., 09:00 AM)
      // Trigger if it's 09:00 and user hasn't clocked in yet today
      if (hours === 9 && minutes === 0 && !playedFlags.current.start && !attendance) {
        playChime('/audio/clock-in.mp3')
        toast({
            title: "Operational Readiness Required",
            description: "Good morning! System check indicates you are not yet active. Don't forget to clock in.",
        })
        playedFlags.current.start = true
      }

      // 2. 30-MINUTE WARNING (e.g., 04:30 PM)
      // Trigger if it's 16:30 and user is currently clocked in
      if (hours === 16 && minutes === 30 && !playedFlags.current.warning && (attendance && !attendance.clockOut)) {
        playChime('/audio/warning.mp3')
        toast({
            title: "Shift Conclusion Warning",
            description: "30 minutes remain in your duty cycle. Please begin preparing your EOD report.",
            variant: "destructive"
        })
        playedFlags.current.warning = true
      }

      // 3. SHIFT END (e.g., 05:00 PM)
      // Trigger if it's 17:00 and user is still clocked in
      if (hours === 17 && minutes === 0 && !playedFlags.current.end && (attendance && !attendance.clockOut)) {
        playChime('/audio/clock-out.mp3')
        toast({
            title: "End of Shift",
            description: "Operational hours have concluded. Please clock out and have a great evening!",
        })
        playedFlags.current.end = true
      }
    }

    // Check immediately, then every 30 seconds
    checkTime()
    const interval = setInterval(checkTime, 30000)

    return () => clearInterval(interval)
  }, [user, systemConfig, attendance, toast])

  // Helper to play audio safely
  const playChime = (audioPath: string) => {
    try {
      const audio = new Audio(audioPath)
      audio.volume = 0.5 // Keep it subtle and professional
      audio.play().catch(e => console.warn("Browser blocked autoplay. Audio requires initial user interaction with the dashboard.", e))
    } catch (error) {
      console.error("Tactical audio failure:", error)
    }
  }
}
