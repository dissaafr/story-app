import "../styles/styles.css";
import App from "./pages/app.js";
import Auth from "./utils/auth.js";

import {
  isCurrentPushSubscriptionAvailable,
  subscribe,
  unsubscribe,
} from "./utils/push-notification.js";

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    content: document.querySelector("#main-content"),
    drawerButton: document.querySelector("#drawer-button"),
    navigationDrawer: document.querySelector("#navigation-drawer"),
  });

  const renderWithTransition = async () => {
    const mainContent = document.querySelector("#main-content");
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        await app.renderPage();
      });
    } else {
      mainContent.classList.add("fade-out");
      setTimeout(async () => {
        await app.renderPage();
        mainContent.classList.remove("fade-out");
      }, 200);
    }
  };

  const checkAuthAndRedirect = () => {
    const token = Auth.getToken();
    const publicRoutes = ["#/login", "#/register"];
    if (!token && !publicRoutes.includes(window.location.hash)) {
      window.location.hash = "#/login";
    }
  };

  checkAuthAndRedirect();
  await renderWithTransition();

  window.addEventListener("hashchange", async () => {
    checkAuthAndRedirect();
    await renderWithTransition();
    if (window.location.hash === "#/logout") {
      Auth.removeToken();
      localStorage.removeItem("userName");
      alert("Berhasil logout!");
      window.location.hash = "#/login";
    }
  });

  const logoutBtn = document.querySelector("#logout-link");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.removeToken();
      localStorage.removeItem("userName");
      alert("Berhasil logout!");
      window.location.hash = "#/login";
    });
  }

  const pushLi = document.createElement("li");
  pushLi.innerHTML = `<a href="#" id="push-link">🔔 Aktifkan Notifikasi</a>`;
  document.querySelector("#nav-list").appendChild(pushLi);

  const updateBtnText = async () => {
    const subscribed = await isCurrentPushSubscriptionAvailable();
    document.querySelector("#push-link").textContent = subscribed
      ? "🔕 Nonaktifkan Notifikasi"
      : "🔔 Aktifkan Notifikasi";
  };

  document.querySelector("#push-link").addEventListener("click", async (e) => {
    e.preventDefault();
    const subscribed = await isCurrentPushSubscriptionAvailable();
    if (subscribed) await unsubscribe();
    else await subscribe();
    await updateBtnText();
  });

  await updateBtnText();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("✅ Service Worker terdaftar:", registration);
        })
        .catch((error) => {
          console.error("❌ Service Worker gagal daftar:", error);
        });
    });
  }
});
