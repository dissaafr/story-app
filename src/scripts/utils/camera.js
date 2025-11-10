export default class CameraHandler {
  constructor(videoElement, imagePreview) {
    this.videoElement = videoElement;
    this.imagePreview = imagePreview;
    this.stream = null;
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoElement.srcObject = this.stream;
      this.videoElement.play();
    } catch (error) {
      alert("Tidak dapat mengakses kamera: " + error.message);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.videoElement.srcObject = null;
  }

  capturePhoto() {
    const canvas = document.createElement("canvas");
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(this.videoElement, 0, 0);
    const imageData = canvas.toDataURL("image/png");
    this.imagePreview.src = imageData;
    return imageData;
  }
}
