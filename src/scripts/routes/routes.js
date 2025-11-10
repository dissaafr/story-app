import HomePage from "../pages/auth/home-page";
import AboutPage from "../pages/about/about-page";
import AddStoryPage from "../pages/add/add-story-page";
import LoginPage from "../pages/auth/login-page";
import RegisterPage from "../pages/auth/register-page";

const routes = {
  "/": new HomePage(),
  "/about": new AboutPage(),
  "/add": new AddStoryPage(),
  "/login": new LoginPage(),
  "/register": new RegisterPage(),
};

export default routes;
