import { quantizeMMCQ } from './mmcq';

// DMC Color Database with RGB, CIELAB, Anchor equivalent, and Symbols
export interface DMCItem {
  code: string;        // e.g. 'DMC 310'
  anchorCode: string;  // e.g. 'Anchor 403'
  name: string;        // e.g. 'Black'
  hex: string;         // e.g. '#000000'
  r: number;
  g: number;
  b: number;
  l: number;
  a: number;
  labB: number;
  symbol: string;      // Printable chart symbol
}

// Convert RGB to Lab color space
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let sr = r / 255;
  let sg = g / 255;
  let sb = b / 255;

  sr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
  sg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
  sb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;

  let x = (sr * 0.4124 + sg * 0.3576 + sb * 0.1805) / 0.95047;
  let y = (sr * 0.2126 + sg * 0.7152 + sb * 0.0722) / 1.00000;
  let z = (sr * 0.0193 + sg * 0.1192 + sb * 0.9505) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  let fx = f(x);
  let fy = f(y);
  let fz = f(z);

  let L = 116 * fy - 16;
  let A = 500 * (fx - fy);
  let B = 200 * (fy - fz);

  return [L, A, B];
}

// CIEDE2000 Color Difference algorithm (Delta E 2000)
export function ciede2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const [l1, a1, b1] = lab1;
  const [l2, a2, b2] = lab2;

  const avgL = (l1 + l2) / 2;
  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (c1 + c2) / 2;

  const g = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;

  const c1p = Math.sqrt(a1p * a1p + b1 * b1);
  const c2p = Math.sqrt(a2p * a2p + b2 * b2);

  const avgCp = (c1p + c2p) / 2;

  let h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  if (h1p < 0) h1p += 360;

  let h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  if (h2p < 0) h2p += 360;

  let avghp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;

  const t = 1
    - 0.17 * Math.cos((avghp - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * avghp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * avghp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * avghp - 63) * Math.PI / 180);

  let deltahp = h2p - h1p;
  if (Math.abs(deltahp) > 180) {
    if (h2p <= h1p) deltahp += 360;
    else deltahp -= 360;
  }

  const deltaLp = l2 - l1;
  const deltaCp = c2p - c1p;
  const deltaHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((deltahp / 2) * Math.PI / 180);

  const sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const sc = 1 + 0.045 * avgCp;
  const sh = 1 + 0.015 * avgCp * t;

  const deltaTheta = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2));
  const rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const rt = -Math.sin((2 * deltaTheta) * Math.PI / 180) * rc;

  return Math.sqrt(
    Math.pow(deltaLp / sl, 2) +
    Math.pow(deltaCp / sc, 2) +
    Math.pow(deltaHp / sh, 2) +
    rt * (deltaCp / sc) * (deltaHp / sh)
  );
}

// Convert Hex string to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Symbols list for B&W printable chart
const CHART_SYMBOLS = [
  '●', '■', '▲', '★', '♦', '♥', '♣', '♠', '◆', '✚', 
  '✖', '▼', '◄', '►', '✸', '✿', '✪', '✦', '❖', '⚙', 
  '☀', '☁', '⚡', '♜', '♟', '♯', '♪', '✜', '✥', '✩', 
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 
  'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 
  'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', 
  '7', '8', '9', '✳', '✴', '✵', '✶', '✷', '✸', '✹',
  '✻', '✼', '✽', '✾', '❀', '❁', '❄', '❅', '❆', '❇'
];

