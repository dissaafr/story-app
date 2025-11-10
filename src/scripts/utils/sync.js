import Api from "../data/api.js";
import { getAllOfflineStories, clearOfflineStories } from "./idb.js";

let isSyncing = false;

/**
 * Sinkronisasi semua cerita offline ke server
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */

export async function syncOfflineStories() {
  console.log("🔄 Memulai sinkronisasi cerita offline...");

  if (isSyncing) {
    console.warn("⚠️ Sync already in progress, skipping...");
    return { success: 0, failed: 0, errors: [], skipped: true };
  }

  if (!navigator.onLine) {
    console.warn("📴 Tidak ada koneksi internet. Sync dibatalkan.");
    throw new Error("Tidak ada koneksi internet");
  }

  isSyncing = true;
  try {
    const stories = await getAllOfflineStories();

    if (!stories || stories.length === 0) {
      console.log("✅ Tidak ada cerita offline untuk disinkronkan.");
      isSyncing = false;
      return { success: 0, failed: 0, errors: [] };
    }

    console.log(`📤 Akan mengupload ${stories.length} cerita pending...`);

    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    const successIds = [];

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];

      try {
        console.log(
          `⬆️ [${i + 1}/${
            stories.length
          }] Mengupload: "${story.description.substring(0, 50)}..."`
        );

        let photoBlob = story.photo;

        if (typeof story.photo === "string") {
          if (story.photo.startsWith("data:")) {
            const response = await fetch(story.photo);
            photoBlob = await response.blob();
          } else if (story.photo.startsWith("blob:")) {
            const response = await fetch(story.photo);
            photoBlob = await response.blob();
          }
        }

        const result = await Api.addStory(
          story.token,
          story.description,
          photoBlob,
          story.lat,
          story.lon
        );

        if (result.error) {
          throw new Error(result.message || "Upload gagal");
        }

        console.log(
          `✅ [${i + 1}/${stories.length}] Berhasil diupload! ID: ${
            result.story?.id || "unknown"
          }`
        );

        successIds.push(story.id);
        successCount++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error(
          `❌ [${i + 1}/${stories.length}] Gagal upload:`,
          err.message
        );
        errors.push({
          story: story.description.substring(0, 50),
          error: err.message,
        });
        failedCount++;

        if (
          err.message.includes("token") ||
          err.message.includes("unauthorized")
        ) {
          console.error("🔐 Token invalid, menghentikan sync");
          break;
        }

        if (!navigator.onLine) {
          console.error("📴 Koneksi terputus, menghentikan sync");
          break;
        }
      }
    }

    console.log(`
📊 HASIL SYNC:
   ✅ Berhasil: ${successCount}
   ❌ Gagal: ${failedCount}
   📝 Total: ${stories.length}
    `);

    if (successCount > 0) {
      console.log(
        "🧹 Membersihkan semua cerita offline yang sudah berhasil..."
      );
      await clearOfflineStories();
      console.log("✅ Offline stories cleared");
    }

    isSyncing = false; 
    return {
      success: successCount,
      failed: failedCount,
      total: stories.length,
      errors,
    };
  } catch (error) {
    console.error("❌ Sync error:", error);
    isSyncing = false;
    throw error;
  }
}

export async function autoSyncOnLoad() {
  if (!navigator.onLine) {
    console.log("📴 Offline - Auto sync dibatalkan");
    return;
  }

  const stories = await getAllOfflineStories();
  if (stories.length === 0) {
    console.log("✅ Tidak ada pending stories untuk di-sync");
    return;
  }

  console.log(`🔄 Auto sync: ${stories.length} cerita pending ditemukan`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const result = await syncOfflineStories();

    if (result.success > 0 && !result.skipped) {
      console.log(`✅ Auto sync berhasil: ${result.success} cerita diupload`);

      if (window.refreshStories) {
        setTimeout(() => {
          window.refreshStories();
        }, 500);
      }
    }
  } catch (err) {
    console.error("❌ Auto sync gagal:", err);
  }
}
