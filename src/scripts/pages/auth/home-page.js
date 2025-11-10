import Api from "../../data/api.js";

export default class HomePage {
  async render() {
    return `
      <section class="home container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h1>📖 Daftar Cerita</h1>
          <button id="refresh-stories-btn" class="btn-submit" style="padding:10px 20px;">
            🔄 Refresh
          </button>
        </div>
        
        <div id="story-list"></div>

        <div id="map" style="height: 400px; border-radius: 8px; margin-top: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
      </section>
    `;
  }

  async afterRender() {
    const token = localStorage.getItem("token");
    const storyList = document.querySelector("#story-list");
    const refreshBtn = document.querySelector("#refresh-stories-btn");

    /* ==== INISIALISASI PETA ==== */
    const map = L.map("map").setView([-8.65, 115.21], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    const markerGroup = L.layerGroup().addTo(map);

    /* ==== RENDER CERITA ONLINE (2 KOLOM) ==== */
    const renderOnlineStories = async () => {
      storyList.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <div class="spinner" style="margin:0 auto;"></div>
          <p style="margin-top:15px; color:#666;">Memuat cerita...</p>
        </div>
      `;

      try {
        const data = await Api.getAllStories(token);

        if (data.error) {
          throw new Error(data.message);
        }

        if (!data.listStory || data.listStory.length === 0) {
          storyList.innerHTML = `
            <div style="
              background: white;
              padding: 60px 20px;
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            ">
              <p style="font-size: 48px; margin-bottom: 15px;">📖</p>
              <h3 style="color: #666; margin-bottom: 10px;">Belum Ada Cerita</h3>
              <p style="color: #999;">Mulai bagikan cerita pertamamu!</p>
              <a href="#/add" style="
                display: inline-block;
                margin-top: 20px;
                padding: 12px 24px;
                background: lightskyblue;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
              ">➕ Tambah Cerita</a>
            </div>
          `;
          return;
        }

        storyList.innerHTML = `
          <div style="
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
          ">
            ${data.listStory
              .map(
                (story) => `
              <div class="story-card" style="
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.2s, box-shadow 0.2s;
              " 
              onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                
                ${
                  story.photoUrl
                    ? `
                  <img 
                    src="${story.photoUrl}" 
                    alt="Foto cerita ${story.name}" 
                    style="
                      width: 100%;
                      height: 250px;
                      object-fit: cover;
                    "
                    loading="lazy"
                  >
                `
                    : ""
                }
                
                <div style="padding: 16px;">
                  <h3 style="
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    color: #333;
                    font-weight: 600;
                  ">${story.name}</h3>
                  
                  <p style="
                    margin: 0 0 12px 0;
                    color: #555;
                    line-height: 1.5;
                    font-size: 14px;
                  ">${story.description}</p>
                  
                  <div style="
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    font-size: 12px;
                    color: #777;
                    border-top: 1px solid #eee;
                    padding-top: 12px;
                  ">
                    ${
                      story.lat && story.lon
                        ? `
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span>📍</span>
                        <span>Koordinat: ${story.lat.toFixed(
                          4
                        )}, ${story.lon.toFixed(4)}</span>
                      </div>
                    `
                        : ""
                    }
                    
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span>🕐</span>
                      <span>${new Date(story.createdAt).toLocaleString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}</span>
                    </div>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <style>
            @media (max-width: 768px) {
              #story-list > div {
                grid-template-columns: 1fr !important;
              }
            }
          </style>
        `;

        markerGroup.clearLayers();
        data.listStory.forEach((story) => {
          if (story.lat && story.lon) {
            const marker = L.marker([story.lat, story.lon]).addTo(markerGroup);
            marker.bindPopup(`
              <div style="max-width:200px;">
                <strong style="font-size:14px;">${story.name}</strong><br>
                <p style="margin:8px 0; font-size:12px; color:#555;">${story.description.substring(
                  0,
                  100
                )}${story.description.length > 100 ? "..." : ""}</p>
                ${
                  story.photoUrl
                    ? `<img src="${story.photoUrl}" style="width:100%; border-radius:4px; margin-top:8px;">`
                    : ""
                }
              </div>
            `);
          }
        });

        if (data.listStory.some((s) => s.lat && s.lon)) {
          const bounds = data.listStory
            .filter((s) => s.lat && s.lon)
            .map((s) => [s.lat, s.lon]);
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      } catch (err) {
        console.error("Gagal load cerita online:", err);
        storyList.innerHTML = `
          <div style="
            background: #f8d7da;
            border: 2px solid #f5c6cb;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          ">
            <p style="font-size: 36px; margin-bottom: 10px;">📴</p>
            <h3 style="margin-bottom: 10px;">Tidak Dapat Memuat Cerita</h3>
            <p style="margin-bottom: 15px; font-size: 14px;">
              ${
                navigator.onLine
                  ? "Terjadi kesalahan saat memuat cerita dari server."
                  : "Kamu sedang offline. Cerita tidak dapat dimuat."
              }
            </p>
            <button 
              onclick="window.location.reload()" 
              style="
                padding: 10px 20px;
                background: #721c24;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
              "
            >
              🔄 Coba Lagi
            </button>
          </div>
        `;
      }
    };

    /* ==== RENDER AWAL ==== */
    await renderOnlineStories();

    /* ==== REFRESH BUTTON ==== */
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "🔄 Memuat...";
        await renderOnlineStories();
        refreshBtn.disabled = false;
        refreshBtn.textContent = "🔄 Refresh";
      });
    }

    /* ==== GLOBAL REFRESH FUNCTION ==== */
    window.refreshStories = renderOnlineStories;

    /* ==== EVENT: ONLINE (AUTO RELOAD) ==== */
    window.addEventListener("online", async () => {
      console.log("🌐 Koneksi kembali online! Memuat ulang cerita...");
      await renderOnlineStories();
    });
  }
}