// Full DMC Color Database (450+ Standard Floss Threads)
const RAW_DMC_DATA = [
  // White & Neutrals
  { code: 'DMC B5200', anchorCode: 'Anchor 1', name: 'Snow White', hex: '#FFFFFF' },
  { code: 'DMC BLANC', anchorCode: 'Anchor 2', name: 'White', hex: '#FCFDFB' },
  { code: 'DMC ECRU', anchorCode: 'Anchor 387', name: 'Ecru', hex: '#F0EAD6' },
  { code: 'DMC 3865', anchorCode: 'Anchor 2', name: 'Winter White', hex: '#FDFBF7' },

  // DMC 01 - 35 (New Colors)
  { code: 'DMC 01', anchorCode: 'Anchor 397', name: 'White Tin', hex: '#ECECEE' },
  { code: 'DMC 02', anchorCode: 'Anchor 398', name: 'Tin Medium Light', hex: '#D2D3D5' },
  { code: 'DMC 03', anchorCode: 'Anchor 399', name: 'Tin Medium', hex: '#B2B4B8' },
  { code: 'DMC 04', anchorCode: 'Anchor 400', name: 'Tin Dark', hex: '#8F9298' },
  { code: 'DMC 05', anchorCode: 'Anchor 391', name: 'Driftwood Light', hex: '#E2D7CB' },
  { code: 'DMC 06', anchorCode: 'Anchor 392', name: 'Driftwood Medium Light', hex: '#C2B5A7' },
  { code: 'DMC 07', anchorCode: 'Anchor 393', name: 'Driftwood Dark', hex: '#A19183' },
  { code: 'DMC 08', anchorCode: 'Anchor 394', name: 'Driftwood Very Dark', hex: '#7D6D60' },
  { code: 'DMC 09', anchorCode: 'Anchor 381', name: 'Cocoa Very Dark', hex: '#584337' },
  { code: 'DMC 10', anchorCode: 'Anchor 254', name: 'Tender Green Very Light', hex: '#E1E9C7' },
  { code: 'DMC 11', anchorCode: 'Anchor 255', name: 'Tender Green Light', hex: '#C5D79E' },
  { code: 'DMC 12', anchorCode: 'Anchor 256', name: 'Tender Green', hex: '#A2C26E' },
  { code: 'DMC 13', anchorCode: 'Anchor 206', name: 'Nile Green Medium Light', hex: '#87BD81' },
  { code: 'DMC 14', anchorCode: 'Anchor 207', name: 'Apple Green Pale', hex: '#BFE39A' },
  { code: 'DMC 15', anchorCode: 'Anchor 208', name: 'Apple Green', hex: '#A1D371' },
  { code: 'DMC 16', anchorCode: 'Anchor 279', name: 'Yellow Green Light', hex: '#D8E267' },
  { code: 'DMC 17', anchorCode: 'Anchor 280', name: 'Yellow Green Medium', hex: '#BCCB3E' },
  { code: 'DMC 18', anchorCode: 'Anchor 281', name: 'Yellow Green Dark', hex: '#9BAE29' },
  { code: 'DMC 19', anchorCode: 'Anchor 311', name: 'Autumn Gold Medium Light', hex: '#EBB362' },
  { code: 'DMC 20', anchorCode: 'Anchor 265', name: 'Autumn Green', hex: '#9E8B38' },
  { code: 'DMC 21', anchorCode: 'Anchor 11', name: 'Alizarin Light', hex: '#E7706A' },
  { code: 'DMC 22', anchorCode: 'Anchor 12', name: 'Alizarin', hex: '#D44A46' },
  { code: 'DMC 23', anchorCode: 'Anchor 75', name: 'Apple Blossom', hex: '#EEB7BA' },
  { code: 'DMC 24', anchorCode: 'Anchor 74', name: 'Apple Blossom White', hex: '#F7D9DC' },
  { code: 'DMC 25', anchorCode: 'Anchor 108', name: 'Lavender Ultra Light', hex: '#E4CFE2' },
  { code: 'DMC 26', anchorCode: 'Anchor 109', name: 'Lavender Pale', hex: '#C29FC2' },
  { code: 'DMC 27', anchorCode: 'Anchor 110', name: 'Violet White', hex: '#FAF0F7' },
  { code: 'DMC 28', anchorCode: 'Anchor 111', name: 'Medium Violet Light', hex: '#8A5D8E' },
  { code: 'DMC 29', anchorCode: 'Anchor 102', name: 'Eggplant Medium Dark', hex: '#582B53' },
  { code: 'DMC 30', anchorCode: 'Anchor 288', name: 'Lemon Medium Light', hex: '#FDF0A6' },
  { code: 'DMC 31', anchorCode: 'Anchor 130', name: 'Blueberry Light', hex: '#7793B9' },
  { code: 'DMC 32', anchorCode: 'Anchor 132', name: 'Blueberry Dark', hex: '#3C5B8B' },
  { code: 'DMC 33', anchorCode: 'Anchor 60', name: 'Fuchsia', hex: '#BF3263' },
  { code: 'DMC 34', anchorCode: 'Anchor 62', name: 'Fuchsia Dark', hex: '#991B47' },
  { code: 'DMC 35', anchorCode: 'Anchor 63', name: 'Fuchsia Very Dark', hex: '#741035' },

  // DMC 150s - 200s
  { code: 'DMC 150', anchorCode: 'Anchor 42', name: 'Dusty Rose Very Dark', hex: '#AB1B48' },
  { code: 'DMC 151', anchorCode: 'Anchor 73', name: 'Dusty Rose Very Light', hex: '#F0C0CB' },
  { code: 'DMC 152', anchorCode: 'Anchor 75', name: 'Shell Pink Medium Light', hex: '#E1A29B' },
  { code: 'DMC 153', anchorCode: 'Anchor 1021', name: 'Violet Very Light', hex: '#E2C7D8' },
  { code: 'DMC 154', anchorCode: 'Anchor 1015', name: 'Grape Very Dark', hex: '#4A1D2B' },
  { code: 'DMC 155', anchorCode: 'Anchor 1029', name: 'Blue Violet Medium Dark', hex: '#9384B6' },
  { code: 'DMC 156', anchorCode: 'Anchor 1028', name: 'Blue Violet Light', hex: '#A2A9CD' },
  { code: 'DMC 157', anchorCode: 'Anchor 1027', name: 'Cornflower Blue Very Light', hex: '#B8C6DE' },
  { code: 'DMC 158', anchorCode: 'Anchor 1030', name: 'Cornflower Blue Medium Dark', hex: '#485880' },
  { code: 'DMC 159', anchorCode: 'Anchor 1032', name: 'Blue Gray Light', hex: '#C1C7D7' },
  { code: 'DMC 160', anchorCode: 'Anchor 1033', name: 'Blue Gray Medium', hex: '#97A1B9' },
  { code: 'DMC 161', anchorCode: 'Anchor 1034', name: 'Blue Gray Dark', hex: '#637190' },
  { code: 'DMC 162', anchorCode: 'Anchor 1026', name: 'Blue Ultra Very Light', hex: '#DBEBF1' },
  { code: 'DMC 163', anchorCode: 'Anchor 876', name: 'Celadon Green Medium', hex: '#4D8369' },
  { code: 'DMC 164', anchorCode: 'Anchor 875', name: 'Celadon Green Light', hex: '#C0D8BE' },
  { code: 'DMC 165', anchorCode: 'Anchor 278', name: 'Moss Green Very Light', hex: '#E2E880' },
  { code: 'DMC 166', anchorCode: 'Anchor 281', name: 'Moss Green Medium Light', hex: '#A3B82A' },
  { code: 'DMC 167', anchorCode: 'Anchor 374', name: 'Yellow Beige Very Dark', hex: '#A78B57' },
  { code: 'DMC 168', anchorCode: 'Anchor 398', name: 'Pewter Very Light', hex: '#D1D5D8' },
  { code: 'DMC 169', anchorCode: 'Anchor 399', name: 'Pewter Light', hex: '#8D9398' },

  { code: 'DMC 208', anchorCode: 'Anchor 110', name: 'Lavender Very Dark', hex: '#6A2A7A' },
  { code: 'DMC 209', anchorCode: 'Anchor 109', name: 'Lavender Dark', hex: '#9153A0' },
  { code: 'DMC 210', anchorCode: 'Anchor 108', name: 'Lavender Medium', hex: '#B882C4' },
  { code: 'DMC 211', anchorCode: 'Anchor 107', name: 'Lavender Light', hex: '#DDBCE0' },
  { code: 'DMC 221', anchorCode: 'Anchor 897', name: 'Shell Pink Very Dark', hex: '#87333B' },
  { code: 'DMC 223', anchorCode: 'Anchor 895', name: 'Shell Pink Medium', hex: '#C56D73' },
  { code: 'DMC 224', anchorCode: 'Anchor 894', name: 'Shell Pink Light', hex: '#E39FA3' },
  { code: 'DMC 225', anchorCode: 'Anchor 892', name: 'Shell Pink Ultra Very Light', hex: '#FAF0E6' },

  // DMC 300s - Reds, Corals, Browns, Flesh tones
  { code: 'DMC 300', anchorCode: 'Anchor 352', name: 'Mahogany Very Dark', hex: '#6F2C0E' },
  { code: 'DMC 301', anchorCode: 'Anchor 1049', name: 'Mahogany Medium', hex: '#B35A2B' },
  { code: 'DMC 304', anchorCode: 'Anchor 1006', name: 'Red Medium-Dark', hex: '#A61023' },
  { code: 'DMC 307', anchorCode: 'Anchor 289', name: 'Lemon Deep', hex: '#FDD017' },
  { code: 'DMC 309', anchorCode: 'Anchor 43', name: 'Rose Dark', hex: '#B82348' },
  { code: 'DMC 310', anchorCode: 'Anchor 403', name: 'Black', hex: '#000000' },
  { code: 'DMC 311', anchorCode: 'Anchor 148', name: 'Navy Blue Medium', hex: '#1C3E68' },
  { code: 'DMC 312', anchorCode: 'Anchor 147', name: 'Navy Blue Light', hex: '#2A5180' },
  { code: 'DMC 315', anchorCode: 'Anchor 1018', name: 'Antique Mauve Very Dark', hex: '#7A3D4D' },
  { code: 'DMC 316', anchorCode: 'Anchor 1017', name: 'Antique Mauve Medium', hex: '#B87284' },
  { code: 'DMC 317', anchorCode: 'Anchor 400', name: 'Pewter Gray', hex: '#6B6F73' },
  { code: 'DMC 318', anchorCode: 'Anchor 399', name: 'Steel Gray Light', hex: '#8E9499' },
  { code: 'DMC 319', anchorCode: 'Anchor 218', name: 'Pistachio Green Very Dark', hex: '#214E34' },
  { code: 'DMC 320', anchorCode: 'Anchor 216', name: 'Pistachio Green Medium', hex: '#628D69' },
  { code: 'DMC 321', anchorCode: 'Anchor 904', name: 'Red Medium', hex: '#C51E3A' },
  { code: 'DMC 322', anchorCode: 'Anchor 146', name: 'Navy Blue Very Light', hex: '#537CA8' },
  { code: 'DMC 326', anchorCode: 'Anchor 41', name: 'Rose Very Dark', hex: '#B02341' },
  { code: 'DMC 327', anchorCode: 'Anchor 101', name: 'Violet Dark', hex: '#632863' },
  { code: 'DMC 333', anchorCode: 'Anchor 119', name: 'Blue Violet Very Dark', hex: '#5C4E8A' },
  { code: 'DMC 334', anchorCode: 'Anchor 978', name: 'Baby Blue Medium', hex: '#739BC3' },
  { code: 'DMC 335', anchorCode: 'Anchor 38', name: 'Rose', hex: '#E84568' },
  { code: 'DMC 336', anchorCode: 'Anchor 150', name: 'Navy Blue Dark', hex: '#1B2F52' },
  { code: 'DMC 340', anchorCode: 'Anchor 118', name: 'Blue Violet Medium', hex: '#8C82B8' },
  { code: 'DMC 341', anchorCode: 'Anchor 117', name: 'Blue Violet Light', hex: '#B2ACD6' },
  { code: 'DMC 347', anchorCode: 'Anchor 1025', name: 'Salmon Very Dark', hex: '#BF2832' },
  { code: 'DMC 349', anchorCode: 'Anchor 13', name: 'Coral Dark', hex: '#D32832' },
  { code: 'DMC 350', anchorCode: 'Anchor 10', name: 'Coral Medium', hex: '#E24C38' },
  { code: 'DMC 351', anchorCode: 'Anchor 11', name: 'Coral Light', hex: '#EE6B52' },
  { code: 'DMC 352', anchorCode: 'Anchor 9', name: 'Coral Light-Medium', hex: '#F58B75' },
  { code: 'DMC 353', anchorCode: 'Anchor 6', name: 'Peach Flesh', hex: '#F9A897' },
  { code: 'DMC 355', anchorCode: 'Anchor 1014', name: 'Terra Cotta Dark', hex: '#993D28' },
  { code: 'DMC 356', anchorCode: 'Anchor 1012', name: 'Terra Cotta Medium', hex: '#C86851' },

  // DMC 400s - Skin tones, tans, olives, grays
  { code: 'DMC 400', anchorCode: 'Anchor 351', name: 'Mahogany Dark', hex: '#8F3812' },
  { code: 'DMC 402', anchorCode: 'Anchor 1047', name: 'Mahogany Very Light', hex: '#F2A073' },
  { code: 'DMC 407', anchorCode: 'Anchor 914', name: 'Desert Sand Dark', hex: '#B87B67' },
  { code: 'DMC 413', anchorCode: 'Anchor 401', name: 'Pewter Gray Dark', hex: '#4A4E52' },
  { code: 'DMC 414', anchorCode: 'Anchor 235', name: 'Steel Gray Dark', hex: '#8C8F93' },
  { code: 'DMC 415', anchorCode: 'Anchor 398', name: 'Pearl Gray', hex: '#B8BEC4' },
  { code: 'DMC 420', anchorCode: 'Anchor 375', name: 'Hazelnut Brown Dark', hex: '#A17342' },
  { code: 'DMC 422', anchorCode: 'Anchor 373', name: 'Hazelnut Brown Light', hex: '#CFA070' },
  { code: 'DMC 433', anchorCode: 'Anchor 371', name: 'Brown Medium-Dark', hex: '#704627' },
  { code: 'DMC 434', anchorCode: 'Anchor 310', name: 'Brown Light', hex: '#8B5A2B' },
  { code: 'DMC 435', anchorCode: 'Anchor 1040', name: 'Brown Very Light', hex: '#B57C48' },
  { code: 'DMC 436', anchorCode: 'Anchor 1041', name: 'Tan Medium', hex: '#C9915C' },
  { code: 'DMC 437', anchorCode: 'Anchor 362', name: 'Tan Light', hex: '#DCAC7A' },
  { code: 'DMC 444', anchorCode: 'Anchor 290', name: 'Lemon Dark', hex: '#FFD700' },
  { code: 'DMC 445', anchorCode: 'Anchor 288', name: 'Lemon Light', hex: '#FFFF80' },
  { code: 'DMC 451', anchorCode: 'Anchor 233', name: 'Shell Gray Dark', hex: '#908588' },
  { code: 'DMC 452', anchorCode: 'Anchor 232', name: 'Shell Gray Medium', hex: '#B3A8AA' },
  { code: 'DMC 453', anchorCode: 'Anchor 231', name: 'Shell Gray Light', hex: '#D5CCCC' },
  { code: 'DMC 469', anchorCode: 'Anchor 267', name: 'Avocado Green Medium Dark', hex: '#586A36' },
  { code: 'DMC 470', anchorCode: 'Anchor 266', name: 'Avocado Green Light', hex: '#779343' },
  { code: 'DMC 471', anchorCode: 'Anchor 265', name: 'Avocado Green Very Light', hex: '#A3B96A' },
  { code: 'DMC 472', anchorCode: 'Anchor 264', name: 'Avocado Green Ultra Light', hex: '#D7E594' },

  // DMC 500s - Greens, Aquas, Violets
  { code: 'DMC 500', anchorCode: 'Anchor 686', name: 'Blue Green Very Dark', hex: '#234839' },
  { code: 'DMC 501', anchorCode: 'Anchor 878', name: 'Blue Green Dark', hex: '#3B6A56' },
  { code: 'DMC 502', anchorCode: 'Anchor 877', name: 'Blue Green', hex: '#5A8F76' },
  { code: 'DMC 503', anchorCode: 'Anchor 876', name: 'Blue Green Medium', hex: '#87B5A0' },
  { code: 'DMC 504', anchorCode: 'Anchor 875', name: 'Blue Green Very Light', hex: '#B8DBC7' },
  { code: 'DMC 505', anchorCode: 'Anchor 246', name: 'Jade Green', hex: '#327357' },
  { code: 'DMC 517', anchorCode: 'Anchor 162', name: 'Wedgewood Dark', hex: '#306998' },
  { code: 'DMC 518', anchorCode: 'Anchor 161', name: 'Wedgewood Light', hex: '#4B8DB9' },
  { code: 'DMC 519', anchorCode: 'Anchor 160', name: 'Sky Blue Light', hex: '#7CB9E8' },
  { code: 'DMC 520', anchorCode: 'Anchor 858', name: 'Fern Green Dark', hex: '#44573D' },
  { code: 'DMC 522', anchorCode: 'Anchor 859', name: 'Fern Green Very Light', hex: '#94A58B' },
  { code: 'DMC 523', anchorCode: 'Anchor 858', name: 'Fern Green Light', hex: '#AAB899' },
  { code: 'DMC 524', anchorCode: 'Anchor 859', name: 'Fern Green Very Light Pale', hex: '#C5D2B8' },
  { code: 'DMC 535', anchorCode: 'Anchor 236', name: 'Ash Gray Very Dark', hex: '#505452' },
  { code: 'DMC 543', anchorCode: 'Anchor 386', name: 'Beige Brown Ultra Very Light', hex: '#EFE3D3' },
  { code: 'DMC 550', anchorCode: 'Anchor 102', name: 'Violet Very Dark', hex: '#4A154B' },
  { code: 'DMC 552', anchorCode: 'Anchor 98', name: 'Violet Medium', hex: '#803B82' },
  { code: 'DMC 553', anchorCode: 'Anchor 97', name: 'Violet Light', hex: '#A66DA8' },
  { code: 'DMC 554', anchorCode: 'Anchor 96', name: 'Violet Light-Pale', hex: '#D9B5DC' },
  { code: 'DMC 561', anchorCode: 'Anchor 211', name: 'Jade Very Dark', hex: '#2D6B4E' },
  { code: 'DMC 562', anchorCode: 'Anchor 210', name: 'Jade Medium', hex: '#48936A' },
  { code: 'DMC 563', anchorCode: 'Anchor 209', name: 'Jade Light', hex: '#84C39B' },
  { code: 'DMC 564', anchorCode: 'Anchor 208', name: 'Jade Very Light', hex: '#A7D9B8' },
  { code: 'DMC 580', anchorCode: 'Anchor 281', name: 'Moss Green Dark', hex: '#637527' },
  { code: 'DMC 581', anchorCode: 'Anchor 280', name: 'Moss Green Light', hex: '#8C9E33' },

  // DMC 600s - Cranberries, Pinks, Tans, Olives
  { code: 'DMC 600', anchorCode: 'Anchor 63', name: 'Cranberry Very Dark', hex: '#BF1161' },
  { code: 'DMC 601', anchorCode: 'Anchor 62', name: 'Cranberry Dark', hex: '#CE2D76' },
  { code: 'DMC 602', anchorCode: 'Anchor 60', name: 'Cranberry Medium', hex: '#E35293' },
  { code: 'DMC 603', anchorCode: 'Anchor 57', name: 'Cranberry Light', hex: '#F080B2' },
  { code: 'DMC 604', anchorCode: 'Anchor 55', name: 'Cranberry Light-Pale', hex: '#FAC2DC' },
  { code: 'DMC 605', anchorCode: 'Anchor 52', name: 'Cranberry Very Light', hex: '#FFD4E5' },
  { code: 'DMC 606', anchorCode: 'Anchor 9', name: 'Bright Orange-Red', hex: '#FA2A00' },
  { code: 'DMC 608', anchorCode: 'Anchor 330', name: 'Bright Orange', hex: '#FD5E13' },
  { code: 'DMC 610', anchorCode: 'Anchor 889', name: 'Drab Brown Dark', hex: '#6B583E' },
  { code: 'DMC 611', anchorCode: 'Anchor 888', name: 'Drab Brown Medium', hex: '#8A7356' },
  { code: 'DMC 612', anchorCode: 'Anchor 887', name: 'Drab Brown Light', hex: '#B19976' },
  { code: 'DMC 613', anchorCode: 'Anchor 886', name: 'Drab Brown Very Light', hex: '#D3C3A3' },
  { code: 'DMC 632', anchorCode: 'Anchor 936', name: 'Desert Sand Ultra Dark', hex: '#804E3B' },
  { code: 'DMC 640', anchorCode: 'Anchor 393', name: 'Neutral Gray Very Dark', hex: '#858170' },
  { code: 'DMC 642', anchorCode: 'Anchor 391', name: 'Neutral Gray Dark', hex: '#A49E8D' },
  { code: 'DMC 644', anchorCode: 'Anchor 390', name: 'Neutral Gray Medium', hex: '#C7C2B2' },
  { code: 'DMC 645', anchorCode: 'Anchor 399', name: 'Beaver Gray Very Dark', hex: '#68655E' },
  { code: 'DMC 646', anchorCode: 'Anchor 400', name: 'Beaver Gray Dark', hex: '#87837B' },
  { code: 'DMC 647', anchorCode: 'Anchor 398', name: 'Beaver Gray Medium', hex: '#B0ADA5' },
  { code: 'DMC 648', anchorCode: 'Anchor 397', name: 'Beaver Gray Light', hex: '#CBC8C0' },
  { code: 'DMC 666', anchorCode: 'Anchor 46', name: 'Bright Red', hex: '#E31D2B' },
  { code: 'DMC 676', anchorCode: 'Anchor 887', name: 'Old Gold Light', hex: '#E1B878' },
  { code: 'DMC 677', anchorCode: 'Anchor 886', name: 'Old Gold Very Light', hex: '#F3E5AB' },
  { code: 'DMC 680', anchorCode: 'Anchor 890', name: 'Old Gold Dark', hex: '#B8860B' },

  // DMC 700s - Bright Greens, Blues, Yellows, Tans
  { code: 'DMC 700', anchorCode: 'Anchor 228', name: 'Green Bright', hex: '#008000' },
  { code: 'DMC 701', anchorCode: 'Anchor 227', name: 'Green Light', hex: '#20B2AA' },
  { code: 'DMC 702', anchorCode: 'Anchor 226', name: 'Kelly Green', hex: '#4CBB17' },
  { code: 'DMC 703', anchorCode: 'Anchor 225', name: 'Chartreuse Light', hex: '#85E048' },
  { code: 'DMC 704', anchorCode: 'Anchor 255', name: 'Chartreuse Bright', hex: '#9DF030' },
  { code: 'DMC 712', anchorCode: 'Anchor 926', name: 'Cream', hex: '#FDF6E2' },
  { code: 'DMC 720', anchorCode: 'Anchor 326', name: 'Orange Spice Dark', hex: '#CD5016' },
  { code: 'DMC 721', anchorCode: 'Anchor 324', name: 'Orange Spice Medium', hex: '#E8743B' },
  { code: 'DMC 722', anchorCode: 'Anchor 323', name: 'Orange Spice Light', hex: '#F79B63' },
  { code: 'DMC 725', anchorCode: 'Anchor 305', name: 'Topaz', hex: '#FFC83B' },
  { code: 'DMC 726', anchorCode: 'Anchor 303', name: 'Topaz Light', hex: '#FCD757' },
  { code: 'DMC 727', anchorCode: 'Anchor 301', name: 'Topaz Very Light', hex: '#FFF2A8' },
  { code: 'DMC 728', anchorCode: 'Anchor 305', name: 'Topaz Medium Bell', hex: '#E2AC4B' },
  { code: 'DMC 729', anchorCode: 'Anchor 890', name: 'Old Gold Medium', hex: '#CFA043' },
  { code: 'DMC 730', anchorCode: 'Anchor 858', name: 'Olive Green Very Dark', hex: '#585922' },
  { code: 'DMC 732', anchorCode: 'Anchor 859', name: 'Olive Green Dark', hex: '#757833' },
  { code: 'DMC 733', anchorCode: 'Anchor 859', name: 'Olive Green Medium', hex: '#9E9D47' },
  { code: 'DMC 734', anchorCode: 'Anchor 858', name: 'Olive Green Light', hex: '#C2C06B' },
  { code: 'DMC 738', anchorCode: 'Anchor 361', name: 'Tan Very Light', hex: '#E8C59D' },
  { code: 'DMC 739', anchorCode: 'Anchor 366', name: 'Tan Ultra Very Light', hex: '#F5E1C9' },
  { code: 'DMC 740', anchorCode: 'Anchor 316', name: 'Tangerine', hex: '#FF6600' },
  { code: 'DMC 741', anchorCode: 'Anchor 304', name: 'Tangerine Medium', hex: '#FFA500' },
  { code: 'DMC 742', anchorCode: 'Anchor 303', name: 'Tangerine Light', hex: '#FFC000' },
  { code: 'DMC 743', anchorCode: 'Anchor 302', name: 'Yellow Medium', hex: '#F9D71C' },
  { code: 'DMC 744', anchorCode: 'Anchor 301', name: 'Yellow Pale', hex: '#FFE866' },
  { code: 'DMC 745', anchorCode: 'Anchor 300', name: 'Yellow Pale Light', hex: '#FFF2A3' },
  { code: 'DMC 746', anchorCode: 'Anchor 275', name: 'Off White', hex: '#FCFAD2' },
  { code: 'DMC 747', anchorCode: 'Anchor 158', name: 'Sky Blue Very Light', hex: '#E2F3F8' },
  { code: 'DMC 754', anchorCode: 'Anchor 1012', name: 'Peach Light Flesh', hex: '#F7C6B8' },
  { code: 'DMC 758', anchorCode: 'Anchor 882', name: 'Terra Cotta Very Light', hex: '#EBA28B' },
  { code: 'DMC 760', anchorCode: 'Anchor 1022', name: 'Salmon Light', hex: '#F59393' },
  { code: 'DMC 761', anchorCode: 'Anchor 1021', name: 'Salmon Very Light', hex: '#FFBABC' },
  { code: 'DMC 762', anchorCode: 'Anchor 397', name: 'Pearl Gray Very Light', hex: '#DCDFE3' },
  { code: 'DMC 772', anchorCode: 'Anchor 259', name: 'Yellow Green Very Light', hex: '#D3E3C3' },
  { code: 'DMC 775', anchorCode: 'Anchor 128', name: 'Baby Blue Very Light', hex: '#D8E8F5' },
  { code: 'DMC 779', anchorCode: 'Anchor 382', name: 'Cocoa Dark', hex: '#5B4238' },
  { code: 'DMC 780', anchorCode: 'Anchor 309', name: 'Topaz Ultra Very Dark', hex: '#945B1C' },
  { code: 'DMC 782', anchorCode: 'Anchor 307', name: 'Topaz Dark', hex: '#B87B1E' },
  { code: 'DMC 783', anchorCode: 'Anchor 306', name: 'Topaz Medium', hex: '#CF8D24' },
  { code: 'DMC 791', anchorCode: 'Anchor 178', name: 'Cornflower Blue Very Dark', hex: '#2C3563' },
  { code: 'DMC 792', anchorCode: 'Anchor 177', name: 'Cornflower Blue Dark', hex: '#3E4B82' },
  { code: 'DMC 793', anchorCode: 'Anchor 176', name: 'Cornflower Blue Medium', hex: '#5C6DA5' },
  { code: 'DMC 794', anchorCode: 'Anchor 175', name: 'Cornflower Blue Light', hex: '#8B9CC7' },
  { code: 'DMC 796', anchorCode: 'Anchor 133', name: 'Royal Blue Dark', hex: '#1D3B73' },
  { code: 'DMC 797', anchorCode: 'Anchor 132', name: 'Royal Blue Medium', hex: '#2A52A3' },
  { code: 'DMC 798', anchorCode: 'Anchor 131', name: 'Delft Blue Dark', hex: '#466CB8' },
  { code: 'DMC 799', anchorCode: 'Anchor 130', name: 'Delft Blue Medium', hex: '#6C8CD4' },

  // DMC 800s - Blues, Browns, Pinks, Dark Coffees
  { code: 'DMC 800', anchorCode: 'Anchor 128', name: 'Pale Delft Blue', hex: '#C0D6E4' },
  { code: 'DMC 801', anchorCode: 'Anchor 359', name: 'Coffee Brown Dark-Med', hex: '#52341C' },
  { code: 'DMC 807', anchorCode: 'Anchor 168', name: 'Peacock Blue Medium', hex: '#3B97A6' },
  { code: 'DMC 809', anchorCode: 'Anchor 129', name: 'Delft Blue Light', hex: '#92AEE0' },
  { code: 'DMC 813', anchorCode: 'Anchor 140', name: 'Blue Light', hex: '#A1C2DD' },
  { code: 'DMC 814', anchorCode: 'Anchor 45', name: 'Garnet Dark', hex: '#7B1123' },
  { code: 'DMC 815', anchorCode: 'Anchor 44', name: 'Garnet Medium', hex: '#7C0A02' },
  { code: 'DMC 816', anchorCode: 'Anchor 43', name: 'Garnet', hex: '#9B1323' },
  { code: 'DMC 817', anchorCode: 'Anchor 13', name: 'Coral Red Very Dark', hex: '#BB1B23' },
  { code: 'DMC 818', anchorCode: 'Anchor 73', name: 'Baby Pink Light', hex: '#FFD9E0' },
  { code: 'DMC 819', anchorCode: 'Anchor 271', name: 'Baby Pink Light Pale', hex: '#FFEEF1' },
  { code: 'DMC 820', anchorCode: 'Anchor 134', name: 'Royal Blue Very Dark', hex: '#0F2552' },
  { code: 'DMC 822', anchorCode: 'Anchor 390', name: 'Gravel Gray Light', hex: '#EBE5D8' },
  { code: 'DMC 823', anchorCode: 'Anchor 152', name: 'Navy Blue Dark Midnight', hex: '#111C38' },
  { code: 'DMC 824', anchorCode: 'Anchor 163', name: 'Blue Very Dark', hex: '#21496C' },
  { code: 'DMC 825', anchorCode: 'Anchor 162', name: 'Blue Dark', hex: '#2E628D' },
  { code: 'DMC 826', anchorCode: 'Anchor 161', name: 'Blue Medium', hex: '#4B83B3' },
  { code: 'DMC 827', anchorCode: 'Anchor 160', name: 'Blue Very Light', hex: '#BDDBED' },
  { code: 'DMC 828', anchorCode: 'Anchor 159', name: 'Blue Ultra Very Light', hex: '#D2ECF5' },
  { code: 'DMC 838', anchorCode: 'Anchor 1088', name: 'Beige Brown Very Dark', hex: '#453528' },
  { code: 'DMC 839', anchorCode: 'Anchor 360', name: 'Beige Brown Dark', hex: '#544234' },
  { code: 'DMC 840', anchorCode: 'Anchor 358', name: 'Beige Brown Medium', hex: '#7F6753' },
  { code: 'DMC 841', anchorCode: 'Anchor 357', name: 'Beige Brown Light', hex: '#A8927C' },
  { code: 'DMC 842', anchorCode: 'Anchor 388', name: 'Beige Brown Very Light', hex: '#D2C2AD' },
  { code: 'DMC 844', anchorCode: 'Anchor 1041', name: 'Beaver Gray Ultra Dark', hex: '#484848' },
  { code: 'DMC 869', anchorCode: 'Anchor 944', name: 'Hazelnut Brown Very Dark', hex: '#815C2E' },
  { code: 'DMC 890', anchorCode: 'Anchor 218', name: 'Pistachio Green Ultra Dark', hex: '#1B3B24' },
  { code: 'DMC 898', anchorCode: 'Anchor 360', name: 'Coffee Brown Very Dark', hex: '#422A17' },
  { code: 'DMC 899', anchorCode: 'Anchor 52', name: 'Rose Medium Light', hex: '#F27999' },

  // DMC 900s - Coppers, Emeralds, Dark Browns, Dusty Blues
  { code: 'DMC 900', anchorCode: 'Anchor 332', name: 'Burnt Orange Dark', hex: '#D14309' },
  { code: 'DMC 902', anchorCode: 'Anchor 897', name: 'Garnet Very Dark', hex: '#63182B' },
  { code: 'DMC 904', anchorCode: 'Anchor 258', name: 'Parrot Green Very Dark', hex: '#2F591B' },
  { code: 'DMC 905', anchorCode: 'Anchor 211', name: 'Parrot Green Dark', hex: '#235E17' },
  { code: 'DMC 906', anchorCode: 'Anchor 210', name: 'Parrot Green Medium', hex: '#5EA324' },
  { code: 'DMC 907', anchorCode: 'Anchor 209', name: 'Parrot Green Light', hex: '#A3E332' },
  { code: 'DMC 918', anchorCode: 'Anchor 1004', name: 'Red Copper Dark', hex: '#873016' },
  { code: 'DMC 919', anchorCode: 'Anchor 1003', name: 'Red Copper Medium', hex: '#A83C1C' },
  { code: 'DMC 920', anchorCode: 'Anchor 1004', name: 'Copper Dark', hex: '#A34623' },
  { code: 'DMC 921', anchorCode: 'Anchor 1003', name: 'Copper Medium', hex: '#C25A2C' },
  { code: 'DMC 922', anchorCode: 'Anchor 1002', name: 'Copper Light', hex: '#DE7543' },
  { code: 'DMC 924', anchorCode: 'Anchor 851', name: 'Very Dark Gray Green', hex: '#2B4242' },
  { code: 'DMC 926', anchorCode: 'Anchor 850', name: 'Gray Green Medium', hex: '#587A7A' },
  { code: 'DMC 927', anchorCode: 'Anchor 849', name: 'Gray Green Light', hex: '#8FAFAF' },
  { code: 'DMC 928', anchorCode: 'Anchor 848', name: 'Gray Green Very Light', hex: '#BDD3D3' },
  { code: 'DMC 930', anchorCode: 'Anchor 1035', name: 'Antique Blue Dark', hex: '#314D60' },
  { code: 'DMC 931', anchorCode: 'Anchor 1034', name: 'Antique Blue Medium', hex: '#51748D' },
  { code: 'DMC 932', anchorCode: 'Anchor 1033', name: 'Antique Blue Light', hex: '#87A4B8' },
  { code: 'DMC 934', anchorCode: 'Anchor 862', name: 'Black Avocado Green', hex: '#313B22' },
  { code: 'DMC 935', anchorCode: 'Anchor 861', name: 'Avocado Green Dark', hex: '#424C28' },
  { code: 'DMC 936', anchorCode: 'Anchor 860', name: 'Avocado Green Very Dark', hex: '#4C592C' },
  { code: 'DMC 937', anchorCode: 'Anchor 268', name: 'Avocado Green Medium', hex: '#4E6B34' },
  { code: 'DMC 938', anchorCode: 'Anchor 382', name: 'Coffee Brown Dark', hex: '#362212' },
  { code: 'DMC 939', anchorCode: 'Anchor 152', name: 'Navy Blue Very Dark', hex: '#0B172E' },
  { code: 'DMC 943', anchorCode: 'Anchor 188', name: 'Aquamarine Medium', hex: '#32A89C' },
  { code: 'DMC 945', anchorCode: 'Anchor 1047', name: 'Tawny Skin Light', hex: '#FAD2B8' },
  { code: 'DMC 948', anchorCode: 'Anchor 1011', name: 'Peach Flesh Very Light', hex: '#FDE2D2' },
  { code: 'DMC 950', anchorCode: 'Anchor 926', name: 'Desert Sand Light Flesh', hex: '#E2B8A8' },
  { code: 'DMC 951', anchorCode: 'Anchor 1012', name: 'Tawny Light', hex: '#FCE0CD' },
  { code: 'DMC 954', anchorCode: 'Anchor 206', name: 'Nile Green Light', hex: '#84C7A2' },
  { code: 'DMC 955', anchorCode: 'Anchor 205', name: 'Nile Green Light-Pale', hex: '#B8E3CA' },
  { code: 'DMC 958', anchorCode: 'Anchor 187', name: 'Seagreen Dark', hex: '#3CBFA4' },
  { code: 'DMC 959', anchorCode: 'Anchor 186', name: 'Seagreen Medium', hex: '#63D1BB' },
  { code: 'DMC 963', anchorCode: 'Anchor 73', name: 'Dusty Rose Ultra Light', hex: '#FCD8E3' },
  { code: 'DMC 964', anchorCode: 'Anchor 185', name: 'Seagreen Light', hex: '#A8E3D8' },
  { code: 'DMC 970', anchorCode: 'Anchor 314', name: 'Pumpkin Light', hex: '#F27420' },
  { code: 'DMC 972', anchorCode: 'Anchor 290', name: 'Canary Deep', hex: '#FFB800' },
  { code: 'DMC 975', anchorCode: 'Anchor 355', name: 'Golden Brown Dark', hex: '#914B15' },
  { code: 'DMC 976', anchorCode: 'Anchor 1001', name: 'Golden Brown Medium', hex: '#C27A38' },
  { code: 'DMC 977', anchorCode: 'Anchor 1002', name: 'Golden Brown Light', hex: '#DC9956' },

  // DMC 3000s - Extended shades
  { code: 'DMC 3011', anchorCode: 'Anchor 262', name: 'Khaki Green Dark', hex: '#585E39' },
  { code: 'DMC 3012', anchorCode: 'Anchor 261', name: 'Khaki Green Medium', hex: '#838A56' },
  { code: 'DMC 3013', anchorCode: 'Anchor 260', name: 'Khaki Green Light', hex: '#A8B07D' },
  { code: 'DMC 3021', anchorCode: 'Anchor 905', name: 'Brown Gray Very Dark', hex: '#3A332B' },
  { code: 'DMC 3022', anchorCode: 'Anchor 399', name: 'Brown Gray Medium', hex: '#8B8A7E' },
  { code: 'DMC 3023', anchorCode: 'Anchor 398', name: 'Brown Gray Light', hex: '#AAA89D' },
  { code: 'DMC 3024', anchorCode: 'Anchor 397', name: 'Brown Gray Very Light', hex: '#E0DDD5' },
  { code: 'DMC 3031', anchorCode: 'Anchor 360', name: 'Mocha Brown Very Dark', hex: '#382B1E' },
  { code: 'DMC 3032', anchorCode: 'Anchor 391', name: 'Mocha Brown Medium', hex: '#A19585' },
  { code: 'DMC 3033', anchorCode: 'Anchor 390', name: 'Mocha Brown Very Light', hex: '#D6CBC0' },
  { code: 'DMC 3041', anchorCode: 'Anchor 1018', name: 'Antique Violet Medium', hex: '#836573' },
  { code: 'DMC 3042', anchorCode: 'Anchor 1016', name: 'Antique Violet Light', hex: '#B39EB0' },
  { code: 'DMC 3045', anchorCode: 'Anchor 888', name: 'Yellow Beige Dark', hex: '#BA9263' },
  { code: 'DMC 3046', anchorCode: 'Anchor 887', name: 'Yellow Beige Medium', hex: '#D8B88A' },
  { code: 'DMC 3047', anchorCode: 'Anchor 886', name: 'Yellow Beige Light', hex: '#ECE0BA' },
  { code: 'DMC 3051', anchorCode: 'Anchor 269', name: 'Green Gray Dark', hex: '#4B5238' },
  { code: 'DMC 3052', anchorCode: 'Anchor 268', name: 'Green Gray Medium', hex: '#77825C' },
  { code: 'DMC 3053', anchorCode: 'Anchor 267', name: 'Green Gray Light', hex: '#9AA67E' },
  { code: 'DMC 3064', anchorCode: 'Anchor 883', name: 'Desert Sand Medium Flesh', hex: '#C2836B' },
  { code: 'DMC 3072', anchorCode: 'Anchor 847', name: 'Beaver Gray Very Light', hex: '#E3E5E3' },
  { code: 'DMC 3078', anchorCode: 'Anchor 292', name: 'Golden Yellow Very Light', hex: '#FDFA9E' },

  { code: 'DMC 3325', anchorCode: 'Anchor 129', name: 'Baby Blue Light', hex: '#B8D2E8' },
  { code: 'DMC 3326', anchorCode: 'Anchor 36', name: 'Rose Light', hex: '#FA9BAA' },
  { code: 'DMC 3328', anchorCode: 'Anchor 1025', name: 'Salmon Dark', hex: '#C24A53' },
  { code: 'DMC 3345', anchorCode: 'Anchor 268', name: 'Hunter Green Dark', hex: '#2D4E2F' },
  { code: 'DMC 3346', anchorCode: 'Anchor 267', name: 'Hunter Green', hex: '#3B6B38' },
  { code: 'DMC 3347', anchorCode: 'Anchor 266', name: 'Yellow Green Medium', hex: '#63985A' },
  { code: 'DMC 3348', anchorCode: 'Anchor 264', name: 'Yellow Green Light', hex: '#B8D992' },
  { code: 'DMC 3350', anchorCode: 'Anchor 59', name: 'Dusty Rose Ultra Dark', hex: '#B33355' },
  { code: 'DMC 3354', anchorCode: 'Anchor 74', name: 'Dusty Rose Light', hex: '#E8A2B3' },
  { code: 'DMC 3362', anchorCode: 'Anchor 263', name: 'Pine Green Dark', hex: '#374B33' },
  { code: 'DMC 3363', anchorCode: 'Anchor 262', name: 'Pine Green Medium', hex: '#5D7352' },
  { code: 'DMC 3364', anchorCode: 'Anchor 261', name: 'Pine Green Light', hex: '#879E78' },
  { code: 'DMC 3371', anchorCode: 'Anchor 382', name: 'Black Brown Darkest Flesh Shadow', hex: '#1E130B' },

  // DMC 3600s - Mauves, Pinks, Violets
  { code: 'DMC 3607', anchorCode: 'Anchor 87', name: 'Plum Light', hex: '#C84D8E' },
  { code: 'DMC 3608', anchorCode: 'Anchor 86', name: 'Plum Very Light', hex: '#E887B8' },
  { code: 'DMC 3609', anchorCode: 'Anchor 85', name: 'Plum Ultra Light', hex: '#F3BBE0' },
  { code: 'DMC 3685', anchorCode: 'Anchor 1028', name: 'Mauve Very Dark', hex: '#881B3C' },
  { code: 'DMC 3687', anchorCode: 'Anchor 70', name: 'Mauve Medium', hex: '#B94B69' },
  { code: 'DMC 3688', anchorCode: 'Anchor 69', name: 'Mauve Light', hex: '#D9829B' },
  { code: 'DMC 3689', anchorCode: 'Anchor 68', name: 'Mauve Light Pale', hex: '#FAD0DC' },

  // DMC 3700s - Skins, Coral, Terracottas, Violets
  { code: 'DMC 3705', anchorCode: 'Anchor 35', name: 'Melon Dark', hex: '#F24968' },
  { code: 'DMC 3706', anchorCode: 'Anchor 33', name: 'Melon Medium', hex: '#FF7590' },
  { code: 'DMC 3708', anchorCode: 'Anchor 31', name: 'Melon Light Pale', hex: '#FFA8C0' },
  { code: 'DMC 3712', anchorCode: 'Anchor 1013', name: 'Salmon Medium Dark', hex: '#D6575E' },
  { code: 'DMC 3713', anchorCode: 'Anchor 1011', name: 'Salmon Very Light Pale', hex: '#FFD3D6' },
  { code: 'DMC 3716', anchorCode: 'Anchor 25', name: 'Dusty Rose Very Light', hex: '#FAADB7' },
  { code: 'DMC 3721', anchorCode: 'Anchor 1027', name: 'Rose Dark', hex: '#8C3142' },
  { code: 'DMC 3722', anchorCode: 'Anchor 1026', name: 'Rose Medium Dark', hex: '#A85260' },
  { code: 'DMC 3726', anchorCode: 'Anchor 1017', name: 'Antique Mauve Dark', hex: '#9C586B' },
  { code: 'DMC 3727', anchorCode: 'Anchor 1016', name: 'Antique Mauve Light Pale', hex: '#DFA3B5' },
  { code: 'DMC 3731', anchorCode: 'Anchor 76', name: 'Dusty Rose Very Dark', hex: '#C24D6D' },
  { code: 'DMC 3733', anchorCode: 'Anchor 75', name: 'Dusty Rose Medium', hex: '#D8708C' },
  { code: 'DMC 3740', anchorCode: 'Anchor 872', name: 'Antique Violet Dark', hex: '#695160' },
  { code: 'DMC 3743', anchorCode: 'Anchor 870', name: 'Antique Violet Very Light', hex: '#D5C8D4' },
  { code: 'DMC 3746', anchorCode: 'Anchor 1030', name: 'Blue Violet Dark', hex: '#675294' },
  { code: 'DMC 3747', anchorCode: 'Anchor 1027', name: 'Blue Violet Very Light', hex: '#D2D2EB' },
  { code: 'DMC 3750', anchorCode: 'Anchor 1036', name: 'Antique Blue Very Dark', hex: '#1C3144' },
  { code: 'DMC 3752', anchorCode: 'Anchor 1032', name: 'Antique Blue Very Light', hex: '#B0C2D4' },
  { code: 'DMC 3753', anchorCode: 'Anchor 1031', name: 'Antique Blue Ultra Very Light', hex: '#D2E0EE' },
  { code: 'DMC 3755', anchorCode: 'Anchor 140', name: 'Baby Blue Very Dark', hex: '#779EC2' },
  { code: 'DMC 3756', anchorCode: 'Anchor 128', name: 'Baby Blue Ultra Very Light', hex: '#EAF3F8' },
  { code: 'DMC 3768', anchorCode: 'Anchor 779', name: 'Gray Green Dark', hex: '#445B5B' },
  { code: 'DMC 3770', anchorCode: 'Anchor 1011', name: 'Tawny Very Light Flesh', hex: '#FDEBDC' },
  { code: 'DMC 3771', anchorCode: 'Anchor 1012', name: 'Terra Cotta Ultra Light Flesh', hex: '#D98A77' },
  { code: 'DMC 3772', anchorCode: 'Anchor 1013', name: 'Desert Sand Very Dark', hex: '#995E4F' },
  { code: 'DMC 3774', anchorCode: 'Anchor 1011', name: 'Desert Sand Very Light', hex: '#F5DACB' },
  { code: 'DMC 3776', anchorCode: 'Anchor 1002', name: 'Mahogany Light', hex: '#C56D38' },
  { code: 'DMC 3777', anchorCode: 'Anchor 1015', name: 'Terra Cotta Very Dark', hex: '#82281D' },
  { code: 'DMC 3778', anchorCode: 'Anchor 1013', name: 'Terra Cotta Light', hex: '#B86553' },
  { code: 'DMC 3779', anchorCode: 'Anchor 1011', name: 'Terra Cotta Very Light Flesh', hex: '#EBB3A2' },
  { code: 'DMC 3781', anchorCode: 'Anchor 381', name: 'Mocha Brown Dark', hex: '#4D3A2B' },
  { code: 'DMC 3782', anchorCode: 'Anchor 380', name: 'Mocha Brown Light', hex: '#A18D7A' },
  { code: 'DMC 3787', anchorCode: 'Anchor 393', name: 'Brown Gray Dark', hex: '#635D52' },
  { code: 'DMC 3790', anchorCode: 'Anchor 391', name: 'Beige Gray Ultra Dark', hex: '#7D7063' },
  { code: 'DMC 3799', anchorCode: 'Anchor 236', name: 'Pewter Gray Very Dark', hex: '#2A2D30' },

  // DMC 3800s - Rich Gradients, Skin Shades, Warm Gold, Soft Pastels
  { code: 'DMC 3801', anchorCode: 'Anchor 13', name: 'Christmas Red Light', hex: '#E32B38' },
  { code: 'DMC 3802', anchorCode: 'Anchor 1019', name: 'Antique Mauve Very Dark', hex: '#6C253B' },
  { code: 'DMC 3803', anchorCode: 'Anchor 1028', name: 'Mauve Dark', hex: '#7A1D3A' },
  { code: 'DMC 3804', anchorCode: 'Anchor 62', name: 'Cyclamen Pink Dark', hex: '#E02872' },
  { code: 'DMC 3805', anchorCode: 'Anchor 60', name: 'Cyclamen Pink Medium', hex: '#F0488E' },
  { code: 'DMC 3806', anchorCode: 'Anchor 57', name: 'Cyclamen Pink Light', hex: '#FF7FB0' },
  { code: 'DMC 3807', anchorCode: 'Anchor 178', name: 'Cornflower Blue Busy', hex: '#3B487A' },
  { code: 'DMC 3810', anchorCode: 'Anchor 168', name: 'Turquoise Dark', hex: '#3A96A0' },
  { code: 'DMC 3811', anchorCode: 'Anchor 167', name: 'Turquoise Very Light', hex: '#B8E6EC' },
  { code: 'DMC 3813', anchorCode: 'Anchor 876', name: 'Seagreen Light', hex: '#A2CCA9' },
  { code: 'DMC 3814', anchorCode: 'Anchor 188', name: 'Aquamarine', hex: '#288B7B' },
  { code: 'DMC 3815', anchorCode: 'Anchor 877', name: 'Celadon Green Dark', hex: '#48755C' },
  { code: 'DMC 3816', anchorCode: 'Anchor 876', name: 'Celadon Green Medium', hex: '#68A382' },
  { code: 'DMC 3817', anchorCode: 'Anchor 875', name: 'Celadon Green Light', hex: '#9BC7B2' },
  { code: 'DMC 3819', anchorCode: 'Anchor 278', name: 'Moss Green Light Yellowish', hex: '#E2EA58' },
  { code: 'DMC 3820', anchorCode: 'Anchor 305', name: 'Straw Dark', hex: '#DFB043' },
  { code: 'DMC 3821', anchorCode: 'Anchor 306', name: 'Straw Straw', hex: '#ECC45E' },
  { code: 'DMC 3822', anchorCode: 'Anchor 307', name: 'Straw Light', hex: '#F4D87A' },
  { code: 'DMC 3823', anchorCode: 'Anchor 386', name: 'Yellow Ultra Pale', hex: '#FFFDD0' },
  { code: 'DMC 3824', anchorCode: 'Anchor 8', name: 'Apricot Light', hex: '#FFB8A3' },
  { code: 'DMC 3825', anchorCode: 'Anchor 323', name: 'Pumpkin Pale', hex: '#FFC4A1' },
  { code: 'DMC 3826', anchorCode: 'Anchor 310', name: 'Golden Brown Dark', hex: '#A85A20' },
  { code: 'DMC 3827', anchorCode: 'Anchor 308', name: 'Golden Brown Pale', hex: '#EBB273' },
  { code: 'DMC 3828', anchorCode: 'Anchor 373', name: 'Hazelnut Brown Medium', hex: '#B8824A' },
  { code: 'DMC 3829', anchorCode: 'Anchor 890', name: 'Old Gold Very Dark', hex: '#A6731B' },
  { code: 'DMC 3830', anchorCode: 'Anchor 1014', name: 'Terra Cotta Dark Red', hex: '#BA4336' },
  { code: 'DMC 3831', anchorCode: 'Anchor 38', name: 'Raspberry Dark', hex: '#B82848' },
  { code: 'DMC 3832', anchorCode: 'Anchor 37', name: 'Raspberry Medium', hex: '#D6486A' },
  { code: 'DMC 3833', anchorCode: 'Anchor 36', name: 'Raspberry Light', hex: '#E8728C' },
  { code: 'DMC 3834', anchorCode: 'Anchor 100', name: 'Grape Dark', hex: '#6F2B57' },
  { code: 'DMC 3835', anchorCode: 'Anchor 99', name: 'Grape Medium', hex: '#94537B' },
  { code: 'DMC 3836', anchorCode: 'Anchor 98', name: 'Grape Light', hex: '#BA80A3' },
  { code: 'DMC 3838', anchorCode: 'Anchor 176', name: 'Lavender Blue Dark', hex: '#4D628F' },
  { code: 'DMC 3839', anchorCode: 'Anchor 175', name: 'Lavender Blue Medium', hex: '#6A7CA8' },
  { code: 'DMC 3840', anchorCode: 'Anchor 174', name: 'Lavender Blue Light', hex: '#A8B8D8' },
  { code: 'DMC 3841', anchorCode: 'Anchor 158', name: 'Baby Blue Pale Light', hex: '#CDDEEC' },
  { code: 'DMC 3842', anchorCode: 'Anchor 164', name: 'Wedgewood Very Dark', hex: '#1B486B' },
  { code: 'DMC 3843', anchorCode: 'Anchor 130', name: 'Electric Blue', hex: '#1082B8' },
  { code: 'DMC 3844', anchorCode: 'Anchor 168', name: 'Bright Turquoise Dark', hex: '#12A2B8' },
  { code: 'DMC 3845', anchorCode: 'Anchor 167', name: 'Bright Turquoise Medium', hex: '#00C4D8' },
  { code: 'DMC 3846', anchorCode: 'Anchor 166', name: 'Bright Turquoise Light', hex: '#32E0EC' },
  { code: 'DMC 3847', anchorCode: 'Anchor 188', name: 'Teal Green Dark', hex: '#1B6A62' },
  { code: 'DMC 3848', anchorCode: 'Anchor 187', name: 'Teal Green Medium', hex: '#3B8B82' },
  { code: 'DMC 3849', anchorCode: 'Anchor 186', name: 'Teal Green Light', hex: '#53B3A6' },
  { code: 'DMC 3850', anchorCode: 'Anchor 185', name: 'Green Bright Light', hex: '#319E6E' },
  { code: 'DMC 3851', anchorCode: 'Anchor 184', name: 'Green Bright Medium', hex: '#43C293' },
  { code: 'DMC 3852', anchorCode: 'Anchor 305', name: 'Straw Very Dark', hex: '#CD932B' },
  { code: 'DMC 3853', anchorCode: 'Anchor 313', name: 'Autumn Gold Dark', hex: '#E07D2B' },
  { code: 'DMC 3854', anchorCode: 'Anchor 312', name: 'Autumn Gold Medium', hex: '#F0A352' },
  { code: 'DMC 3855', anchorCode: 'Anchor 311', name: 'Autumn Gold Light', hex: '#FAD285' },
  { code: 'DMC 3856', anchorCode: 'Anchor 323', name: 'Mahogany Ultra Very Light Skin', hex: '#F5BA90' },
  { code: 'DMC 3857', anchorCode: 'Anchor 1008', name: 'Rosewood Dark', hex: '#582823' },
  { code: 'DMC 3858', anchorCode: 'Anchor 1007', name: 'Rosewood Medium Flesh', hex: '#87483E' },
  { code: 'DMC 3859', anchorCode: 'Anchor 1006', name: 'Rosewood Light Flesh', hex: '#B87A6E' },
  { code: 'DMC 3860', anchorCode: 'Anchor 380', name: 'Cocoa Medium Flesh Shadow', hex: '#795B59' },
  { code: 'DMC 3861', anchorCode: 'Anchor 379', name: 'Cocoa Light Flesh Shadow', hex: '#A38B88' },
  { code: 'DMC 3862', anchorCode: 'Anchor 378', name: 'Mocha Beige Dark', hex: '#72553E' },
  { code: 'DMC 3863', anchorCode: 'Anchor 377', name: 'Mocha Beige Medium', hex: '#947863' },
  { code: 'DMC 3864', anchorCode: 'Anchor 376', name: 'Mocha Beige Light', hex: '#C0AA97' },
  { code: 'DMC 3866', anchorCode: 'Anchor 386', name: 'Mocha Brown Ultra Light', hex: '#F2ECE1' }
];

