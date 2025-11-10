const Auth = {
  saveToken(token) {
    localStorage.setItem("token", token);
  },
  getToken() {
    return localStorage.getItem("token");
  },
  removeToken() {
    localStorage.removeItem("token");
  },
  isLoggedIn() {
    return !!localStorage.getItem("token");
  },
};

export default Auth;
