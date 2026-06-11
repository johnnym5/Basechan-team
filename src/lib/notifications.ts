'use client';

// A simple in-memory store to prevent re-notifying for the same item within a short time
const notifiedIds = new Set<string>();

/**
 * Plays a professional notification sound using the Web Audio API.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // High-pitched, clean sine wave for a professional "ping"
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1); // Slide down to A4

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // Silently fail if audio context is blocked by browser policy
  }
}

/**
 * Shows a browser notification if permission has been granted.
 */
export function showBrowserNotification(title: string, body: string, notificationId: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  if (notifiedIds.has(notificationId)) return;

  notifiedIds.add(notificationId);
  setTimeout(() => notifiedIds.delete(notificationId), 60000);

  try {
    new Notification(title, { body });
    playNotificationSound();
  } catch (e) {}
}