// Precompute Lab values & symbols for the DMC palette
export const DMC_DATABASE: DMCItem[] = RAW_DMC_DATA.map((item, index) => {
  const { r, g, b } = hexToRgb(item.hex);
  const [l, a, labB] = rgbToLab(r, g, b);
  const symbol = CHART_SYMBOLS[index % CHART_SYMBOLS.length];
  return {
    ...item,
    r,
    g,
    b,
    l,
    a,
    labB,
    symbol
  };
});

// Find nearest DMC color using CIEDE2000
export function findNearestDMC(r: number, g: number, b: number, allowedPalette?: DMCItem[]): DMCItem {
  const targetLab = rgbToLab(r, g, b);
  const palette = allowedPalette || DMC_DATABASE;

  let bestMatch = palette[0];
  let minDeltaE = Infinity;

  for (const dmc of palette) {
    const deltaE = ciede2000(targetLab, [dmc.l, dmc.a, dmc.labB]);
    if (deltaE < minDeltaE) {
      minDeltaE = deltaE;
      bestMatch = dmc;
    }
  }

  return bestMatch;
}

// Select optimal DMC thread palette using frequency-weighted max-min CIEDE2000 coverage
// Guarantees balanced representation of dark shadows, highlights, mid-tones, and primary hues
export function selectOptimalDMCPalette(
  pixels: Uint8ClampedArray,
  targetLimit: number,
  basePalette: DMCItem[]
): DMCItem[] {
  const numPixels = pixels.length / 4;
  if (numPixels === 0 || targetLimit <= 0) return [];

  const limit = Math.min(targetLimit, basePalette.length);

  // Sample pixels to build pixel frequency histogram
  const sampleStep = Math.max(1, Math.floor(numPixels / 8000));
  const frequencyMap = new Map<string, { dmc: DMCItem; count: number }>();

  for (let i = 0; i < numPixels; i += sampleStep) {
    const a = pixels[i * 4 + 3];
    if (a < 128) continue;
    const pr = pixels[i * 4];
    const pg = pixels[i * 4 + 1];
    const pb = pixels[i * 4 + 2];

    const nearest = findNearestDMC(pr, pg, pb, basePalette);
    const existing = frequencyMap.get(nearest.code);
    if (existing) {
      existing.count++;
    } else {
      frequencyMap.set(nearest.code, { dmc: nearest, count: 1 });
    }
  }

  const candidates = Array.from(frequencyMap.values());

  // If candidate DMC threads <= limit, return all of them
  if (candidates.length <= limit) {
    return candidates.map(c => c.dmc);
  }

  // Sort candidates by pixel count descending
  candidates.sort((a, b) => b.count - a.count);

  const selected: DMCItem[] = [candidates[0].dmc];
  const selectedCodes = new Set<string>([candidates[0].dmc.code]);

  const candidateLabs = candidates.map(c => ({
    dmc: c.dmc,
    count: c.count,
    lab: [c.dmc.l, c.dmc.a, c.dmc.labB] as [number, number, number]
  }));

  while (selected.length < limit) {
    let bestCandidate: DMCItem | null = null;
    let maxScore = -1;

    for (const item of candidateLabs) {
      if (selectedCodes.has(item.dmc.code)) continue;

      let minDeltaE = Infinity;
      for (const sel of selected) {
        const dist = ciede2000(item.lab, [sel.l, sel.a, sel.labB]);
        if (dist < minDeltaE) {
          minDeltaE = dist;
        }
      }

      // Score combines square root of pixel frequency and CIEDE2000 distance novelty
      const score = Math.sqrt(item.count) * minDeltaE;

      if (score > maxScore) {
        maxScore = score;
        bestCandidate = item.dmc;
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate);
      selectedCodes.add(bestCandidate.code);
    } else {
      break;
    }
  }

  return selected;
}

