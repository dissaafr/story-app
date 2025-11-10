const BASE_URL = "https://story-api.dicoding.dev/v1";

const Api = {
  async register(name, email, password) {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async getAllStories(token) {
    const res = await fetch(`${BASE_URL}/stories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  async addStory(token, description, photo, lat, lon) {
    const formData = new FormData();
    formData.append("description", description);
    formData.append("photo", photo);
    if (lat && lon) {
      formData.append("lat", lat);
      formData.append("lon", lon);
    }

    const res = await fetch(`${BASE_URL}/stories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json();
  },

  // fungsi hapus cerita
  async deleteStory(token, storyId) {
    try {
      const res = await fetch(`${BASE_URL}/stories/${storyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      let result = {};
      try {
        result = await res.json();
      } catch {
        result = { message: res.ok ? "Story deleted" : "Failed to delete" };
      }

      return result;
    } catch (error) {
      console.error("Gagal menghapus cerita:", error);
      return { error: true, message: error.message };
    }
  },
};

export default Api;
