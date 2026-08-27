// Modified Median Cut Quantization (MMCQ) for Color Reduction
// Converts raw RGBA pixel data to K dominant RGB colors

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const SIGBITS = 5;
const RSHIFT = 8 - SIGBITS;

function getHistoIndex(r: number, g: number, b: number): number {
  return (r << (2 * SIGBITS)) + (g << SIGBITS) + b;
}

class VBox {
  r1: number;
  r2: number;
  g1: number;
  g2: number;
  b1: number;
  b2: number;
  histo: Int32Array;

  private _volume: number | null = null;
  private _count: number | null = null;
  private _avg: RGB | null = null;

  constructor(
    r1: number,
    r2: number,
    g1: number,
    g2: number,
    b1: number,
    b2: number,
    histo: Int32Array
  ) {
    this.r1 = r1;
    this.r2 = r2;
    this.g1 = g1;
    this.g2 = g2;
    this.b1 = b1;
    this.b2 = b2;
    this.histo = histo;
  }

  volume(): number {
    if (this._volume === null) {
      this._volume = (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
    }
    return this._volume;
  }

  count(): number {
    if (this._count === null) {
      let npix = 0;
      for (let r = this.r1; r <= this.r2; r++) {
        for (let g = this.g1; g <= this.g2; g++) {
          for (let b = this.b1; b <= this.b2; b++) {
            const index = getHistoIndex(r, g, b);
            npix += this.histo[index];
          }
        }
      }
      this._count = npix;
    }
    return this._count;
  }

  copy(): VBox {
    return new VBox(this.r1, this.r2, this.g1, this.g2, this.b1, this.b2, this.histo);
  }

  avg(): RGB {
    if (this._avg === null) {
      let ntot = 0;
      let rsum = 0;
      let gsum = 0;
      let bsum = 0;

      const mult = 1 << RSHIFT; // 8

      for (let r = this.r1; r <= this.r2; r++) {
        for (let g = this.g1; g <= this.g2; g++) {
          for (let b = this.b1; b <= this.b2; b++) {
            const index = getHistoIndex(r, g, b);
            const h = this.histo[index];
            if (h > 0) {
              ntot += h;
              rsum += h * (r + 0.5) * mult;
              gsum += h * (g + 0.5) * mult;
              bsum += h * (b + 0.5) * mult;
            }
          }
        }
      }

      if (ntot > 0) {
        this._avg = {
          r: Math.min(255, Math.max(0, Math.round(rsum / ntot))),
          g: Math.min(255, Math.max(0, Math.round(gsum / ntot))),
          b: Math.min(255, Math.max(0, Math.round(bsum / ntot))),
        };
      } else {
        this._avg = {
          r: Math.min(255, Math.max(0, Math.round((mult * (this.r1 + this.r2 + 1)) / 2))),
          g: Math.min(255, Math.max(0, Math.round((mult * (this.g1 + this.g2 + 1)) / 2))),
          b: Math.min(255, Math.max(0, Math.round((mult * (this.b1 + this.b2 + 1)) / 2))),
        };
      }
    }
    return this._avg;
  }
}

function getHistogram(pixels: Uint8ClampedArray): Int32Array {
  const histo = new Int32Array(1 << (3 * SIGBITS));
  const numPixels = pixels.length / 4;

  for (let i = 0; i < numPixels; i++) {
    const a = pixels[i * 4 + 3];
    if (a < 128) continue; // Skip transparent pixels

    const r = pixels[i * 4] >> RSHIFT;
    const g = pixels[i * 4 + 1] >> RSHIFT;
    const b = pixels[i * 4 + 2] >> RSHIFT;

    const index = getHistoIndex(r, g, b);
    histo[index]++;
  }

  return histo;
}

function vboxFromPixels(pixels: Uint8ClampedArray, histo: Int32Array): VBox {
  let rmin = 32, rmax = 0;
  let gmin = 32, gmax = 0;
  let bmin = 32, bmax = 0;

  const numPixels = pixels.length / 4;
  for (let i = 0; i < numPixels; i++) {
    if (pixels[i * 4 + 3] < 128) continue;

    const r = pixels[i * 4] >> RSHIFT;
    const g = pixels[i * 4 + 1] >> RSHIFT;
    const b = pixels[i * 4 + 2] >> RSHIFT;

    if (r < rmin) rmin = r;
    if (r > rmax) rmax = r;
    if (g < gmin) gmin = g;
    if (g > gmax) gmax = g;
    if (b < bmin) bmin = b;
    if (b > bmax) bmax = b;
  }

  return new VBox(
    Math.min(rmin, rmax),
    Math.max(rmin, rmax),
    Math.min(gmin, gmax),
    Math.max(gmin, gmax),
    Math.min(bmin, bmax),
    Math.max(bmin, bmax),
    histo
  );
}

function doCut(color: 'r' | 'g' | 'b', vbox: VBox, histo: Int32Array): [VBox, VBox] | null {
  let dim1 = 0, dim2 = 0;
  if (color === 'r') {
    dim1 = vbox.r1;
    dim2 = vbox.r2;
  } else if (color === 'g') {
    dim1 = vbox.g1;
    dim2 = vbox.g2;
  } else {
    dim1 = vbox.b1;
    dim2 = vbox.b2;
  }

  if (dim1 >= dim2) return null;

  const count = vbox.count();
  if (count === 0) return null;

  let total = 0;
  const partialSum = new Int32Array(dim2 - dim1 + 1);

  for (let i = dim1; i <= dim2; i++) {
    let sum = 0;
    for (let j = (color === 'r' ? vbox.g1 : vbox.r1); j <= (color === 'r' ? vbox.g2 : vbox.r2); j++) {
      for (let k = (color === 'b' ? vbox.g1 : vbox.b1); k <= (color === 'b' ? vbox.g2 : vbox.b2); k++) {
        let index = 0;
        if (color === 'r') index = getHistoIndex(i, j, k);
        else if (color === 'g') index = getHistoIndex(j, i, k);
        else index = getHistoIndex(j, k, i);

        sum += histo[index];
      }
    }
    total += sum;
    partialSum[i - dim1] = total;
  }

  const halfCount = total / 2;
  let cutPoint = -1;

  for (let i = 0; i < partialSum.length; i++) {
    if (partialSum[i] >= halfCount) {
      cutPoint = dim1 + i;
      break;
    }
  }

  if (cutPoint === -1) cutPoint = dim1;
  if (cutPoint >= dim2) cutPoint = dim2 - 1;

  const vbox1 = vbox.copy();
  const vbox2 = vbox.copy();

  if (color === 'r') {
    vbox1.r2 = cutPoint;
    vbox2.r1 = cutPoint + 1;
  } else if (color === 'g') {
    vbox1.g2 = cutPoint;
    vbox2.g1 = cutPoint + 1;
  } else {
    vbox1.b2 = cutPoint;
    vbox2.b1 = cutPoint + 1;
  }

  if (vbox1.count() === 0 || vbox2.count() === 0) return null;

  return [vbox1, vbox2];
}

export function quantizeMMCQ(pixels: Uint8ClampedArray, maxColors: number): RGB[] {
  if (pixels.length === 0 || maxColors < 1) return [];

  const histo = getHistogram(pixels);
  const initialVbox = vboxFromPixels(pixels, histo);
  if (initialVbox.count() === 0) return [];

  const activeVBoxes: VBox[] = [initialVbox];

  while (activeVBoxes.length < maxColors) {
    // Sort active boxes by (count * volume) descending
    activeVBoxes.sort((a, b) => b.count() * b.volume() - a.count() * a.volume());

    let splitOccurred = false;

    for (let i = 0; i < activeVBoxes.length; i++) {
      const vbox = activeVBoxes[i];
      if (vbox.count() <= 1) continue;

      const rw = vbox.r2 - vbox.r1;
      const gw = vbox.g2 - vbox.g1;
      const bw = vbox.b2 - vbox.b1;

      // Try axes in order of size descending
      const axes: ('r' | 'g' | 'b')[] = (['r', 'g', 'b'] as ('r' | 'g' | 'b')[]).sort((a, b) => {
        const wA = a === 'r' ? rw : a === 'g' ? gw : bw;
        const wB = b === 'r' ? rw : b === 'g' ? gw : bw;
        return wB - wA;
      });

      let res: [VBox, VBox] | null = null;
      for (const axis of axes) {
        res = doCut(axis, vbox, histo);
        if (res) break;
      }

      if (res) {
        activeVBoxes.splice(i, 1, res[0], res[1]);
        splitOccurred = true;
        break;
      }
    }

    if (!splitOccurred) break; // No box could be split further
  }

  return activeVBoxes.map((v) => v.avg());
}
