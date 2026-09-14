// @ts-check
/**
 * Utilidades compartidas para los reportes HTML del modulo 6.
 *
 * Los reportes son autocontenidos (un solo archivo, sin dependencias) para que
 * se puedan adjuntar a la Wiki o abrir sin conexion.
 *
 * Y son ACCESIBLES, porque este es un taller de accesibilidad y seria
 * incoherente entregar resultados que no cumplen lo que se ensena: idioma
 * declarado, region <main>, tablas con <caption> y encabezados con scope, y
 * ningun dato comunicado solo por color (cada marca de color lleva texto).
 * El propio flujo de verificacion del modulo los audita con axe.
 */
const fs = require('fs');
const path = require('path');

const CARPETA_REPORTES = path.join(__dirname, '..', 'reportes');

/**
 * Resuelve una ruta que escribio la persona. npm run ejecuta siempre desde
 * playwright/, pero npm guarda en INIT_CWD la carpeta desde donde se lanzo el
 * comando: asi "npm run ia:sugerir -- auditoria.json" encuentra el archivo
 * aunque se ejecute desde otra carpeta.
 */
function rutaUsuario(ruta) {
  return path.resolve(process.env.INIT_CWD || process.cwd(), ruta);
}

/** Escapa texto para insertarlo en HTML. Todo lo que viene de una IA pasa por aqui. */
function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normaliza para comparar: minusculas y sin tildes. */
function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** "1 hallazgo" / "3 hallazgos". */
function plural(n, singular, plur) {
  return `${n} ${n === 1 ? singular : plur}`;
}

/** Porcentaje legible; "—" si no hay denominador. */
function pct(parte, total) {
  if (!total) return '—';
  return `${Math.round((parte / total) * 100)}%`;
}

/** Barra horizontal con el valor escrito: el color nunca es la unica senal. */
function barra(parte, total, etiqueta) {
  const ancho = total ? Math.round((parte / total) * 100) : 0;
  return `<div class="barra" role="img" aria-label="${esc(etiqueta)}: ${parte} de ${total}">
    <span class="barra-relleno" style="width:${ancho}%"></span>
    <span class="barra-texto">${parte} de ${total} · ${pct(parte, total)}</span>
  </div>`;
}

/** Marca de estado con texto. tipo: 'si' | 'no' | 'aviso' | 'neutro'. */
function marca(tipo, texto) {
  return `<span class="marca marca-${tipo}">${esc(texto)}</span>`;
}

/** Recuadro explicativo. Es la parte didactica: dice como leer lo que sigue. */
function comoLeer(html) {
  return `<aside class="como-leer"><p class="como-leer-titulo">Cómo leer esto</p>${html}</aside>`;
}

/** Recuadro de alerta. */
function alerta(html) {
  return `<div class="alerta" role="note">${html}</div>`;
}

/**
 * Tabla accesible.
 * @param {string} caption  titulo de la tabla (se lee antes que los datos)
 * @param {string[]} columnas
 * @param {string[][]} filas  celdas en HTML ya escapado; la primera celda es encabezado de fila
 */
