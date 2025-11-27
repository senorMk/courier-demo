import * as fs from 'fs';
import * as path from 'path';

export type LogoAsset =
  | { type: 'svg'; path: string; svg: string }
  | { type: 'image'; path: string };

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']);

let cachedAsset: LogoAsset | null | undefined;
let cachedSvgModule: any | null | undefined;

function resolveCandidates(): string[] {
  const list: Array<string | null> = [];
  if (process.env.PCS_LOGO_PATH) {
    list.push(
      path.isAbsolute(process.env.PCS_LOGO_PATH)
        ? process.env.PCS_LOGO_PATH
        : path.resolve(process.cwd(), process.env.PCS_LOGO_PATH),
    );
  }

  list.push(
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'images', 'logo', 'Platinum Logo.jpg'),
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'images', 'logo', 'logo.svg'),
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'images', 'logo', 'logo.png'),
    path.resolve(process.cwd(), 'assets', 'logo.svg'),
    path.resolve(process.cwd(), 'assets', 'logo.png'),
  );

  return list.filter((candidate): candidate is string => Boolean(candidate));
}

function loadAsset(candidate: string): LogoAsset | null {
  if (!fs.existsSync(candidate)) {
    return null;
  }
  const ext = path.extname(candidate).toLowerCase();
  if (ext === '.svg') {
    try {
      const svg = fs.readFileSync(candidate, 'utf-8');
      return { type: 'svg', path: candidate, svg };
    } catch (error) {
      return null;
    }
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return { type: 'image', path: candidate };
  }
  return null;
}

export function getLogoAsset(): LogoAsset | null {
  if (cachedAsset !== undefined) {
    return cachedAsset;
  }
  for (const candidate of resolveCandidates()) {
    const asset = loadAsset(candidate);
    if (asset) {
      cachedAsset = asset;
      return cachedAsset;
    }
  }
  cachedAsset = null;
  console.warn('Company logo not found. Receipts and delivery notes will render without a logo.');
  return cachedAsset;
}

export function getSvgToPdfModule(): any | null {
  if (cachedSvgModule !== undefined) {
    return cachedSvgModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedSvgModule = require('svg-to-pdfkit');
  } catch (error) {
    console.warn('svg-to-pdfkit not installed. SVG logos will be skipped.');
    cachedSvgModule = null;
  }
  return cachedSvgModule;
}

export function resetLogoCache(): void {
  cachedAsset = undefined;
}
