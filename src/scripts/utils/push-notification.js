import Auth from "./auth.js";
import CONFIG from "../config.js";

const VAPID_PUBLIC_KEY =
  "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

let isSubscribing = false;
let isUnsubscribing = false;

export const isCurrentPushSubscriptionAvailable = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
};

export const subscribe = async () => {
  if (isSubscribing) return;
  isSubscribing = true;

  try {
    console.log("subscribe() dipanggil");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("Izin notifikasi ditolak!");
      isSubscribing = false;
      return;
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn("Service Worker belum siap, tunggu 1 detik...");
      await new Promise((r) => setTimeout(r, 1000));
      registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("Service Worker belum terdaftar");
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const body = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.getKey("p256dh")
          ? btoa(
              String.fromCharCode(
                ...new Uint8Array(subscription.getKey("p256dh"))
              )
            )
          : "",
        auth: subscription.getKey("auth")
          ? btoa(
              String.fromCharCode(
                ...new Uint8Array(subscription.getKey("auth"))
              )
            )
          : "",
      },
    };

    const token = Auth.getToken();
    const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.message);

    alert("✅ Push notification diaktifkan!");
    console.log("Subscribed push:", subscription);
  } catch (error) {
    console.error("Gagal subscribe push:", error);
  } finally {
    isSubscribing = false;
  }
};

export const unsubscribe = async () => {
  if (isUnsubscribing) return; 
  isUnsubscribing = true;

  try {
    console.log("unsubscribe() dipanggil");

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("Service Worker belum terdaftar");

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const token = Auth.getToken();
    await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    await subscription.unsubscribe();
    alert("❌ Push notification dinonaktifkan!");
    console.log("Unsubscribed push");
  } catch (error) {
    console.error("Gagal unsubscribe push:", error);
  } finally {
    isUnsubscribing = false; 
  }
};
