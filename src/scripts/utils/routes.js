import routes from "../routes/routes.js";

const router = async () => {
  const main = document.querySelector("main");
  const url = window.location.hash.slice(1).toLowerCase() || "/";
  const page = routes[url] || routes["/"];

  main.innerHTML = await page.render();
  if (page.afterRender) await page.afterRender();
};

window.addEventListener("hashchange", router);
window.addEventListener("load", router);
