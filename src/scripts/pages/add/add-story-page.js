import Api from "../../data/api.js";
import Swal from "sweetalert2";
import {
  getAllOfflineStories,
  deleteOfflineStory,
  saveOfflineStory,
} from "../../utils/idb.js";
import { syncOfflineStories } from "../../utils/sync.js";

export default class AddStoryPage {
  async render() {
    return `
      <section class="add-story container">
        <h1>📝 Tambah Cerita Baru</h1>
        
        <!-- Banner Status Koneksi -->
        <div id="connection-status" style="display:none;"></div>

        <form id="add-story-form" style="background:white; padding:24px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.1); margin-bottom:30px;">
          <div class="form-group">
            <label for="story-body">Deskripsi *</label>
            <textarea id="story-body" placeholder="Ceritakan pengalaman Anda..." required rows="5"></textarea>
          </div>

          <div class="form-group">
            <label for="story-file">📷 Foto</label>
            <input type="file" id="story-file" accept="image/*" aria-label="Upload Foto" />

            <img id="photo-preview" alt="Preview" style="width:100%; max-height:300px; margin-top:10px; border:2px solid #ddd; display:none; border-radius:8px;" />

            <video id="camera-preview" autoplay playsinline style="width:100%; max-height:300px; border:2px solid #ddd; display:none; border-radius:8px; margin-top:10px;"></video>

            <div class="camera-buttons" style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
              <button type="button" id="start-camera-btn" class="btn-submit" style="flex:1; min-width:120px;">📷 Kamera</button>
              <button type="button" id="capture-btn" class="btn-submit" disabled style="flex:1; min-width:120px; opacity:0.5;">📸 Ambil</button>
              <button type="button" id="cancel-camera-btn" class="btn-submit" disabled style="flex:1; min-width:120px; opacity:0.5; background:#dc3545;">❌ Tutup</button>
            </div>
          </div>

          <fieldset class="form-group" style="border:2px solid #ddd; padding:15px; border-radius:8px;">
            <legend style="font-weight:600; padding:0 10px;">📍 Pilih Lokasi (klik di peta) *</legend>
            <div id="map-container">
              <div id="map-add" style="height: 300px; border-radius:8px; background:#f0f0f0;">
                <div style="display:flex; align-items:center; justify-content:center; height:100%;">
                  <p style="color:#999;">⏳ Loading map...</p>
                </div>
              </div>
            </div>
            <small style="color:#666; display:block; margin-top:8px;">Klik pada peta untuk memilih lokasi cerita</small>
          </fieldset>

          <button type="submit" class="btn-submit" style="width:100%; padding:16px; font-size:18px; font-weight:600;">
            📤 Bagikan Cerita
          </button>
        </form>

        <!-- ===== SECTION PENDING STORIES ===== -->
        <div id="pending-stories-section" style="margin-top:0; display:none;">
          <div style="
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            padding: 24px;
            border-radius: 16px;
            border: 3px solid #ffc107;
            box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
          ">
            <!-- Header -->
            <div style="
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #ffc107;
            ">
              <div style="
                background: #ffc107;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
              ">⏳</div>
              <div style="flex: 1;">
                <h2 style="margin: 0; color: #856404; font-size: 22px; font-weight: 700;">
                  Cerita Pending Offline
                </h2>
                <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">
                  <span id="pending-count" style="font-weight:700;">0</span> cerita menunggu untuk diupload
                </p>
              </div>
              <button 
                id="sync-now-btn" 
                class="btn-submit" 
                style="
                  background: #28a745;
                  padding: 10px 20px;
                  font-size: 14px;
                  white-space: nowrap;
                " 
                disabled
              >
                🔄 Sync
              </button>
            </div>
            
            <!-- Info Box -->
            <div style="
              background: white;
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 15px;
              border-left: 4px solid #ffc107;
            ">
              <p style="margin: 0; font-size: 13px; color: #666;">
                💡 <strong>Info:</strong> Cerita ini akan otomatis diupload saat koneksi internet kembali normal.
                Anda bisa menghapus cerita pending sebelum ter-upload.
              </p>
            </div>

            <!-- Pending List -->
            <div id="pending-stories-container" style="margin-top: 15px;">
              <!-- Stories will be rendered here -->
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const form = document.querySelector("#add-story-form");
    const mapContainer = document.querySelector("#map-add");
    const pendingContainer = document.querySelector(
      "#pending-stories-container"
    );
    const pendingSection = document.querySelector("#pending-stories-section");
    const pendingCountEl = document.querySelector("#pending-count");
    const connectionStatus = document.querySelector("#connection-status");
    const syncNowBtn = document.querySelector("#sync-now-btn");

    const video = document.querySelector("#camera-preview");
    const photoPreview = document.querySelector("#photo-preview");
    const startCameraBtn = document.querySelector("#start-camera-btn");
    const captureBtn = document.querySelector("#capture-btn");
    const cancelBtn = document.querySelector("#cancel-camera-btn");
    const fileInput = document.querySelector("#story-file");

    let selectedLat = null;
    let selectedLon = null;
    let capturedBlob = null;
    let stream = null;
    let map = null;
    let marker = null;
    let mapInitialized = false;

    /* ==== LAZY LOAD MAP ==== */
    const initMap = () => {
      if (mapInitialized) return;

      try {
        mapContainer.innerHTML = "";

        map = L.map(mapContainer, {
          zoomControl: true,
          attributionControl: false,
        }).setView([-8.65, 115.21], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          updateWhenIdle: true,
          keepBuffer: 2,
        }).addTo(map);

        map.on("click", (e) => {
          selectedLat = e.latlng.lat;
          selectedLon = e.latlng.lng;
          if (marker) {
            marker.setLatLng(e.latlng);
          } else {
            marker = L.marker(e.latlng).addTo(map);
          }

          Swal.fire({
            icon: "success",
            title: "Lokasi Dipilih",
            text: `${selectedLat.toFixed(4)}, ${selectedLon.toFixed(4)}`,
            timer: 1000,
            showConfirmButton: false,
          });
        });

        mapInitialized = true;
        console.log("✅ Map initialized");
      } catch (error) {
        console.error("❌ Map init error:", error);
      }
    };

    setTimeout(initMap, 100);

    /* ==== CONNECTION STATUS ==== */
    const updateConnectionStatus = () => {
      const isOnline = navigator.onLine;

      connectionStatus.style.cssText = isOnline
        ? "display:none;"
        : "background:#f8d7da; color:#721c24; border:2px solid #f5c6cb; padding:12px 20px; margin-bottom:20px; border-radius:8px; text-align:center; font-weight:bold; display:block;";

      connectionStatus.textContent = isOnline
        ? ""
        : "📴 Mode Offline - Cerita akan disimpan sementara";

      if (syncNowBtn) {
        syncNowBtn.disabled = !isOnline;
        syncNowBtn.style.opacity = isOnline ? "1" : "0.5";
        syncNowBtn.textContent = isOnline ? "🔄 Sync" : "⏸️ Offline";
      }
    };

    window.addEventListener("online", () => {
      updateConnectionStatus();
      setTimeout(handleAutoSync, 1000);
    });

    window.addEventListener("offline", updateConnectionStatus);
    updateConnectionStatus();

    /* ==== CAMERA ==== */
    startCameraBtn.addEventListener("click", async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        video.srcObject = stream;
        video.style.display = "block";
        photoPreview.style.display = "none";
        captureBtn.disabled = false;
        captureBtn.style.opacity = "1";
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = "1";
      } catch (err) {
        Swal.fire("Error", "Kamera tidak tersedia", "error");
      }
    });

    captureBtn.addEventListener("click", () => {
      if (!stream) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      canvas.toBlob(
        (blob) => {
          capturedBlob = blob;
          photoPreview.src = URL.createObjectURL(blob);
          photoPreview.style.display = "block";
          video.style.display = "none";

          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            stream = null;
          }
          captureBtn.disabled = true;
          captureBtn.style.opacity = "0.5";
          cancelBtn.disabled = true;
          cancelBtn.style.opacity = "0.5";

          Swal.fire({
            icon: "success",
            title: "Foto Diambil!",
            timer: 1000,
            showConfirmButton: false,
          });
        },
        "image/jpeg",
        0.8
      );
    });

    cancelBtn.addEventListener("click", () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      video.srcObject = null;
      video.style.display = "none";
      captureBtn.disabled = true;
      captureBtn.style.opacity = "0.5";
      cancelBtn.disabled = true;
      cancelBtn.style.opacity = "0.5";
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        capturedBlob = null;
        photoPreview.src = URL.createObjectURL(e.target.files[0]);
        photoPreview.style.display = "block";
        video.style.display = "none";
      }
    });

    /* ==== RENDER PENDING STORIES ==== */
    async function renderPendingStories() {
      try {
        const stories = await getAllOfflineStories();

        console.log("📋 Pending stories:", stories);

        if (pendingCountEl) {
          pendingCountEl.textContent = stories.length;
        }

        if (stories.length === 0) {
          pendingSection.style.display = "none";
          return;
        }

        pendingSection.style.display = "block";

        pendingContainer.innerHTML = stories
          .map(
            (story, index) => `
          <div class="pending-item" style="
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s;
          "
          onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
          onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
            <div style="display:flex; gap:12px; align-items:start;">
              <div style="
                background: #ffc107;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-size: 18px;
              ">📝</div>
              
              <div style="flex:1; min-width:0;">
                <p style="margin:0 0 10px 0; color:#333; font-size:15px; line-height:1.4; font-weight:500;">
                  ${
                    story.description.length > 150
                      ? story.description.substring(0, 150) + "..."
                      : story.description
                  }
                </p>
                
                <div style="display:flex; gap:15px; flex-wrap:wrap; font-size:12px; color:#666; margin-bottom:10px;">
                  <span style="display:flex; align-items:center; gap:4px;">
                    <span>📍</span>
                    <span>${story.lat?.toFixed(2)}, ${story.lon?.toFixed(
              2
            )}</span>
                  </span>
                  <span style="display:flex; align-items:center; gap:4px;">
                    <span>🕐</span>
                    <span>${new Date(story.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</span>
                  </span>
                  ${
                    story.photo
                      ? '<span style="display:flex; align-items:center; gap:4px;"><span>📷</span><span>Dengan foto</span></span>'
                      : ""
                  }
                </div>
                
                <button 
                  class="delete-pending-btn" 
                  data-index="${index}"
                  style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                  "
                  onmouseover="this.style.background='#c82333'"
                  onmouseout="this.style.background='#dc3545'"
                >
                  🗑️ Hapus Cerita Ini
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join("");

        document.querySelectorAll(".delete-pending-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const index = parseInt(e.target.dataset.index);

            const result = await Swal.fire({
              title: "Hapus Cerita Pending?",
              text: "Cerita ini akan dihapus permanen",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#dc3545",
              confirmButtonText: "Ya, Hapus!",
              cancelButtonText: "Batal",
            });

            if (result.isConfirmed) {
              await deleteOfflineStory(index);
              await renderPendingStories();
              Swal.fire({
                icon: "success",
                title: "Dihapus!",
                text: "Cerita pending berhasil dihapus",
                timer: 1500,
                showConfirmButton: false,
              });
            }
          });
        });
      } catch (error) {
        console.error("❌ Error rendering pending:", error);
      }
    }

    /* ==== AUTO SYNC ==== */
    async function handleAutoSync() {
      const stories = await getAllOfflineStories();
      if (stories.length === 0) return;

      Swal.fire({
        title: "🔄 Menyinkronkan...",
        text: `Mengupload ${stories.length} cerita`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const result = await syncOfflineStories();
        await renderPendingStories();

        Swal.fire({
          icon: "success",
          title: "Sync Berhasil!",
          text: `${result.success} cerita berhasil diupload`,
          timer: 2000,
          showConfirmButton: false,
        });

        if (window.refreshStories) {
          setTimeout(() => window.refreshStories(), 500);
        }
      } catch (err) {
        console.error("Sync error:", err);
        Swal.close();
      }
    }

    if (syncNowBtn) {
      syncNowBtn.addEventListener("click", handleAutoSync);
    }

    /* ==== SUBMIT FORM ==== */
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const description = document.querySelector("#story-body").value.trim();
      const token = localStorage.getItem("token");

      if (!token) {
        Swal.fire("Error", "Silakan login!", "error");
        window.location.hash = "/login";
        return;
      }

      if (!description) {
        return Swal.fire("Error", "Deskripsi harus diisi!", "error");
      }

      if (!selectedLat || !selectedLon) {
        return Swal.fire("Error", "Pilih lokasi di peta!", "error");
      }

      if (!capturedBlob && !fileInput.files[0]) {
        return Swal.fire("Error", "Upload atau ambil foto!", "error");
      }

      const photo = capturedBlob || fileInput.files[0];

      Swal.fire({
        title: "📤 Mengirim...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        if (navigator.onLine) {
          const result = await Api.addStory(
            token,
            description,
            photo,
            selectedLat,
            selectedLon
          );

          Swal.close();

          if (!result.error) {
            await Swal.fire({
              icon: "success",
              title: "Berhasil!",
              text: "Cerita berhasil dibagikan",
              timer: 1500,
              showConfirmButton: false,
            });

            form.reset();
            photoPreview.style.display = "none";
            selectedLat = null;
            selectedLon = null;
            capturedBlob = null;
            if (marker && map) map.removeLayer(marker);
            marker = null;

            if (window.refreshStories) window.refreshStories();
            window.location.hash = "/";
          } else {
            throw new Error(result.message);
          }
        } else {
          throw new Error("Offline");
        }
      } catch (err) {
        console.warn("📴 Offline, saving...");

        await saveOfflineStory({
          description,
          lat: selectedLat,
          lon: selectedLon,
          photo,
          token,
          createdAt: new Date().toISOString(),
        });

        Swal.close();

        await Swal.fire({
          icon: "info",
          title: "Tersimpan Offline!",
          text: "Cerita akan diupload otomatis saat online",
          confirmButtonText: "OK",
        });

        form.reset();
        photoPreview.style.display = "none";
        selectedLat = null;
        selectedLon = null;
        capturedBlob = null;
        if (marker && map) map.removeLayer(marker);
        marker = null;

        await renderPendingStories();
      }
    });

    setTimeout(() => renderPendingStories(), 300);
  }
}
