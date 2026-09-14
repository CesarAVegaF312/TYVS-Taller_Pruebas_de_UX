// @ts-check
/**
 * MODULO 6 — Experimentos E1 y E4: evaluar auditorias de accesibilidad hechas por IA.
 *
 * E1: ¿encuentra la IA los defectos que axe no puede ver?
 * E4: si se repite el mismo prompt, ¿encuentra lo mismo?
 *
 * Flujo:
 *
 *   1) La IA audita pagina.html (ver prompt 01) y devuelve un JSON.
 *
 *   2) npm run ia:sugerir -- mi-auditoria.json
 *      Agrega a cada hallazgo una SUGERENCIA de a cual de los 17 defectos
 *      corresponde, y un campo "defecto" vacio. Usted verifica cada hallazgo
 *      contra la pagina y llena "defecto" con el id (por ejemplo "C-1") o con
 *      "NO_EXISTE" si la IA se lo invento.
 *
 *      La sugerencia es solo eso. Aceptarla sin mirar la pagina es exactamente
 *      el error que este modulo quiere que usted aprenda a no cometer.
 *
 *   3) npm run ia:evaluar-auditoria -- auditoria-1.json [auditoria-2.json ...]
 *      Genera el reporte HTML en playwright/ia/reportes/.
 *      Con un archivo: experimento E1. Con varios: agrega E4 (estabilidad) y,
 *      si son de herramientas distintas, la comparacion entre ellas.
 */
const path = require('path');
const fs = require('fs');
const R = require('./lib/reporte');

const VERDAD = R.leerJson(path.join(__dirname, 'verdad', 'defectos-sembrados.json')).defectos;
const IDS = new Set(VERDAD.map((d) => d.id));
const POR_ID = Object.fromEntries(VERDAD.map((d) => [d.id, d]));
const GRUPOS = {
  A: 'Grupo A — axe los detecta con el filtro WCAG',
  B: 'Grupo B — axe los detecta solo sin el filtro',
  C: 'Grupo C — axe no los detecta nunca',
};

/* ---------------------------------------------------------------------------
 * Sugerencia de clasificacion
 * ------------------------------------------------------------------------- */

function puntuar(hallazgo, defecto) {
  const textoElemento = R.normalizar(`${hallazgo.elemento} ${hallazgo.evidencia}`);
  const textoProblema = R.normalizar(`${hallazgo.problema} ${hallazgo.evidencia}`);
  let puntos = 0;
  if (defecto.elementos.some((e) => textoElemento.includes(R.normalizar(e)))) puntos += 3;
  puntos += Math.min(3, defecto.palabras.filter((p) => textoProblema.includes(R.normalizar(p))).length);
  if (defecto.criterios.some((c) => String(hallazgo.criterio_wcag ?? '').includes(c))) puntos += 1;
  return puntos;
}

function sugerir(hallazgo) {
  const candidatos = VERDAD
    .map((d) => ({ id: d.id, titulo: d.titulo, puntos: puntuar(hallazgo, d) }))
    .filter((c) => c.puntos >= 2)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 2);
  if (!candidatos.length) return 'Sin coincidencias: puede ser NO_EXISTE, o un defecto descrito con otras palabras. Verifíquelo en la página.';
  return candidatos.map((c) => `${c.id} (${c.titulo})`).join('  o  ');
}

/* ---------------------------------------------------------------------------
 * Validacion de la entrada
 * ------------------------------------------------------------------------- */

function cargarEjecucion(ruta) {
  const datos = R.leerJson(ruta);
  const nombre = path.basename(ruta);
  if (!Array.isArray(datos.hallazgos)) {
    throw new Error(`${nombre}: falta la lista "hallazgos". Revise que el JSON tenga la forma del prompt 01.`);
  }
  datos.hallazgos.forEach((h, i) => {
    if (!h || typeof h.problema !== 'string' || !h.problema.trim()) {
      throw new Error(`${nombre}: el hallazgo #${i + 1} no tiene "problema". Cada hallazgo debe decir qué problema encontró.`);
    }
  });
  return {
    archivo: nombre,
    herramienta: String(datos.herramienta || 'Herramienta sin nombre'),
    modelo: String(datos.modelo || ''),
    ejecucion: datos.ejecucion ?? '',
    ejemplo: datos.ejemplo === true,
    hallazgos: datos.hallazgos,
    datos,
  };
}

/* ---------------------------------------------------------------------------
 * Metricas
 * ------------------------------------------------------------------------- */

