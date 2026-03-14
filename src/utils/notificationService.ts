/// <reference types="vite/client" />
import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

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

export const notificationService = {
  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notification");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  },

  async subscribeUser(userId: string) {
    if (!("serviceWorker" in navigator)) return;
    if (!VAPID_PUBLIC_KEY) {
      console.error("VITE_VAPID_PUBLIC_KEY is missing");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe the user to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("Push Subscription successful:", subscription);

      // Save subscription to the database
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        subscription_json: JSON.stringify(subscription),
        device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id, subscription_json'
      });

      if (error) {
        console.error("Error saving subscription to DB:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Failed to subscribe the user: ", err);
      return false;
    }
  },

  async unsubscribeUser(userId: string) {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("subscription_json", JSON.stringify(subscription));
      }
      return true;
    } catch (err) {
      console.error("Error unsubscribing:", err);
      return false;
    }
  }
};
