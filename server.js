import express from "express";
import webpush from "web-push";
import fs from "fs";

const app = express();
app.use(express.json());

const vapidKeys = {
  publicKey: "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk",
  privateKey: "NkVbpBaJd4xDgM8dBIUeri9PN7hnYFQXuUG_wejSgoc",
};

webpush.setVapidDetails(
  "mailto:admin@timenest.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const SUBS_FILE = "subscriptions.json";

const loadSubs = () => {
  if (!fs.existsSync(SUBS_FILE)) return [];
  return JSON.parse(fs.readFileSync(SUBS_FILE));
};
const saveSubs = (subs) => {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs));
};

app.post("/subscribe", (req, res) => {
  const subs = loadSubs();
  subs.push(req.body);
  saveSubs(subs);
  res.json({ success: true });
});

app.post("/send-notification", async (req, res) => {
  const subs = loadSubs();
  const payload = JSON.stringify({
    title: "Story Baru!",
    body: req.body.message || "Kamu baru menambahkan story 🎉",
    url: "/#/stories",
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      console.error("Gagal kirim notif:", err);
    }
  }
  res.json({ success: true });
});

app.listen(4000, () => console.log("✅ Notification server running on http://localhost:4000"));