function medir(ej) {
  const clasificados = [];
  const sinClasificar = [];
  const falsos = [];
  for (const h of ej.hallazgos) {
    const d = String(h.defecto ?? '').trim().toUpperCase();
    if (d === 'NO_EXISTE') { falsos.push(h); clasificados.push(h); }
    else if (IDS.has(d)) clasificados.push(h);
    else sinClasificar.push(h);
  }
  const encontrados = new Set(
    ej.hallazgos.map((h) => String(h.defecto ?? '').trim().toUpperCase()).filter((d) => IDS.has(d))
  );
  const aciertos = clasificados.length - falsos.length;
  const porGrupo = {};
  for (const g of ['A', 'B', 'C']) {
    const total = VERDAD.filter((d) => d.grupo === g).length;
    porGrupo[g] = { total, encontrados: VERDAD.filter((d) => d.grupo === g && encontrados.has(d.id)).length };
  }
  return {
    encontrados, falsos, sinClasificar, clasificados, aciertos, porGrupo,
    duplicados: aciertos - encontrados.size,
    precision: clasificados.length ? aciertos / clasificados.length : null,
  };
}

const etiquetaEjecucion = (ej) => `${ej.herramienta}${ej.ejecucion !== '' ? ` #${ej.ejecucion}` : ''}`;

/* ---------------------------------------------------------------------------
 * Reporte
 * ------------------------------------------------------------------------- */

