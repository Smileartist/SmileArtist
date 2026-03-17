import { toast } from "sonner";

/**
 * Utility function to convert VAPID public key
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if Push notifications are supported by the browser
 */
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Requests permission and subscribes the user to Push Notifications
 * @param {string} userId - The logged-in user's ID
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn("Push notifications are not supported on this browser.");
    return false;
  }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Browser Permission denied. Please allow notifications in your App/System settings.");
        return false;
      }

    const registration = await navigator.serviceWorker.ready;

    // Get VAPID Public Key from environment variables
    const vapidPublicKey = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error("VITE_VAPID_PUBLIC_KEY is not configured in .env on frontend");
      return false;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    console.log("Push subscribed:", subscription);

    // Send payload to Backend API
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId,
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language
        }
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return true;
  } catch (err: any) {
    console.error("Error subscribing to push:", err);
    toast.error(`Push Setup Failed: ${err.message || err}`);
    return false;
  }
}

/**
 * Unsubscribes from Push Notifications
 * @param {string} [userId] - Optional user id to remove on backend
 */
export async function unsubscribeFromPush(userId?: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify backend
      await fetch("/api/notifications/unsubscribe", {
        method: "POST", // using POST since Vercel handles DELETE with varyings endpoints
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, userId })
      });

      console.log("Unsubscribed from Push.");
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error unsubscribing from push:", err);
    return false;
  }
}

/**
 * Triggers a push notification send request to the backend Vercel API
 * Fire-and-forget async wrapper.
 */
export function triggerPushNotification(payload: {
  userId: string;
  title: string;
  body: string;
  url?: string;
  type?: string;
}) {
  // Fire and forget, don't await to avoid blocking trigger handlers
  fetch("/api/notifications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => console.error("Failed to trigger push broadcast API:", err));
}
