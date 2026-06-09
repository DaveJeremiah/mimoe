// Flood-fill sky remover for the Eiffel Tower photo.
// Samples the sky colour from the top edge, then removes all pixels
// within a colour-distance threshold, starting from every edge pixel.
import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC  = path.join(__dirname, "../public/images/a1-bg.jpg");
const DEST = path.join(__dirname, "../public/images/a1-bg.png");

const THRESHOLD = 68;   // colour distance to count as "sky"
const SAMPLE_Y  = 4;    // row to sample sky colour from

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

const img = await Jimp.read(SRC);
const { width, height } = img.bitmap;

// Sample average sky colour across the top of the image
let sr = 0, sg = 0, sb = 0, n = 0;
for (let x = 0; x < width; x++) {
  const hex = img.getPixelColor(x, SAMPLE_Y);
  const { r, g, b } = Jimp.intToRGBA ? Jimp.intToRGBA(hex) : { r: (hex>>>24)&0xff, g: (hex>>>16)&0xff, b: (hex>>>8)&0xff };
  sr += r; sg += g; sb += b; n++;
}
sr = sr/n; sg = sg/n; sb = sb/n;
console.log(`Sky sample colour: rgb(${Math.round(sr)}, ${Math.round(sg)}, ${Math.round(sb)})`);

// Flood fill from all four edges
const visited = new Uint8Array(width * height);
const queue  = [];

const enqueue = (x, y) => {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = y * width + x;
  if (visited[idx]) return;
  const hex2 = img.getPixelColor(x, y);
  const { r, g, b } = Jimp.intToRGBA ? Jimp.intToRGBA(hex2) : { r: (hex2>>>24)&0xff, g: (hex2>>>16)&0xff, b: (hex2>>>8)&0xff };
  if (colorDist(r, g, b, sr, sg, sb) <= THRESHOLD) {
    visited[idx] = 1;
    queue.push([x, y]);
  }
};

// Seed from all four edges
for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

// BFS
while (queue.length) {
  const [x, y] = queue.shift();
  img.setPixelColor(0x00000000, x, y);          // fully transparent
  enqueue(x+1, y); enqueue(x-1, y);
  enqueue(x, y+1); enqueue(x, y-1);
}

await img.write(DEST);
console.log(`Done → ${DEST}`);
