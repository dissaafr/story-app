import routes from "../routes/routes";

class App {
  constructor({ content, drawerButton, navigationDrawer }) {
    this._content = content;
    this._drawerButton = drawerButton;
    this._navigationDrawer = navigationDrawer;
    this._initDrawer();
  }

  _initDrawer() {
    this._drawerButton.addEventListener("click", () => {
      this._navigationDrawer.classList.toggle("open");
    });

    this._navigationDrawer.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        this._navigationDrawer.classList.remove("open");

        if (e.target.id === "logout-link") {
          localStorage.removeItem("token");
          localStorage.removeItem("userName");
          window.location.hash = "/login";
        }
      }
    });
  }

  async renderPage() {
    const url = window.location.hash.slice(1).toLowerCase() || "/";
    const page = routes[url] || routes["/"];
    this._content.innerHTML = await page.render();
    if (page.afterRender) await page.afterRender();
  }
}

export default App;
