import Api from "../../data/api.js";
import Swal from "sweetalert2";

export default class RegisterPage {
  async render() {
    return `
        <section class="register container">
          <h1>Daftar Akun Baru</h1>
          <form id="register-form">
            <label for="name">Nama Lengkap</label>
            <input type="text" id="name" placeholder="Nama Lengkap" required />
  
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="Email" required />
  
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Password (min. 8 karakter)" required />
  
            <button type="submit">Daftar</button>
          </form>
          <p>Sudah punya akun? <a href="#/login">Masuk di sini</a></p>
        </section>
      `;
  }

  async afterRender() {
    const form = document.querySelector("#register-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.querySelector("#name").value;
      const email = document.querySelector("#email").value;
      const password = document.querySelector("#password").value;

      if (password.length < 8) {
        Swal.fire("Gagal", "Password harus minimal 8 karakter!", "warning");
        return;
      }

      Swal.fire({
        title: "Sedang mendaftar...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const result = await Api.register(name, email, password);
        Swal.close();

        if (!result.error) {
          Swal.fire(
            "Berhasil",
            "Pendaftaran berhasil! Silakan login.",
            "success"
          );
          window.location.hash = "#/login";
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
