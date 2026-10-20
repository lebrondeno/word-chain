/**
 * PWA & Service Worker Utility
 * Manages PWA installation, automatic update polling, and notifications.
 * Safe for SSR and headless Node environments.
 */

export interface AppBuildInfo {
  version: string;
  buildTime: string;
}

export const APP_BUILD_INFO: AppBuildInfo = {
  version: '1.0.0',
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
};

// Declared globally for Vite define if needed
declare const __BUILD_TIME__: string | undefined;

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaState {
  isStandalone: boolean;
  isInstallable: boolean;
  isUpdateAvailable: boolean;
  isIos: boolean;
  hasNotificationSupport: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
let isUpdateAvailable = false;
let isRefreshing = false;

const stateSubscribers = new Set<(state: PwaState) => void>();

function notifySubscribers() {
  const currentState = getPwaState();
  stateSubscribers.forEach((cb) => {
    try {
      cb(currentState);
    } catch (e) {
      console.warn('[PWA] Error in subscriber callback:', e);
    }
  });
}

/**
 * Checks if the app is currently running in standalone (installed PWA) mode
 */
export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandaloneMode || isIosStandalone);
}

/**
 * Detects if the client is using iOS Safari
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

/**
 * Checks Notification API support
 */
export function hasNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!hasNotificationSupport()) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests Notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!hasNotificationSupport()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    notifySubscribers();
    return permission;
  } catch (err) {
    console.warn('[PWA] Failed to request notification permission:', err);
    return getNotificationPermission();
  }
}

/**
 * Dispatches a native browser notification if granted
 */
export function showSystemNotification(title: string, options?: NotificationOptions): boolean {
  if (!hasNotificationSupport() || Notification.permission !== 'granted') {
    return false;
  }
  try {
    const notif = new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/favicon.svg',
      ...options,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
      if (isUpdateAvailable) {
        applyAppUpdate();
      }
    };
    return true;
  } catch (err) {
    console.warn('[PWA] Failed to display system notification:', err);
    return false;
  }
}

/**
 * Returns current snapshot of PWA state
 */
export function getPwaState(): PwaState {
  return {
    isStandalone: isPwaInstalled(),
    isInstallable: Boolean(deferredInstallPrompt) && !isPwaInstalled(),
    isUpdateAvailable,
    isIos: isIosDevice(),
    hasNotificationSupport: hasNotificationSupport(),
    notificationPermission: getNotificationPermission(),
  };
}

/**
 * Subscribe to PWA state changes
 */
export function subscribePwaState(callback: (state: PwaState) => void): () => void {
  stateSubscribers.add(callback);
  callback(getPwaState());
  return () => {
    stateSubscribers.delete(callback);
  };
}

/**
 * Prompts the browser install dialog
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }
  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    notifySubscribers();
    return choice.outcome === 'accepted';
  } catch (err) {
    console.warn('[PWA] Install prompt failed:', err);
    return false;
  }
}

/**
 * Tells the waiting Service Worker to skipWaiting and reloads the page
 */
export function applyAppUpdate(): void {
  if (typeof window === 'undefined') return;

  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

/**
 * Trigger an update check on the Service Worker registration
 */
export async function checkForAppUpdate(): Promise<boolean> {
  if (!swRegistration || typeof window === 'undefined') return false;
  try {
    await swRegistration.update();
    return isUpdateAvailable;
  } catch (err) {
    console.warn('[PWA] Update check failed:', err);
    return false;
  }
}

function handleWaitingServiceWorker(registration: ServiceWorkerRegistration) {
  waitingWorker = registration.waiting;
  if (!waitingWorker) return;

  isUpdateAvailable = true;
  notifySubscribers();

  // Try dispatching system notification
  if (getNotificationPermission() === 'granted') {
    showSystemNotification('PartyHub Update Available', {
      body: 'A new version of PartyHub is ready with fresh questions and features. Tap to load!',
      tag: 'partyhub-update',
    });
  }
}

/**
 * Initializes Service Worker registration and event listeners
 */
export function initPwa(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  // 1. Capture beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  // 2. Track when appinstalled
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifySubscribers();
  });

  // 3. Register service worker if supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        swRegistration = registration;

        // If there's already a waiting worker, an update is ready
        if (registration.waiting) {
          handleWaitingServiceWorker(registration);
        }

        // Listen for updates found while running
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              handleWaitingServiceWorker(registration);
            }
          });
        });

        // 4. Poll for updates periodically (every 20 minutes)
        setInterval(() => {
          registration.update().catch(() => {});
        }, 20 * 60 * 1000);

        // 5. Poll for updates when tab becomes visible again
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
      } catch (err) {
        console.warn('[PWA] Service worker registration failed:', err);
      }
    });

    // 6. Handle controllerchange (smooth reload when new SW activates)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });
  }
}
