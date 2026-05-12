'use client';

// A simple in-memory store to prevent re-notifying for the same item within a short time
const notifiedIds = new Set<string>();

/**
 * Plays a simple notification sound using the Web Audio API.
 */
export function playNotificationSound() {
  // Check if AudioContext is available
  if (typeof window === 'undefined' || !(window.AudioContext || (window as any).webkitAudioContext)) {
    return;
  }

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Configure the sound
  oscillator.type = 'sine'; // A smooth sine wave
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A high-pitched note (A5)
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume

  // Connect the nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Play the sound for a short duration
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2); // Play for 200ms
}

/**
 * Shows a browser notification if permission has been granted.
 * @param title The title of the notification.
 * @param options The options for the notification (body, icon, etc.).
 * @param notificationId A unique ID to prevent re-showing the same notification.
 */
export function showBrowserNotification(title: string, options: NotificationOptions, notificationId: string) {
  // Check if notifications are supported and permission is granted
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  // Prevent showing the same notification again
  if (notifiedIds.has(notificationId)) {
    return;
  }

  notifiedIds.add(notificationId);
  // Remove from the set after some time to allow re-notification if needed later
  setTimeout(() => notifiedIds.delete(notificationId), 60000);

  // Create and show the notification
  const notification = new Notification(title, options);

  // Play a sound along with the notification
  playNotificationSound();
}