function reporte(ejecuciones) {
  const medidas = ejecuciones.map(medir);
  const esEjemplo = ejecuciones.some((e) => e.ejemplo);
  const herramientas = [...new Set(ejecuciones.map((e) => e.herramienta))];
  const secciones = [];
  const pendientes = medidas.reduce((s, m) => s + m.sinClasificar.length, 0);

  // Resumen en una frase
  const mejor = medidas.reduce((a, m, i) => (m.encontrados.size > medidas[a].encontrados.size ? i : a), 0);
  const mC = medidas[mejor].porGrupo.C;
  let resumen = ejecuciones.length === 1
    ? `${R.esc(etiquetaEjecucion(ejecuciones[0]))} encontró <strong>${medidas[0].encontrados.size} de 17</strong> defectos, `
      + `<strong>${mC.encontrados} de ${mC.total}</strong> de los que axe no puede ver, e inventó <strong>${medidas[0].falsos.length}</strong>.`
    : `Se compararon <strong>${ejecuciones.length} auditorías</strong>. La que más encontró fue ${R.esc(etiquetaEjecucion(ejecuciones[mejor]))}: `
      + `<strong>${medidas[mejor].encontrados.size} de 17</strong>, con <strong>${mC.encontrados} de ${mC.total}</strong> del grupo C. `
      + `Como referencia, axe encuentra 7 con el filtro WCAG y 10 sin él, y ninguno del grupo C.`;
  if (pendientes) resumen += ` <strong>Hay ${R.plural(pendientes, "hallazgo", "hallazgos")} sin clasificar: las cifras son provisionales.</strong>`;

  /* 1. Cifras clave -------------------------------------------------------- */
  let html = R.comoLeer(
    '<p><strong>Cobertura</strong>: cuántos de los 17 defectos reales encontró. <strong>Precisión</strong>: de todo lo que afirmó, qué parte era verdad. '
    + 'Una IA puede tener cobertura alta y precisión baja si dispara hallazgos al azar: por eso se miran las dos juntas.</p>'
    + '<p>La referencia honesta no es "17 de 17": es <strong>axe</strong>, una herramienta gratuita y determinista. Una IA solo aporta si encuentra lo que axe no ve sin inventar demasiado.</p>'
  );
  // Con varias auditorias, una sola tabla: repetir un bloque por ejecucion
  // alarga el reporte y esconde la comparacion, que es lo que interesa.
  if (ejecuciones.length > 1) {
    html += R.tabla('Resumen por auditoría',
      ['Auditoría', 'Cobertura', 'Precisión', 'Inventados', 'Repetidos', 'Grupo A', 'Grupo B', 'Grupo C'],
      medidas.map((m, i) => [
        R.esc(etiquetaEjecucion(ejecuciones[i])),
        R.barra(m.encontrados.size, 17, 'Cobertura'),
        m.precision === null ? '—' : `${R.pct(m.aciertos, m.clasificados.length)} <small>(${m.aciertos}/${m.clasificados.length})</small>`,
        String(m.falsos.length),
        String(m.duplicados),
        `${m.porGrupo.A.encontrados} de 7`,
        `${m.porGrupo.B.encontrados} de 3`,
        `<strong>${m.porGrupo.C.encontrados} de 7</strong>`,
      ]));
    html += '<p>Referencia: <strong>axe</strong> encuentra 7 de 7 del grupo A con el filtro WCAG, 3 de 3 del grupo B solo sin el filtro, y 0 del grupo C.</p>';
  }
  for (let i = 0; i < (ejecuciones.length > 1 ? 0 : 1); i++) {
    const m = medidas[i];
    html += `<h3>${R.esc(etiquetaEjecucion(ejecuciones[i]))}${ejecuciones[i].modelo ? ` <small>(${R.esc(ejecuciones[i].modelo)})</small>` : ''}</h3>`;
    html += R.cifras([
      { valor: `${m.encontrados.size} / 17`, etiqueta: 'Cobertura', nota: 'defectos reales encontrados' },
      { valor: m.precision === null ? '—' : R.pct(m.aciertos, m.clasificados.length), etiqueta: 'Precisión', nota: `${m.aciertos} de ${m.clasificados.length} hallazgos eran reales` },
      { valor: String(m.falsos.length), etiqueta: 'Inventados', nota: 'hallazgos marcados NO_EXISTE' },
      { valor: String(m.duplicados), etiqueta: 'Repetidos', nota: 'el mismo defecto contado más de una vez' },
    ]);
    html += R.tabla('Cobertura por grupo',
      ['Grupo', 'Encontrados por la IA', 'axe con filtro WCAG', 'axe sin filtro'],
      ['A', 'B', 'C'].map((g) => [
        R.esc(GRUPOS[g]),
        R.barra(m.porGrupo[g].encontrados, m.porGrupo[g].total, `Grupo ${g}`),
        g === 'A' ? '7 de 7' : '0',
        g === 'C' ? '0' : `${m.porGrupo[g].total} de ${m.porGrupo[g].total}`,
      ]));
  }
  secciones.push({ titulo: 'Cifras clave', html });

  /* 2. Los 17 defectos ---------------------------------------------------- */
  html = R.comoLeer(
    '<p>Cada fila es un defecto real de la página. La columna <strong>axe</strong> dice si la herramienta automática lo detecta; las siguientes, si lo encontró cada auditoría con IA.</p>'
    + '<p>Mire en especial las filas del <strong>grupo C</strong>: son la única razón de peso para usar una IA en lugar de axe.</p>'
  );
  const axeTexto = { 'con-filtro': R.marca('si', 'Sí'), 'sin-filtro': R.marca('aviso', 'Solo sin filtro'), nunca: R.marca('no', 'Nunca') };
  html += R.tabla('Qué encontró cada auditoría',
    ['Defecto', 'Grupo', 'axe', ...ejecuciones.map((e) => R.esc(etiquetaEjecucion(e))), 'A quién excluye'],
    VERDAD.map((d) => [
      `<code>${d.id}</code> ${R.esc(d.titulo)}`,
      d.grupo,
      axeTexto[d.axe],
      ...medidas.map((m) => (m.encontrados.has(d.id) ? R.marca('si', 'Encontrado') : R.marca('no', 'No'))),
      R.esc(d.excluye),
    ]));
  secciones.push({ titulo: 'Los 17 defectos, uno por uno', html });

  /* 3. Lo que la IA aporta y lo que se le escapa ------------------------- */
  html = '';
  for (let i = 0; i < ejecuciones.length; i++) {
    const m = medidas[i];
    const aporta = VERDAD.filter((d) => d.axe === 'nunca' && m.encontrados.has(d.id));
    const seEscapa = VERDAD.filter((d) => d.axe !== 'nunca' && !m.encontrados.has(d.id));
    html += `<h3>${R.esc(etiquetaEjecucion(ejecuciones[i]))}</h3>`;
    html += `<p><strong>Encontró y axe no:</strong> ${aporta.length ? aporta.map((d) => `<code>${d.id}</code> ${R.esc(d.titulo)}`).join('; ') : 'ninguno.'}</p>`;
    html += `<p><strong>axe lo encuentra y la IA no:</strong> ${seEscapa.length ? seEscapa.map((d) => `<code>${d.id}</code> ${R.esc(d.titulo)}`).join('; ') : 'ninguno.'}</p>`;
  }
  html += R.comoLeer(
    '<p>Si la segunda lista no está vacía, la IA <strong>no sustituye</strong> a axe: se le escaparon defectos que una herramienta gratuita encuentra siempre. '
    + 'La conclusión razonable casi nunca es "IA o axe", sino "axe primero, y la IA para lo que axe no puede juzgar".</p>'
  );
  secciones.push({ titulo: 'Lo que la IA aporta y lo que se le escapa', html });

  /* 4. Hallazgos inventados ------------------------------------------------ */
  html = R.comoLeer(
    '<p>Un hallazgo inventado no es inofensivo: alguien tiene que leerlo, abrir la página y comprobar que no existe. '
    + 'Si una auditoría trae muchos, el tiempo que ahorra la IA se va en descartarlos.</p>'
  );
  const filasFalsos = [];
  ejecuciones.forEach((e, i) => medidas[i].falsos.forEach((h) => filasFalsos.push([
    R.esc(etiquetaEjecucion(e)), `<code>${R.esc(h.elemento)}</code>`, R.esc(h.problema), R.esc(h.nota_estudiante || ''),
  ])));
  html += filasFalsos.length
    ? R.tabla('Afirmaciones que resultaron falsas', ['Auditoría', 'Elemento', 'Lo que afirmó la IA', 'Por qué no existe (nota del estudiante)'], filasFalsos)
    : '<p>Ninguna auditoría tiene hallazgos marcados como <code>NO_EXISTE</code>.</p>';
  secciones.push({ titulo: 'Hallazgos inventados', html });

  /* 5. Estabilidad (E4) ---------------------------------------------------- */
  for (const herr of herramientas) {
    const idx = ejecuciones.map((e, i) => (e.herramienta === herr ? i : -1)).filter((i) => i >= 0);
    if (idx.length < 2) continue;
    const n = idx.length;
    const veces = VERDAD.map((d) => ({ d, k: idx.filter((i) => medidas[i].encontrados.has(d.id)).length }));
    const siempre = veces.filter((v) => v.k === n);
    const aVeces = veces.filter((v) => v.k > 0 && v.k < n);
    const nunca = veces.filter((v) => v.k === 0);
    html = R.comoLeer(
      `<p>Se ejecutó <strong>el mismo prompt ${n} veces</strong> con ${R.esc(herr)}. Una prueba de software tradicional daría siempre el mismo resultado; una IA no.</p>`
      + '<p>Lo que aparece <strong>siempre</strong> es lo que puede considerarse capacidad de la herramienta. Lo que aparece <strong>a veces</strong> es suerte: '
      + 'si solo hubiera ejecutado el prompt una vez, podría haberlo encontrado o no. Una auditoría con IA que se ejecuta una sola vez no es reproducible.</p>'
    );
    html += R.cifras([
      { valor: String(siempre.length), etiqueta: `En las ${n} ejecuciones`, nota: 'hallazgo estable' },
      { valor: String(aVeces.length), etiqueta: 'En algunas', nota: 'depende de la ejecución' },
      { valor: String(nunca.length), etiqueta: 'En ninguna', nota: 'fuera de su alcance con este prompt' },
    ]);
    html += R.tabla(`Cuántas veces apareció cada defecto (${R.esc(herr)})`,
      ['Defecto', 'Grupo', 'Veces encontrado', 'Lectura'],
      veces.map((v) => [
        `<code>${v.d.id}</code> ${R.esc(v.d.titulo)}`,
        v.d.grupo,
        `${v.k} de ${n}`,
        v.k === n ? R.marca('si', 'Estable') : v.k === 0 ? R.marca('neutro', 'Nunca') : R.marca('aviso', 'Inestable'),
      ]));
    secciones.push({ titulo: `Estabilidad: el mismo prompt, ${n} veces (${herr})`, html });
  }

  /* 6. Comparacion entre herramientas ------------------------------------- */
  if (herramientas.length > 1) {
    html = R.comoLeer(
      '<p>Compare con cuidado: si una herramienta se ejecutó más veces, tuvo más oportunidades de acertar por suerte. '
      + 'La columna "mejor ejecución" es la comparación justa; la "unión" muestra lo máximo que se puede sacar juntando todas.</p>'
    );
    html += R.tabla('Comparación entre herramientas',
      ['Herramienta', 'Ejecuciones', 'Mejor ejecución', 'Unión de todas', 'Grupo C (unión)'],
      herramientas.map((herr) => {
        const ms = medidas.filter((_, i) => ejecuciones[i].herramienta === herr);
        const union = new Set(ms.flatMap((m) => [...m.encontrados]));
        const cUnion = VERDAD.filter((d) => d.grupo === 'C' && union.has(d.id)).length;
        return [R.esc(herr), String(ms.length), `${Math.max(...ms.map((m) => m.encontrados.size))} de 17`, `${union.size} de 17`, R.barra(cUnion, 7, 'Grupo C')];
      }));
    secciones.push({ titulo: 'ChatGPT y Claude Code, lado a lado', html });
  }

  /* 7. Sin clasificar ------------------------------------------------------ */
  if (pendientes) {
    html = R.alerta(`<p><strong>${pendientes === 1 ? "Un hallazgo no tiene" : `${pendientes} hallazgos no tienen`} el campo <code>defecto</code> lleno</strong> con un id válido (A-1 … C-7) o <code>NO_EXISTE</code>. `
      + 'No cuentan ni como aciertos ni como inventados, así que todas las cifras de arriba son provisionales.</p>');
    const filas = [];
    ejecuciones.forEach((e, i) => medidas[i].sinClasificar.forEach((h) => filas.push([
      R.esc(etiquetaEjecucion(e)), R.esc(h.problema), `<code>${R.esc(h.defecto ?? '')}</code>`, R.esc(sugerir(h)),
    ])));
    html += R.tabla('Pendientes de clasificar', ['Auditoría', 'Hallazgo', 'Valor actual', 'Sugerencia (verifíquela)'], filas);
    secciones.push({ titulo: 'Hallazgos sin clasificar', html });
  }

  /* 8. Reflexion ----------------------------------------------------------- */
  secciones.push({
    titulo: 'Preguntas para la Wiki',
    html: `<ol class="preguntas">
      <li>¿Cuántos defectos del grupo C encontró la IA? Para cada uno, ¿la explicación era correcta o acertó el elemento por las razones equivocadas?</li>
      <li>¿Qué defecto que axe detecta siempre se le escapó a la IA? ¿Por qué cree que ocurrió?</li>
      <li>Revise los hallazgos inventados: ¿tenían algo en común? ¿Sonaban convincentes?</li>
      <li>Si tuviera que auditar un sitio real mañana con una hora disponible, ¿cómo repartiría ese tiempo entre axe, la IA y la revisión manual? Justifíquelo con las cifras de este reporte.</li>
      <li>¿Cuánto tiempo le llevó clasificar los hallazgos? Compárelo con el tiempo que le habría llevado revisar la página a mano con la lista del módulo 3B.</li>
    </ol>`,
  });

  return R.pagina({
    titulo: ejecuciones.length > 1 ? 'Auditorías de accesibilidad con IA: comparación' : 'Auditoría de accesibilidad con IA',
    experimento: ejecuciones.length > 1 ? 'Módulo 6 · Experimentos E1 y E4' : 'Módulo 6 · Experimento E1',
    resumen,
    ejemplo: esEjemplo,
    secciones,
  });
}