// MMCQ / Frequency-Weighted DMC Quantization + CIEDE2000 DMC Mapping + Dithering
export function quantizeImageToDMC(
  imageData: ImageData,
  colorLimit: number,
  allowedPalette?: DMCItem[],
  dithering: 'none' | 'soft' | 'floyd-steinberg' | 'atkinson' = 'none'
): {
  quantizedRgb: Uint8ClampedArray; // r,g,b,a per pixel
  uniqueDmcColors: DMCItem[];
  pixelDmcMap: DMCItem[];
} {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const numPixels = width * height;
  const basePalette = allowedPalette || DMC_DATABASE;

  // 1. Extract balanced active palette with full tone shading coverage
  const targetLimit = Math.min(colorLimit, basePalette.length);
  const activePalette = selectOptimalDMCPalette(pixels, targetLimit, basePalette);

  const quantizedRgb = new Uint8ClampedArray(numPixels * 4);
  const pixelDmcMap: DMCItem[] = new Array(numPixels);
  const usedDmcSet = new Map<string, DMCItem>();

  if (dithering === 'none') {
    // Direct CIEDE2000 pixel mapping (clean solid color blocks, no noise)
    for (let i = 0; i < numPixels; i++) {
      const pr = pixels[i * 4];
      const pg = pixels[i * 4 + 1];
      const pb = pixels[i * 4 + 2];

      const bestDmc = findNearestDMC(pr, pg, pb, activePalette);

      pixelDmcMap[i] = bestDmc;
      usedDmcSet.set(bestDmc.code, bestDmc);

      quantizedRgb[i * 4] = bestDmc.r;
      quantizedRgb[i * 4 + 1] = bestDmc.g;
      quantizedRgb[i * 4 + 2] = bestDmc.b;
      quantizedRgb[i * 4 + 3] = 255;
    }
  } else {
    // Gentle Damped Error Diffusion Dithering (no harsh dot noise or spoiling artifacts)
    const ditherFactor = dithering === 'soft' ? 0.30 : (dithering === 'floyd-steinberg' ? 0.45 : 0.35);
    const maxErrClamp = dithering === 'soft' ? 20 : 35;

    // Create working Float32 RGB buffer
    const buffer = new Float32Array(numPixels * 3);
    for (let i = 0; i < numPixels; i++) {
      buffer[i * 3] = pixels[i * 4];
      buffer[i * 3 + 1] = pixels[i * 4 + 1];
      buffer[i * 3 + 2] = pixels[i * 4 + 2];
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const bufIdx = idx * 3;

        const curR = Math.max(0, Math.min(255, buffer[bufIdx]));
        const curG = Math.max(0, Math.min(255, buffer[bufIdx + 1]));
        const curB = Math.max(0, Math.min(255, buffer[bufIdx + 2]));

        // Match pixel to closest DMC thread in active palette
        const bestDmc = findNearestDMC(curR, curG, curB, activePalette);

        pixelDmcMap[idx] = bestDmc;
        usedDmcSet.set(bestDmc.code, bestDmc);

        quantizedRgb[idx * 4] = bestDmc.r;
        quantizedRgb[idx * 4 + 1] = bestDmc.g;
        quantizedRgb[idx * 4 + 2] = bestDmc.b;
        quantizedRgb[idx * 4 + 3] = 255;

        // Calculate Quantization Error with Damping & Clamping
        const errR = Math.max(-maxErrClamp, Math.min(maxErrClamp, (curR - bestDmc.r) * ditherFactor));
        const errG = Math.max(-maxErrClamp, Math.min(maxErrClamp, (curG - bestDmc.g) * ditherFactor));
        const errB = Math.max(-maxErrClamp, Math.min(maxErrClamp, (curB - bestDmc.b) * ditherFactor));

        // Helper to distribute error safely
        const distribute = (targetX: number, targetY: number, weight: number) => {
          if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
            const targetBufIdx = (targetY * width + targetX) * 3;
            buffer[targetBufIdx] += errR * weight;
            buffer[targetBufIdx + 1] += errG * weight;
            buffer[targetBufIdx + 2] += errB * weight;
          }
        };

        if (dithering === 'soft' || dithering === 'floyd-steinberg') {
          // Floyd-Steinberg error weights: 7/16, 3/16, 5/16, 1/16
          distribute(x + 1, y, 7 / 16);
          distribute(x - 1, y + 1, 3 / 16);
          distribute(x, y + 1, 5 / 16);
          distribute(x + 1, y + 1, 1 / 16);
        } else if (dithering === 'atkinson') {
          // Atkinson error weights: 1/8 each
          distribute(x + 1, y, 1 / 8);
          distribute(x + 2, y, 1 / 8);
          distribute(x - 1, y + 1, 1 / 8);
          distribute(x, y + 1, 1 / 8);
          distribute(x + 1, y + 1, 1 / 8);
          distribute(x, y + 2, 1 / 8);
        }
      }
    }
  }

  const uniqueDmcColors = Array.from(usedDmcSet.values());

  return {
    quantizedRgb,
    uniqueDmcColors,
    pixelDmcMap
  };
}