function tabla(caption, columnas, filas) {
  const cab = columnas.map((c) => `<th scope="col">${c}</th>`).join('');
  const cuerpo = filas
    .map((f) => `<tr><th scope="row">${f[0]}</th>${f.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('\n');
  // El contenedor se desplaza en horizontal cuando la tabla no cabe (pantallas
  // estrechas, o muchas columnas). Un area desplazable tiene que poder recibir
  // el foco y tener nombre, o quien navega con teclado no puede ver las
  // columnas de la derecha (regla scrollable-region-focusable de axe).
  // El nombre lleva el prefijo "Tabla:" porque una seccion y su tabla pueden
  // titularse igual, y dos regiones con el mismo nombre se confunden al
  // navegar por regiones (regla landmark-unique).
  const nombre = `Tabla: ${String(caption).replace(/<[^>]+>/g, '')}`;
  return `<div class="tabla-envoltura" tabindex="0" role="region" aria-label="${esc(nombre)}"><table><caption>${caption}</caption>
    <thead><tr>${cab}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
}

/** Tarjetas de cifras clave. items: [{valor, etiqueta, nota?}] */
function cifras(items) {
  return `<ul class="cifras">${items
    .map((i) => `<li><span class="cifra-valor">${esc(i.valor)}</span><span class="cifra-etiqueta">${esc(i.etiqueta)}</span>${i.nota ? `<span class="cifra-nota">${esc(i.nota)}</span>` : ''}</li>`)
    .join('')}</ul>`;
}

/**
 * Pagina completa.
 * @param {{titulo:string, experimento:string, resumen:string, ejemplo?:boolean, secciones:{titulo:string, html:string}[]}} p
 */
function pagina(p) {
  const fecha = new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
  const bandaEjemplo = p.ejemplo
    ? alerta('<strong>Datos de ejemplo.</strong> Este reporte se generó con archivos ficticios escritos a mano para mostrar el formato. No son resultados reales de ninguna IA: no saque conclusiones de estas cifras.')
    : '';
  const indice = p.secciones
    .map((s, i) => `<li><a href="#s${i + 1}">${esc(s.titulo)}</a></li>`)
    .join('');
  const cuerpo = p.secciones
    .map((s, i) => `<section aria-labelledby="s${i + 1}"><h2 id="s${i + 1}">${esc(s.titulo)}</h2>${s.html}</section>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.titulo)}</title>
<style>
  :root { --tinta:#1a1f24; --suave:#4a545e; --papel:#fff; --fondo:#f2f4f6; --borde:#c7cfd6;
          --acento:#12566b; --si:#1d6b3f; --si-f:#e3f1e8; --no:#a4262c; --no-f:#f8e4e5;
          --aviso:#7a4a00; --aviso-f:#fbefd9; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta);
         font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  header { background:var(--acento); color:#fff; padding:2rem 1rem; }
  header p { margin:.25rem 0 0; }
  .envoltura { max-width:62rem; margin:0 auto; padding:0 1rem; }
  .experimento { text-transform:uppercase; letter-spacing:.1em; font-size:.8rem; }
  h1 { margin:.25rem 0 0; font-size:1.8rem; line-height:1.2; }
  main { padding:1.5rem 0 3rem; }
  section { background:var(--papel); border:1px solid var(--borde); border-radius:6px;
            padding:1.25rem 1.5rem; margin:1.25rem 0; }
  h2 { margin:0 0 .75rem; font-size:1.3rem; }
  h3 { margin:1.25rem 0 .5rem; font-size:1.05rem; }
  .resumen { font-size:1.08rem; }
  nav ol { margin:.25rem 0 0; padding-left:1.25rem; }
  a { color:var(--acento); }
  .como-leer { border-left:4px solid var(--acento); background:#e6f0f3; padding:.75rem 1rem;
               margin:1rem 0; border-radius:0 4px 4px 0; }
  .como-leer-titulo { margin:0 0 .25rem; font-weight:700; }
  .como-leer p { margin:.25rem 0; }
  .alerta { border-left:4px solid var(--aviso); background:var(--aviso-f); padding:.75rem 1rem;
            margin:1rem 0; border-radius:0 4px 4px 0; }
  .tabla-envoltura { overflow-x:auto; }
  .tabla-envoltura:focus-visible, a:focus-visible { outline:3px solid var(--acento); outline-offset:2px; }
  table { border-collapse:collapse; width:100%; margin:.5rem 0 1rem; font-size:.95rem; }
  caption { text-align:left; font-weight:700; padding:.25rem 0 .5rem; }
  th, td { border:1px solid var(--borde); padding:.45rem .6rem; text-align:left; vertical-align:top; }
  thead th { background:var(--fondo); }
  tbody th { font-weight:600; min-width:13rem; }
  .marca { display:inline-block; padding:.05rem .5rem; border-radius:999px; font-size:.85rem;
           font-weight:600; white-space:nowrap; border:1px solid currentColor; }
  .marca-si { color:var(--si); background:var(--si-f); }
  .marca-no { color:var(--no); background:var(--no-f); }
  .marca-aviso { color:var(--aviso); background:var(--aviso-f); }
  .marca-neutro { color:var(--suave); background:var(--fondo); }
  .barra { position:relative; background:var(--fondo); border:1px solid var(--borde);
           border-radius:4px; height:1.75rem; min-width:12rem; }
  .barra-relleno { position:absolute; inset:0 auto 0 0; background:#b9d7df; border-radius:3px 0 0 3px; }
  .barra-texto { position:relative; padding:0 .5rem; line-height:1.75rem; font-weight:600; font-size:.9rem; }
  .cifras { list-style:none; margin:.5rem 0; padding:0; display:grid;
            grid-template-columns:repeat(auto-fit,minmax(11rem,1fr)); gap:.75rem; }
  .cifras li { border:1px solid var(--borde); border-radius:6px; padding:.75rem; background:var(--papel); }
  .cifra-valor { display:block; font-size:1.7rem; font-weight:700; line-height:1.1; }
  .cifra-etiqueta { display:block; font-weight:600; }
  .cifra-nota { display:block; color:var(--suave); font-size:.88rem; }
  .preguntas li { margin:.35rem 0; }
  code { background:var(--fondo); padding:.05rem .3rem; border-radius:3px; font-size:.92em; }
  footer { color:var(--suave); font-size:.88rem; padding:0 0 2rem; }
  @media print { body { background:#fff; } section { break-inside:avoid; } }
</style>
</head>
<body>
<header><div class="envoltura">
  <p class="experimento">${esc(p.experimento)}</p>
  <h1>${esc(p.titulo)}</h1>
  <p>Generado el ${esc(fecha)}</p>
</div></header>
<main><div class="envoltura">
  ${bandaEjemplo}
  <section aria-labelledby="resumen"><h2 id="resumen">En una frase</h2><p class="resumen">${p.resumen}</p>
    <nav aria-label="Contenido del reporte"><ol>${indice}</ol></nav></section>
  ${cuerpo}
</div></main>
<footer><div class="envoltura">Taller de Pruebas de UI y UX · Módulo 6 — Probar con IA · Universidad de La Sabana</div></footer>
</body>
</html>`;
}

/** Guarda el reporte en playwright/ia/reportes/ y devuelve la ruta. */
function guardar(nombre, html) {
  fs.mkdirSync(CARPETA_REPORTES, { recursive: true });
  const sello = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  // Dos reportes en el mismo segundo tendrian el mismo nombre, y el segundo
  // borraria al primero sin avisar. Se agrega un sufijo en ese caso.
  let ruta = path.join(CARPETA_REPORTES, `${nombre}-${sello}.html`);
  for (let n = 2; fs.existsSync(ruta); n++) ruta = path.join(CARPETA_REPORTES, `${nombre}-${sello}-${n}.html`);
  fs.writeFileSync(ruta, html, 'utf8');
  return ruta;
}

/** Lee un JSON con errores explicados en espanol, en vez del SyntaxError crudo. */
function leerJson(ruta) {
  let texto;
  try {
    texto = fs.readFileSync(ruta, 'utf8');
  } catch {
    throw new Error(`No se encontró el archivo: ${ruta}`);
  }
  // Los asistentes suelen envolver el JSON en un bloque ```json ... ```.
  const sinBloque = texto.replace(/^\uFEFF/, '').replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(sinBloque);
  } catch (e) {
    throw new Error(
      `${path.basename(ruta)} no es JSON válido (${e instanceof Error ? e.message : e}).\n` +
      'Causa habitual: la IA agregó texto antes o después del JSON, o comas al final de una lista. ' +
      'Copie solo desde la primera { hasta la última }.'
    );
  }
}

module.exports = { rutaUsuario, plural, esc, normalizar, pct, barra, marca, comoLeer, alerta, tabla, cifras, pagina, guardar, leerJson };
