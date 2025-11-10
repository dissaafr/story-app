import CONFIG from "../config.js";
import Auth from "./auth.js";

export function isNotificationAvailable() {
  return "Notification" in window;
}

export function isNotificationGranted() {
  return Notification.permission === "granted";
}

export async function requestNotificationPermission() {
  if (!isNotificationAvailable()) {
    console.error("Notification API unsupported.");
    return false;
  }

  if (isNotificationGranted()) return true;

  const status = await Notification.requestPermission();
  if (status !== "granted") {
    alert("Izin notifikasi tidak diberikan.");
    return false;
  }
  return true;
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return await registration.pushManager.getSubscription();
}

export async function isCurrentPushSubscriptionAvailable() {
  return !!(await getPushSubscription());
}

function convertBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function generateSubscribeOptions() {
  return {
    userVisibleOnly: true,
    applicationServerKey: convertBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY),
  };
}

export async function subscribe() {
  if (!(await requestNotificationPermission())) return;

  if (await isCurrentPushSubscriptionAvailable()) {
    alert("Sudah berlangganan push notification.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const pushSubscription = await registration.pushManager.subscribe(
      generateSubscribeOptions()
    );

    const { endpoint, keys } = pushSubscription.toJSON();
    const token = Auth.getToken();

    const res = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint, keys }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      console.error("Subscribe API error", json);
      alert("Gagal subscribe push notification.");
      await pushSubscription.unsubscribe();
      return;
    }

    alert("Push notification berhasil diaktifkan!");
  } catch (error) {
    console.error(error);
    alert("Gagal subscribe push notification.");
  }
}

export async function unsubscribe() {
  try {
    const pushSubscription = await getPushSubscription();
    if (!pushSubscription) {
      alert("Belum berlangganan.");
      return;
    }

    const { endpoint } = pushSubscription.toJSON();
    const token = getToken();

    const res = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      console.error("Unsubscribe API error", json);
      alert("Gagal unsubscribe push notification.");
      return;
    }

    const unsubscribed = await pushSubscription.unsubscribe();
    if (!unsubscribed) {
      alert("Gagal unsubscribe push notification.");
      return;
    }

    alert("Push notification berhasil dinonaktifkan.");
  } catch (error) {
    console.error(error);
    alert("Gagal unsubscribe push notification.");
  }
}
