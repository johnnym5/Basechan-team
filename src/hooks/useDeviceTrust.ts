"use client"
import { useState, useEffect } from "react"

export function useDeviceTrust() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

      // 1. Modern API (Catches Android Desktop Mode)
      // @ts-ignore - non-standard but highly supported on Chromium
      if (navigator.userAgentData && navigator.userAgentData.mobile) {
        return true;
      }

      const ua = navigator.userAgent;

      // 2. Standard Mobile Regex Fallback
      const isStandardMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      if (isStandardMobile) return true;

      // 3. The Apple Spoof Catcher (iOS Desktop Mode)
      // When an iPad/iPhone requests desktop site, it fakes being a Mac.
      // Macs do not have maxTouchPoints > 1, but iOS devices do.
      const isAppleSpoof = ua.includes('Mac') && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
      if (isAppleSpoof) return true;

      return false;
    }

    setIsMobile(checkDevice());
  }, [])

  return { isMobile }
}
