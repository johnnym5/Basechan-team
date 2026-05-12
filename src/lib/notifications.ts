<<<<<<< HEAD
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
    new Notification(title, { body, icon: '/favicon.ico' });
    playNotificationSound();
  } catch (e) {}
}
=======
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
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
