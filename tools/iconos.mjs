// Genera los íconos (landing, app y futura PWA) y la imagen para compartir (og:image).
// Uso: `npm run iconos`. Los PNG resultantes se versionan; este script solo se corre al cambiar la marca.
// Requiere sharp (devDependency) y, para og-image, Chrome o Edge instalados (variable CHROME para otra ruta).
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ACENTO = '#1F4BE8';
const ECG = '5,18 11,18 13.5,11 17,24 20.5,14 22.5,18 29,18';

// Logo de marca (DESIGN.md): cuadrado redondeado azul con la línea de ECG en blanco.
const logo = (trazo = 2.4) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34">`
  + `<rect x="1" y="1" width="32" height="32" rx="9" fill="${ACENTO}"/>`
  + `<polyline points="${ECG}" fill="none" stroke="#fff" stroke-width="${trazo}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Sangre completa (apple-touch y maskable): el sistema recorta la forma, así que el fondo llena el cuadro.
// `escala` deja la línea dentro de la zona segura (80 % central en maskable).
const lleno = (escala) => {
  const t = (1 - escala) * 17;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34"><rect width="34" height="34" fill="${ACENTO}"/>`
    + `<g transform="translate(${t} ${t}) scale(${escala})"><polyline points="${ECG}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
};

const png = (svg, lado, salida) => sharp(Buffer.from(svg), { density: 600 })
  .resize(lado, lado).png({ compressionLevel: 9, palette: true }).toFile(salida);

async function iconos() {
  const dir = join(RAIZ, 'icons');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'favicon.svg'), logo() + '\n');
  await png(logo(2.8), 32, join(dir, 'favicon-32.png'));
  await png(lleno(0.9), 180, join(dir, 'apple-touch-icon.png'));
  await png(logo(), 192, join(dir, 'icon-192.png'));
  await png(logo(), 512, join(dir, 'icon-512.png'));
  await png(lleno(0.72), 512, join(dir, 'icon-maskable-512.png'));
  console.log('Íconos en icons/: favicon.svg, favicon-32, apple-touch-icon (180), icon-192, icon-512, icon-maskable-512');
}

function buscarChrome() {
  const candidatos = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter(Boolean);
  return candidatos.find((c) => existsSync(c));
}

async function imagenCompartir() {
  const chrome = buscarChrome();
  if (!chrome) { console.warn('Sin Chrome/Edge: se omite og-image (define CHROME con la ruta).'); return; }
  const tmp = mkdtempSync(join(tmpdir(), 'auracare-og-'));
  const captura = join(tmp, 'og.png');
  try {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--window-size=1200,630', '--virtual-time-budget=5000', `--user-data-dir=${join(tmp, 'perfil')}`,
      `--screenshot=${captura}`, pathToFileURL(join(RAIZ, 'tools/og/og-imagen.html')).href,
    ], { stdio: 'ignore' });
    mkdirSync(join(RAIZ, 'og'), { recursive: true });
    const salida = join(RAIZ, 'og/og-image.png');
    await sharp(captura).resize(1200, 630).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(salida);
    const { size } = statSync(salida);
    console.log(`og/og-image.png 1200×630, ${(size / 1024).toFixed(1)} KB`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

await iconos();
await imagenCompartir();
