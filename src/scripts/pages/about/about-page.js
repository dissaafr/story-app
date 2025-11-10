export default class AboutPage {
  async render() {
    return `
      <section>
        <h1>About Page</h1>
        <p>Aplikasi ini dibuat untuk latihan routing SPA sederhana.</p>
      </section>
    `;
  }

  async afterRender() {
    console.log("AboutPage loaded");
  }
}
