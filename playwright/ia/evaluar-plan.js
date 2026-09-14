// @ts-check
/**
 * MODULO 6 — Experimento E3: evaluar el plan de pruebas que diseno un agente.
 *
 * Un agente (Claude Code con navegador) explora la aplicacion y propone casos
 * de prueba en JSON (ver prompt 03). Este script:
 *
 *   1. calcula con el ORACULO que resultado produce realmente cada caso,
 *   2. compara con lo que el agente dijo que esperaba,
 *   3. mide que clases de equivalencia y que valores limite cubre el plan
 *      DE VERDAD, que no siempre es lo que el plan dice que cubre.
 *
 * Uso (desde playwright/):
 *   npm run ia:evaluar-plan -- plan-caja-negra.json [plan-caja-blanca.json ...]
 */
const path = require('path');
const R = require('./lib/reporte');
const { oraculo, normalizarEsperado, RESULTADOS, CLASES } = require('./oraculo');

const LIMITES = [
  { campo: 'edad', valor: -1, regla: 'justo debajo del mínimo posible' },
  { campo: 'edad', valor: 0, regla: 'mínimo posible: frontera entre edad imposible y menor' },
  { campo: 'edad', valor: 17, regla: 'último valor menor de edad' },
  { campo: 'edad', valor: 18, regla: 'primer valor mayor de edad' },
  { campo: 'edad', valor: 120, regla: 'máximo posible' },
  { campo: 'edad', valor: 121, regla: 'justo encima del máximo posible' },
  { campo: 'documento', valor: 0, regla: 'primer documento inválido' },
  { campo: 'documento', valor: 1, regla: 'primer documento válido' },
];

/* ---------------------------------------------------------------------------
 * Carga y analisis
 * ------------------------------------------------------------------------- */

function cargarPlan(ruta) {
  const d = R.leerJson(ruta);
  const nombre = path.basename(ruta);
  if (!Array.isArray(d.casos)) throw new Error(`${nombre}: falta la lista "casos". Revise que el JSON tenga la forma del prompt 03.`);
  d.casos.forEach((c, i) => {
    if (!c || typeof c.entrada !== 'object' || c.entrada === null) {
      throw new Error(`${nombre}: el caso #${i + 1} no tiene "entrada". Cada caso debe decir qué datos envía.`);
    }
  });
  return {
    archivo: nombre,
    herramienta: String(d.herramienta || 'Herramienta sin nombre'),
    modo: String(d.modo || 'sin modo'),
    ejecucion: d.ejecucion ?? '',
    ejemplo: d.ejemplo === true,
    casos: d.casos,
  };
}

function analizar(plan) {
  const casos = plan.casos.map((c, i) => {
    const o = oraculo(c);
    const esperado = normalizarEsperado(c.esperado);
    return {
      id: c.id || `#${i + 1}`,
      titulo: String(c.titulo || '(sin título)'),
      via: String(c.via || '').toUpperCase(),
      entrada: c.entrada,
      esperadoOriginal: c.esperado,
      esperado,
      real: o.resultado,
      razon: o.razon,
      evaluable: o.resultado !== 'FUERA_DEL_ORACULO',
    };
  });
  const evaluables = casos.filter((c) => c.evaluable);
  const correctos = evaluables.filter((c) => c.esperado === c.real);
  const equivocados = evaluables.filter((c) => c.esperado !== c.real && c.esperado !== 'NO_RECONOCIDO');
  const noReconocidos = evaluables.filter((c) => c.esperado === 'NO_RECONOCIDO');

  const reales = new Set(evaluables.map((c) => c.real));
  const declaradas = new Set(evaluables.map((c) => c.esperado));
  const clases = Object.fromEntries(CLASES.map((k) => [k, reales.has(k) ? 'cubierta' : declaradas.has(k) ? 'ilusoria' : 'falta']));

  const limites = LIMITES.map((l) => {
    const vias = [...new Set(evaluables.filter((c) => c.entrada[l.campo] === l.valor).map((c) => c.via))].sort();
    return { ...l, vias };
  });

  const firmas = new Map();
  for (const c of casos) {
    const firma = `${c.via}|${JSON.stringify(c.entrada, Object.keys(c.entrada).sort())}`;
    firmas.set(firma, (firmas.get(firma) || 0) + 1);
  }
  const repetidos = [...firmas.values()].filter((n) => n > 1).reduce((s, n) => s + n - 1, 0);

  return {
    casos, evaluables, correctos, equivocados, noReconocidos, clases, limites, repetidos,
    fuera: casos.filter((c) => !c.evaluable),
    porApi: casos.filter((c) => c.via === 'API').length,
    porUi: casos.filter((c) => c.via === 'UI').length,
  };
}

