// 3-stop gradient interpolation: Gold -> Silver -> Bronze
// Gold:   #FAC31E (RGB 250, 195, 30)  - bright champion gold
// Silver: #D7E1EB (RGB 215, 225, 235) - crisp reflective silver
// Bronze: #CD7F32 (RGB 205, 127, 50)  - warm radiant bronze

export interface PodiumColorInfo {
  hex: string;
  lightHex: string;
  darkHex: string;
  rgb: string;
  textContrast: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

const STOP_GOLD: RGB = { r: 250, g: 195, b: 30 };
const STOP_SILVER: RGB = { r: 215, g: 225, b: 235 };
const STOP_BRONZE: RGB = { r: 205, g: 127, b: 50 };

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getPodiumColor(place: number, totalPlaces: number): PodiumColorInfo {
  const n = Math.max(1, totalPlaces);
  const p = Math.max(1, Math.min(place, n));

  let c: RGB;

  if (n <= 1) {
    c = STOP_GOLD;
  } else {
    // Normalized parameter t from 0 (1st place) to 1 (last place)
    const t = (p - 1) / (n - 1);

    if (t <= 0.5) {
      // Interpolate between Gold (t=0) and Silver (t=0.5)
      const u = t / 0.5;
      c = {
        r: lerp(STOP_GOLD.r, STOP_SILVER.r, u),
        g: lerp(STOP_GOLD.g, STOP_SILVER.g, u),
        b: lerp(STOP_GOLD.b, STOP_SILVER.b, u)
      };
    } else {
      // Interpolate between Silver (t=0.5) and Bronze (t=1.0)
      const u = (t - 0.5) / 0.5;
      c = {
        r: lerp(STOP_SILVER.r, STOP_BRONZE.r, u),
        g: lerp(STOP_SILVER.g, STOP_BRONZE.g, u),
        b: lerp(STOP_SILVER.b, STOP_BRONZE.b, u)
      };
    }
  }

  // Create light highlight and dark shadow variants for metallic depth
  const light = {
    r: Math.min(255, c.r + 35),
    g: Math.min(255, c.g + 35),
    b: Math.min(255, c.b + 35),
  };

  const dark = {
    r: Math.max(0, Math.round(c.r * 0.65)),
    g: Math.max(0, Math.round(c.g * 0.65)),
    b: Math.max(0, Math.round(c.b * 0.65)),
  };

  // Determine text contrast based on perceived luminance
  const luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  const textContrast = luminance > 0.72 ? '#0f172a' : '#ffffff';

  return {
    hex: rgbToHex(c.r, c.g, c.b),
    lightHex: rgbToHex(light.r, light.g, light.b),
    darkHex: rgbToHex(dark.r, dark.g, dark.b),
    rgb: `${c.r}, ${c.g}, ${c.b}`,
    textContrast
  };
}
