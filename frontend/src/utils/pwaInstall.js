/**
 * PWA Install Helper
 * Intercepts beforeinstallprompt event and allows manual 1-click app installation for Student & Admin apps.
 */

let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn(false));
  });
}

export function subscribeToInstallPrompt(callback) {
  listeners.add(callback);
  callback(Boolean(deferredPrompt));
  return () => listeners.delete(callback);
}

export async function promptAppInstall(manifestType = 'student') {
  // Dynamically set manifest tag
  if (typeof document !== 'undefined') {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute('href', manifestType === 'admin' ? '/manifest-admin.json' : '/manifest-student.json');
    }
  }

  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((fn) => fn(false));
    return outcome === 'accepted';
  } else {
    // If prompt is unavailable (e.g. on iOS Safari or already installed), return instructions
    return false;
  }
}