const etiqueta = (p) => `${p.herramienta} · ${p.modo}${p.ejecucion !== '' ? ` #${p.ejecucion}` : ''}`;

function resumirEntrada(e) {
  const partes = [];
  if (e.documento !== undefined) partes.push(`documento ${e.documento}`);
  if (e.edad !== undefined) partes.push(`edad ${e.edad}`);
  if (e.vivo === false) partes.push('no viva');
  if (e.repetido === true) partes.push('ya inscrito');
  if (e.nombre !== undefined && !String(e.nombre).trim()) partes.push('nombre vacío');
  if (e.genero !== undefined && !['FEMALE', 'MALE', 'UNIDENTIFIED'].includes(e.genero)) partes.push(`género "${e.genero}"`);
  return partes.join(', ');
}

/* ---------------------------------------------------------------------------
 * Reporte
 * ------------------------------------------------------------------------- */

function reporte(planes) {
  const an = planes.map(analizar);
  const secciones = [];
  const cubiertas = (a) => CLASES.filter((k) => a.clases[k] === 'cubierta').length;

  const resumen = planes.length === 1
    ? `El plan de ${R.esc(etiqueta(planes[0]))} tiene <strong>${an[0].casos.length} casos</strong>. Cubre de verdad <strong>${cubiertas(an[0])} de ${CLASES.length}</strong> clases de equivalencia, `
      + `y en <strong>${R.plural(an[0].equivocados.length, 'caso', 'casos')}</strong> esperaba un resultado que la aplicación no produce.`
    : `Se compararon <strong>${planes.length} planes</strong>. `
      + an.map((a, i) => `${R.esc(etiqueta(planes[i]))}: ${cubiertas(a)} de ${CLASES.length} clases, ${R.plural(a.equivocados.length, 'caso equivocado', 'casos equivocados')}`).join('; ') + '.';

  /* 1. Cifras ---------------------------------------------------------------- */
  let html = R.comoLeer(
    '<p>Cada caso del plan se pasó por un <strong>oráculo</strong>: una reproducción de las reglas de la aplicación, capa por capa, verificada contra la aplicación real. '
    + 'El oráculo dice qué resultado produce de verdad cada caso, y eso permite separar dos cosas que un plan mezcla con facilidad: '
    + '<strong>lo que el agente cree que prueba</strong> y <strong>lo que prueba en realidad</strong>.</p>'
  );
  html += R.tabla('Resumen por plan',
    ['Plan', 'Casos', 'Clases cubiertas', 'Esperado correcto', 'Esperado equivocado', 'Por la API', 'Repetidos'],
    an.map((a, i) => [
      R.esc(etiqueta(planes[i])),
      String(a.casos.length),
      R.barra(cubiertas(a), CLASES.length, 'Clases cubiertas'),
      `${a.correctos.length} de ${a.evaluables.length}`,
      a.equivocados.length ? `<strong>${a.equivocados.length}</strong>` : '0',
      String(a.porApi),
      String(a.repetidos),
    ]));
  secciones.push({ titulo: 'Cifras clave', html });

  /* 2. Clases de equivalencia ----------------------------------------------- */
  const estadoClase = { cubierta: R.marca('si', 'Cubierta'), ilusoria: R.marca('aviso', 'Solo lo cree'), falta: R.marca('no', 'Falta') };
  html = R.comoLeer(
    '<p><strong>Cubierta</strong>: algún caso produce de verdad ese resultado. <strong>Solo lo cree</strong>: el plan dice que la prueba, pero los datos que eligió producen otra cosa; '
    + 'por ejemplo, un caso "persona no viva" con documento 0 no prueba la regla de fallecidos, porque el documento se rechaza antes. '
    + '<strong>Falta</strong>: ningún caso la toca.</p>'
    + '<p>"Solo lo cree" es el hallazgo más peligroso: el plan parece completo y no lo es.</p>'
  );
  html += R.tabla('Las siete clases de equivalencia',
    ['Clase', 'Resultado', ...planes.map((p) => R.esc(etiqueta(p)))],
    CLASES.map((k) => [`<code>${k}</code>`, R.esc(RESULTADOS[k]), ...an.map((a) => estadoClase[a.clases[k]])]));
  secciones.push({ titulo: 'Clases de equivalencia: ¿están todas?', html });

  /* 3. Valores limite -------------------------------------------------------- */
  html = R.comoLeer(
    '<p>Los defectos se concentran en los bordes: un <code>&lt;</code> que debió ser <code>&lt;=</code>. Cada fila es un valor límite de la aplicación. '
    + 'Fíjese en la vía: <strong>la edad 121 por la interfaz prueba la validación del navegador; por la API prueba la del servidor</strong>. Son dos fronteras distintas.</p>'
  );
  html += R.tabla('Valores límite',
    ['Valor', 'Qué frontera es', ...planes.map((p) => R.esc(etiqueta(p)))],
    an[0].limites.map((l, j) => [
      `<code>${l.campo} = ${l.valor}</code>`,
      R.esc(l.regla),
      ...an.map((a) => {
        const v = a.limites[j].vias;
        return v.length ? R.marca('si', `Probado por ${v.join(' y ')}`) : R.marca('no', 'No');
      }),
    ]));
  secciones.push({ titulo: 'Valores límite', html });

  /* 4. Casos equivocados ----------------------------------------------------- */
  html = R.comoLeer(
    '<p>Un caso con el resultado esperado equivocado no es un detalle: si se automatiza tal cual, la prueba <strong>falla con la aplicación correcta</strong>, '
    + 'o peor, alguien "arregla" la aplicación para que haga lo que el plan dice. Cada fila explica qué regla ignoró el agente.</p>'
  );
  const filas = [];
  an.forEach((a, i) => a.equivocados.forEach((c) => filas.push([
    `${R.esc(etiqueta(planes[i]))}<br><small>${R.esc(c.id)}</small>`,
    `${R.esc(c.titulo)}<br><small>${R.esc(c.via)} · ${R.esc(resumirEntrada(c.entrada))}</small>`,
    `<code>${R.esc(c.esperadoOriginal)}</code>`,
    `<code>${R.esc(c.real)}</code><br><small>${R.esc(RESULTADOS[c.real] || '')}</small>`,
    R.esc(c.razon),
  ])));
  html += filas.length
    ? R.tabla('Casos cuyo resultado esperado no coincide con la aplicación', ['Plan', 'Caso', 'Esperaba', 'Resultado real', 'Por qué'], filas)
    : '<p>Todos los resultados esperados coinciden con la aplicación.</p>';
  const noRec = [];
  an.forEach((a, i) => a.noReconocidos.forEach((c) => noRec.push([R.esc(etiqueta(planes[i])), R.esc(c.titulo), `<code>${R.esc(c.esperadoOriginal)}</code>`])));
  if (noRec.length) {
    html += R.alerta('<p><strong>Resultados esperados que no se reconocieron.</strong> El prompt pide un vocabulario fijo; estos casos no lo usaron y no se pudieron evaluar.</p>')
      + R.tabla('Esperados fuera del vocabulario', ['Plan', 'Caso', 'Escribió'], noRec);
  }
  const fuera = [];
  an.forEach((a, i) => a.fuera.forEach((c) => fuera.push([R.esc(etiqueta(planes[i])), R.esc(c.titulo), R.esc(c.razon)])));
  if (fuera.length) html += R.tabla('Casos fuera del oráculo (no evaluados)', ['Plan', 'Caso', 'Motivo'], fuera);
  secciones.push({ titulo: 'Casos con el resultado esperado equivocado', html });

  /* 5. Caja negra frente a caja blanca -------------------------------------- */
  const modos = [...new Set(planes.map((p) => p.modo))];
  if (modos.includes('caja-negra') && modos.includes('caja-blanca')) {
    const i = planes.findIndex((p) => p.modo === 'caja-negra');
    const j = planes.findIndex((p) => p.modo === 'caja-blanca');
    const soloBlanca = CLASES.filter((k) => an[j].clases[k] === 'cubierta' && an[i].clases[k] !== 'cubierta');
    const soloNegra = CLASES.filter((k) => an[i].clases[k] === 'cubierta' && an[j].clases[k] !== 'cubierta');
    html = R.comoLeer(
      '<p>En <strong>caja negra</strong> el agente solo vio la aplicación funcionando; en <strong>caja blanca</strong> pudo leer el código. '
      + 'Leer el código revela reglas que la interfaz esconde, pero también tienta a copiar la implementación: una prueba que repite lo que el código hace no puede detectar que el código esté mal.</p>'
    );
    html += `<p><strong>Clases que solo cubrió leyendo el código:</strong> ${soloBlanca.length ? soloBlanca.map((k) => `<code>${k}</code>`).join(', ') : 'ninguna'}.</p>`;
    html += `<p><strong>Clases que solo cubrió sin leer el código:</strong> ${soloNegra.length ? soloNegra.map((k) => `<code>${k}</code>`).join(', ') : 'ninguna'}.</p>`;
    html += `<p><strong>Casos por la API:</strong> ${an[i].porApi} en caja negra frente a ${an[j].porApi} en caja blanca.</p>`;
    secciones.push({ titulo: 'Caja negra frente a caja blanca', html });
  }

  secciones.push({
    titulo: 'Preguntas para la Wiki',
    html: `<ol class="preguntas">
      <li>¿Qué clase de equivalencia faltó en su plan de caja negra? ¿Podía descubrirla un agente que solo usa la interfaz? Justifíquelo con lo que muestra la página.</li>
      <li>Elija un caso con el resultado esperado equivocado. ¿Qué regla de la aplicación ignoró el agente? ¿Un humano que escribiera el plan cometería el mismo error?</li>
      <li>¿Hubo clases marcadas "Solo lo cree"? Explique con qué datos habría que corregir el caso para que pruebe lo que dice.</li>
      <li>Compare caja negra y caja blanca. ¿Leer el código mejoró el plan, o el agente se limitó a transcribir la implementación? Busque un caso que lo demuestre.</li>
      <li>Si tuviera que confiar en uno solo de estos planes para una entrega real, ¿cuál elegiría y qué le agregaría a mano?</li>
    </ol>`,
  });

  return R.pagina({
    titulo: planes.length > 1 ? 'Planes de prueba de un agente: comparación' : 'Plan de pruebas de un agente',
    experimento: 'Módulo 6 · Experimento E3',
    resumen,
    ejemplo: planes.some((p) => p.ejemplo),
    secciones,
  });
}

function main() {
  const archivos = process.argv.slice(2).map(R.rutaUsuario);
  if (!archivos.length) {
    console.error('Uso: npm run ia:evaluar-plan -- <plan.json> [<otro-plan.json> ...]');
    process.exit(1);
  }
  const planes = archivos.map(cargarPlan);
  const ruta = R.guardar('plan', reporte(planes));
  console.log(`Reporte generado:\n  ${ruta}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n${e instanceof Error ? e.message : e}\n`); process.exit(1); }
}

module.exports = { analizar, cargarPlan, LIMITES };
