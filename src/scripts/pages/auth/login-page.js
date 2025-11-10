import Api from "../../data/api.js";
import Swal from "sweetalert2";

export default class LoginPage {
  async render() {
    return `
        <section class="login container">
          <h1>Masuk ke Akun</h1>
          <form id="login-form">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="Email" required />
  
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Password" required />
  
            <button type="submit">Masuk</button>
          </form>
          <p>Belum punya akun? <a href="#/register">Daftar di sini</a></p>
        </section>
      `;
  }

  async afterRender() {
    const form = document.querySelector("#login-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.querySelector("#email").value;
      const password = document.querySelector("#password").value;

      Swal.fire({
        title: "Sedang login...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const result = await Api.login(email, password);
        Swal.close();

        if (!result.error) {
          localStorage.setItem("token", result.loginResult.token);
          localStorage.setItem("userName", result.loginResult.name);
          Swal.fire("Berhasil", "Login berhasil!", "success");
          window.location.hash = "/";
        } else {
          Swal.fire("Gagal", result.message, "error");
        }
      } catch (err) {
        Swal.close();
        Swal.fire("Error", err.message, "error");
      }
    });
  }
}
