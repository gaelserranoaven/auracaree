import { limpiar } from './util.js';

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const ALIAS = {
  nombres: ['nombres', 'nombre', 'nombres_completos'], apellidos: ['apellidos', 'apellido'],
  doc: ['documento', 'cedula', 'doc', 'identificacion', 'numero_documento'], edad: ['edad'], dx: ['diagnostico', 'diagnosticos', 'dx'],
};

export function parseCSV(texto) {
  const primera = texto.split(/\r?\n/, 1)[0] || '';
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  const filas = []; let fila = []; let celda = ''; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda); celda = '';
      if (fila.some((x) => x !== '')) filas.push(fila);
      fila = [];
    } else celda += c;
  }
  fila.push(celda);
  if (fila.some((x) => x !== '')) filas.push(fila);
  return filas;
}

export function matrizAResidentes(matriz) {
  const validas = []; const errores = [];
  if (!matriz.length) return { validas, errores: ['El archivo está vacío.'] };
  const enc = matriz[0].map(normalizar);
  const idx = {};
  Object.entries(ALIAS).forEach(([k, alias]) => { idx[k] = enc.findIndex((h) => alias.includes(h)); });
  if (idx.nombres < 0 || idx.apellidos < 0) return { validas, errores: ['Faltan las columnas "nombres" y "apellidos" en la primera fila.'] };
  if (matriz.length > 501) return { validas, errores: ['Máximo 500 filas por archivo.'] };
  const vistos = new Set();
  matriz.slice(1).forEach((f, i) => {
    const celda = (k) => (idx[k] >= 0 ? f[idx[k]] : '');
    const nombres = limpiar(celda('nombres'), 80); const apellidos = limpiar(celda('apellidos'), 80);
    if (!nombres || !apellidos) { errores.push(`Fila ${i + 2}: faltan nombres o apellidos`); return; }
    const doc = limpiar(celda('doc'), 30) || 'CC s/n';
    if (doc !== 'CC s/n') { if (vistos.has(doc)) { errores.push(`Fila ${i + 2}: documento repetido en el archivo (${doc})`); return; } vistos.add(doc); }
    const edadN = Number(celda('edad'));
    validas.push({ nombres, apellidos, doc, edad: Number.isFinite(edadN) && edadN > 0 && edadN < 125 ? Math.round(edadN) : null, dx: limpiar(celda('dx'), 300) || 'Sin registrar' });
  });
  return { validas, errores };
}