/* ---------------------------------------------------------------------------
 * Linea de comandos
 * ------------------------------------------------------------------------- */

function main() {
  const args = process.argv.slice(2);
  const modoSugerir = args[0] === '--sugerir';
  const archivos = (modoSugerir ? args.slice(1) : args).map(R.rutaUsuario);

  if (!archivos.length) {
    console.error(modoSugerir
      ? 'Uso: npm run ia:sugerir -- <auditoria.json>'
      : 'Uso: npm run ia:evaluar-auditoria -- <auditoria.json> [<otra.json> ...]');
    process.exit(1);
  }

  if (modoSugerir) {
    for (const ruta of archivos) {
      const datos = R.leerJson(ruta);
      cargarEjecucion(ruta); // valida la forma
      let nuevos = 0;
      for (const h of datos.hallazgos) {
        h.sugerencia = sugerir(h);
        if (!('defecto' in h)) { h.defecto = ''; nuevos++; }
      }
      fs.writeFileSync(ruta, JSON.stringify(datos, null, 2) + '\n', 'utf8');
      console.log(`${path.basename(ruta)}: ${datos.hallazgos.length} hallazgos con sugerencia (${nuevos} campos "defecto" agregados).`);
    }
    console.log('\nAhora abra el archivo, verifique CADA hallazgo en la página y llene "defecto" con el id o con NO_EXISTE.'
      + '\nSi la IA se lo inventó, explique por qué en "nota_estudiante".');
    return;
  }

  const ejecuciones = archivos.map(cargarEjecucion);
  const ruta = R.guardar('auditoria', reporte(ejecuciones));
  const pendientes = ejecuciones.map(medir).reduce((s, m) => s + m.sinClasificar.length, 0);
  console.log(`Reporte generado:\n  ${ruta}`);
  if (pendientes) console.log(`\nAviso: ${R.plural(pendientes, 'hallazgo', 'hallazgos')} sin clasificar. Las cifras son provisionales (ver la última sección del reporte).`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n${e instanceof Error ? e.message : e}\n`); process.exit(1); }
}

module.exports = { medir, sugerir, VERDAD };
