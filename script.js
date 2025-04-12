let originalImageData = null;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

document.getElementById("imageInput").addEventListener("change", handleImageUpload);

// Update labels live
["threshold", "brightness", "contrast"].forEach((id) => {
  const slider = document.getElementById(`${id}Slider`);
  const label = document.getElementById(`${id}Value`);
  slider.addEventListener("input", () => {
    label.textContent = slider.value;
    applyAll();
  });
});

document.getElementById("grayscaleToggle").addEventListener("change", applyAll);

function handleImageUpload(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyAll();
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

function applyAll() {
  if (!originalImageData) return;

  const threshold = +document.getElementById("thresholdSlider").value;
  const brightness = +document.getElementById("brightnessSlider").value;
  const contrast = +document.getElementById("contrastSlider").value;
  const isGray = document.getElementById("grayscaleToggle").checked;

  let imageData = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );

  if (isGray) {
    for (let i = 0; i < imageData.data.length; i += 4) {
      const avg = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
      imageData.data[i] = imageData.data[i+1] = imageData.data[i+2] = avg;
    }
  }

  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imageData.data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      let val = imageData.data[i + j];
      val = factor * (val - 128) + 128 + brightness;
      imageData.data[i + j] = clamp(val);
    }
  }

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const idx = (y * imageData.width + x) * 4;
      const oldPixel = imageData.data[idx];
      const newPixel = oldPixel < threshold ? 0 : 255;
      const error = oldPixel - newPixel;

      imageData.data[idx] = imageData.data[idx+1] = imageData.data[idx+2] = newPixel;

      distributeError(imageData.data, x+1, y, imageData.width, error * 7/16);
      distributeError(imageData.data, x-1, y+1, imageData.width, error * 3/16);
      distributeError(imageData.data, x, y+1, imageData.width, error * 5/16);
      distributeError(imageData.data, x+1, y+1, imageData.width, error * 1/16);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function distributeError(data, x, y, width, error) {
  if (x < 0 || y < 0 || x >= width || y * width * 4 >= data.length) return;
  const idx = (y * width + x) * 4;
  for (let i = 0; i < 3; i++) {
    data[idx + i] = clamp(data[idx + i] + error);
  }
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function resetImage() {
  if (originalImageData) {
    ctx.putImageData(originalImageData, 0, 0);
  }
}

function downloadImage() {
  const fileType = document.getElementById("fileTypeSelect").value;
  const link = document.createElement("a");
  link.download = `edited-image.${fileType}`;
  link.href = canvas.toDataURL(`image/${fileType}`);
  link.click();
}

function randomizeEffects() {
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const threshold = randomInt(0, 255);
  const brightness = randomInt(-100, 100);
  const contrast = randomInt(-100, 100);
  const grayscale = Math.random() < 0.5;

  document.getElementById("thresholdSlider").value = threshold;
  document.getElementById("thresholdValue").textContent = threshold;

  document.getElementById("brightnessSlider").value = brightness;
  document.getElementById("brightnessValue").textContent = brightness;

  document.getElementById("contrastSlider").value = contrast;
  document.getElementById("contrastValue").textContent = contrast;

  document.getElementById("grayscaleToggle").checked = grayscale;

  applyAll();
}
