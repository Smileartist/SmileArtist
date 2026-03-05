const sharp = require("sharp");
const path = require("path");

const inputPath = path.resolve(__dirname, "src/assets/favicon.png");
const outputPath = path.resolve(__dirname, "public/favicon.svg");

sharp(inputPath)
  .resize(32, 32) // Favicons are typically small
  .toFile(outputPath, (err, info) => {
    if (err) {
      console.error("Error converting image:", err);
    } else {
      console.log("Image conversion successful:", info);
    }
  });