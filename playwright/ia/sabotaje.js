// @ts-check
/**
 * MODULO 6 — Experimento E2: las pruebas que escribe la IA, ¿detectan algo?
 *
 * Que una prueba pase no dice nada sobre si sirve. Una prueba sin aserciones
 * tambien pasa. La unica forma de saber si una suite protege es ROMPER la
 * aplicacion a proposito y ver si alguna prueba se entera.
 *
 * Es la misma idea que las pruebas de mutacion del taller de unitarias (PIT),
 * llevada al nivel de la interfaz: en vez de mutar el bytecode, un proxy
 * altera lo que la aplicacion responde.
 *
 *   pruebas  --->  proxy :8080  --->  Registraduria :8081
 *                     ^
 *                     aqui se introduce el sabotaje
 *
 * Por que un proxy y no modificar el codigo:
 *   - no hay que recompilar el jar en cada sabotaje (serian siete compilaciones)
 *   - funciona con cualquier prueba, incluso con la URL escrita a mano, porque
 *     el proxy ocupa el puerto donde las pruebas esperan la aplicacion
 *   - las pruebas generadas no se tocan: se evaluan tal como las entrego la IA
 *
 * Uso (desde playwright/, con el jar compilado y NADA corriendo en 8080/8081):
 *   npm run ia:sabotaje               -> referencia + sus pruebas en ia/generadas/
 *   npm run ia:sabotaje -- --ejemplo  -> referencia + el ejemplo de ia/ejemplos/
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const R = require('./lib/reporte');

const DIR_PW = path.resolve(__dirname, '..');
const JAR = path.resolve(DIR_PW, '..', 'registraduria', 'target', 'registraduria-1.0-SNAPSHOT.jar');
const PUERTO_PROXY = 8080;
const PUERTO_APP = 8081;

/* ---------------------------------------------------------------------------
 * Los sabotajes
 *
 * Cada uno rompe UNA regla, de forma que una persona usuaria lo notaria.
 * "aplicar" devuelve el cuerpo alterado, o null si esta respuesta no le toca.
 * ------------------------------------------------------------------------- */

const cambiarResultado = (de, a) => (req, cuerpo) =>
  req.method === 'POST' && req.url === '/register' && cuerpo.trim() === de ? a : null;

const SABOTAJES = [
  {
    id: 'S1', titulo: 'Se inscriben menores de edad',
    detalle: 'El servidor responde VALID cuando debería responder UNDERAGE.',
    capa: 'Servidor · regla de negocio',
    aplicar: cambiarResultado('UNDERAGE', 'VALID'),
  },
  {
    id: 'S2', titulo: 'Se aceptan documentos repetidos',
    detalle: 'El servidor responde VALID cuando debería responder DUPLICATED.',
    capa: 'Servidor · regla de negocio',
    aplicar: cambiarResultado('DUPLICATED', 'VALID'),
  },
  {
    id: 'S3', titulo: 'Se inscriben personas fallecidas',
    detalle: 'El servidor responde VALID cuando debería responder DEAD.',
    capa: 'Servidor · regla de negocio',
    aplicar: cambiarResultado('DEAD', 'VALID'),
  },
  {
    id: 'S4', titulo: 'La API acepta edades imposibles',
    detalle: 'El servidor responde VALID cuando debería responder INVALID_AGE. Por la interfaz no se ve: el navegador bloquea esas edades antes de enviarlas.',
    capa: 'Servidor · solo alcanzable por la API',
    aplicar: cambiarResultado('INVALID_AGE', 'VALID'),
  },
  {
    id: 'S5', titulo: 'Desaparece la validación del navegador',
    detalle: 'app.js deja de comprobar que el documento sea positivo: el error ya no aparece junto al campo y el dato viaja al servidor.',
    capa: 'Interfaz · JavaScript',
    buscar: 'Number.isInteger(datos.id) && datos.id > 0',
    aplicar: (req, cuerpo) =>
      req.method === 'GET' && req.url.split('?')[0] === '/app.js' && cuerpo.includes('Number.isInteger(datos.id) && datos.id > 0')
        ? cuerpo.replace('Number.isInteger(datos.id) && datos.id > 0', 'Number.isInteger(datos.id)')
        : null,
  },
  {
    id: 'S6', titulo: 'El resultado deja de anunciarse',
    detalle: 'index.html pierde role="status" y aria-live: quien usa lector de pantalla no se entera del resultado. Visualmente no cambia nada.',
    capa: 'Interfaz · accesibilidad',
    buscar: ' role="status" aria-live="polite"',
    aplicar: (req, cuerpo) =>
      req.method === 'GET' && ['/', '/index.html'].includes(req.url.split('?')[0]) && cuerpo.includes(' role="status" aria-live="polite"')
        ? cuerpo.replace(' role="status" aria-live="polite"', '')
        : null,
  },
];

/* ---------------------------------------------------------------------------
 * Proxy
 * ------------------------------------------------------------------------- */

const estado = { activo: /** @type {any} */ (null), aplicado: 0, peticiones: 0 };

function crearProxy() {
  return http.createServer((req, res) => {
    const trozos = [];
    req.on('data', (t) => trozos.push(t));
    req.on('end', () => {
      estado.peticiones++;
      const cabeceras = { ...req.headers, host: `localhost:${PUERTO_APP}`, 'accept-encoding': 'identity' };
      delete cabeceras['if-none-match'];
      delete cabeceras['if-modified-since'];
      const salida = http.request(
        { host: 'localhost', port: PUERTO_APP, method: req.method, path: req.url, headers: cabeceras },
        (resApp) => {
          const partes = [];
          resApp.on('data', (p) => partes.push(p));
          resApp.on('end', () => {
            let cuerpo = Buffer.concat(partes);
            const alterado = estado.activo ? estado.activo.aplicar(req, cuerpo.toString('utf8')) : null;
            if (alterado !== null) {
              cuerpo = Buffer.from(alterado, 'utf8');
              estado.aplicado++;
            }
            const cab = { ...resApp.headers, 'content-length': String(cuerpo.length) };
            delete cab['transfer-encoding'];
            delete cab.etag;
            delete cab['last-modified'];
            res.writeHead(resApp.statusCode || 502, cab);
            res.end(cuerpo);
          });
        }
      );
      salida.on('error', (e) => { res.writeHead(502); res.end(`Proxy: ${e.message}`); });
      salida.end(Buffer.concat(trozos));
    });
  });
}

/* ---------------------------------------------------------------------------
 * Aplicacion y ejecucion de pruebas
 * ------------------------------------------------------------------------- */

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve) => {
    http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => resolve({ status: r.statusCode, body: d })); })
      .on('error', () => resolve(null));
  });
}

async function levantarAplicacion() {
  if (await get(`http://localhost:${PUERTO_APP}/actuator/health`)) {
    throw new Error(`Ya hay algo respondiendo en el puerto ${PUERTO_APP}. Deténgalo: el experimento necesita una Registraduría recién iniciada, con la base de datos vacía.`);
  }
  const app = spawn('java', ['-jar', JAR, `--server.port=${PUERTO_APP}`], { stdio: 'ignore' });
  app.on('error', () => {});
  for (let i = 0; i < 90; i++) {
    const r = await get(`http://localhost:${PUERTO_APP}/actuator/health`);
    if (r && r.body.includes('UP')) return app;
    await esperar(1000);
  }
  app.kill();
  throw new Error('La Registraduría no arrancó en 90 segundos. Pruebe a iniciarla a mano con java -jar para ver el error.');
}

/** @param {{proyecto:string, dir?:string}} suite */
function ejecutarSuite(suite) {
  const salidaJson = path.join(os.tmpdir(), `tyvs-sabotaje-${suite.proyecto}-${Date.now()}.json`);
  const env = { ...process.env, IA_JSON: salidaJson };
  if (suite.dir) env.IA_DIR = suite.dir;
  else delete env.IA_DIR;
  return new Promise((resolve) => {
    // Un solo string de comando: en Windows npx es un .cmd y necesita shell,
    // y pasar un arreglo de argumentos con shell:true esta desaconsejado.
    // Aqui no hay riesgo de inyeccion: el nombre del proyecto es fijo.
    const p = spawn(`npx playwright test --config ia/playwright.ia.config.js --project ${suite.proyecto}`,
      { cwd: DIR_PW, shell: true, stdio: 'ignore', env });
    p.on('close', () => {
      let datos;
      try { datos = JSON.parse(fs.readFileSync(salidaJson, 'utf8')); } catch { return resolve(null); }
      fs.rmSync(salidaJson, { force: true });
      const pruebas = {};
      const recorrer = (suite, ruta) => {
        for (const spec of suite.specs || []) {
          const nombre = [...ruta, spec.title].filter(Boolean).join(' › ');
          const t = (spec.tests || [])[0];
          pruebas[nombre] = t ? t.status : 'desconocido';
        }
        for (const s of suite.suites || []) recorrer(s, [...ruta, s.title]);
      };
      for (const s of datos.suites || []) recorrer(s, [path.basename(s.title || s.file || '')]);
      resolve(pruebas);
    });
  });
}

/* ---------------------------------------------------------------------------
 * Analisis estatico: la lista de revision, hecha automatica
 * ------------------------------------------------------------------------- */

function analizarArchivos(dir) {
  const archivos = fs.existsSync(dir)
    ? fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.spec\.(js|ts)$/.test(f))
    : [];
  const hallazgos = { archivos: archivos.length, pruebas: 0, sinExpect: [], esperasFijas: 0, urlsFijas: 0, cssXpath: 0, porRol: 0, documentosFijos: 0 };
  for (const f of archivos) {
    const texto = fs.readFileSync(path.join(dir, f), 'utf8');
    const trozos = texto.split(/\btest\s*\(\s*(?=['"`])/).slice(1);
    hallazgos.pruebas += trozos.length;
    trozos.forEach((t) => {
      const titulo = (t.match(/^['"`](.*?)['"`]/) || [, '(sin título)'])[1];
      if (!/\bexpect\s*\(/.test(t)) hallazgos.sinExpect.push(`${f} › ${titulo}`);
    });
    hallazgos.esperasFijas += (texto.match(/waitForTimeout\s*\(|setTimeout\s*\(|sleep\s*\(/g) || []).length;
    hallazgos.urlsFijas += (texto.match(/https?:\/\/localhost:\d+/g) || []).length;
    hallazgos.cssXpath += (texto.match(/\.locator\s*\(\s*['"`](?:[#.]|\/\/|xpath=)/g) || []).length;
    hallazgos.porRol += (texto.match(/getBy(?:Role|Label|Text|Placeholder|TestId)\s*\(/g) || []).length;
    hallazgos.documentosFijos += (texto.match(/(?:documento|document|id)[^\n]{0,60}\.fill\(\s*['"`]\d{4,}['"`]|\bid\s*:\s*\d{4,}/gi) || []).length;
  }
  return hallazgos;
}

/* ---------------------------------------------------------------------------
 * Experimento
 * ------------------------------------------------------------------------- */

async function experimento(suites) {
  const resultados = {};
  for (const suite of suites) {
    const clave = suite.clave;
    resultados[clave] = { base: null, sabotajes: {} };
    estado.activo = null; estado.aplicado = 0;
    process.stdout.write(`  [${suite.nombre}] línea base... `);
    resultados[clave].base = await ejecutarSuite(suite);
    if (!resultados[clave].base || !Object.keys(resultados[clave].base).length) {
      console.log('sin pruebas o sin resultados (¿el archivo tiene errores de sintaxis?)');
      continue;
    }
    const b = resultados[clave].base;
    console.log(`${Object.values(b).filter((s) => s === 'expected').length} de ${Object.keys(b).length} pasan`);

    for (const s of SABOTAJES) {
      estado.activo = s; estado.aplicado = 0;
      process.stdout.write(`  [${suite.nombre}] ${s.id} ${s.titulo}... `);
      const fallan = (res) => Object.keys(b).filter((n) => b[n] === 'expected' && res && res[n] && res[n] !== 'expected' && res[n] !== 'skipped');
      const r = await ejecutarSuite(suite);
      const aplicado = estado.aplicado;
      let atrapadoPor = fallan(r);
      let inestables = [];

      // CONFIRMACION. Una prueba puede fallar una vez por razones ajenas al
      // sabotaje (un choque de datos, la maquina cargada). Contar ese fallo
      // como deteccion le daria a una prueba un merito que no tiene. Por eso
      // se repite la ejecucion con el mismo sabotaje: solo cuenta la prueba
      // que falla las dos veces. Un sabotaje es determinista; si la prueba lo
      // detecta de verdad, falla siempre.
      if (atrapadoPor.length) {
        const r2 = await ejecutarSuite(suite);
        const segunda = new Set(fallan(r2));
        inestables = atrapadoPor.filter((n) => !segunda.has(n));
        atrapadoPor = atrapadoPor.filter((n) => segunda.has(n));
      }

      const veredicto = atrapadoPor.length ? 'detectado' : aplicado === 0 ? 'no-ejercitado' : 'sobrevivio';
      resultados[clave].sabotajes[s.id] = { veredicto, atrapadoPor, inestables, aplicado };
      const nota = inestables.length ? ` · ${R.plural(inestables.length, 'falsa alarma descartada', 'falsas alarmas descartadas')}` : '';
      console.log((veredicto === 'detectado' ? `detectado por ${atrapadoPor.length} (confirmado)` : veredicto === 'no-ejercitado' ? 'no ejercitado' : `sobrevivió (aplicado ${aplicado} veces)`) + nota);
    }
    estado.activo = null;
  }
  return resultados;
}

/* ---------------------------------------------------------------------------
 * Reporte
 * ------------------------------------------------------------------------- */

/**
 * @param {Record<string, any>} resultados
 * @param {{clave:string, nombre:string, analisis?:any}[]} suites
 * @param {boolean} esEjemplo
 */
function reporte(resultados, suites, esEjemplo) {
  const validas = suites.filter((s) => resultados[s.clave]?.base && Object.keys(resultados[s.clave].base).length);
  const puntaje = (clave) => SABOTAJES.filter((s) => resultados[clave].sabotajes[s.id]?.veredicto === 'detectado').length;
  const secciones = [];

  const ref = validas.find((s) => s.clave === 'referencia');
  const otras = validas.filter((s) => s.clave !== 'referencia');
  const resumen = (ref ? `La suite del taller detectó <strong>${puntaje('referencia')} de ${SABOTAJES.length}</strong> sabotajes. ` : '')
    + (otras.length
      ? otras.map((s) => `${R.esc(s.nombre)}: <strong>${puntaje(s.clave)} de ${SABOTAJES.length}</strong>`).join('; ') + '. '
      : 'Guarde sus pruebas generadas en <code>ia/generadas/&lt;carpeta&gt;/</code> para compararlas. ')
    + 'Que una prueba pase no dice si protege: lo dice que falle cuando la aplicación está rota.';

  /* 1. Como funciona ------------------------------------------------------ */
  secciones.push({
    titulo: 'Qué se hizo',
    html: R.comoLeer(
      '<p>Cada suite se ejecutó <strong>siete veces</strong>: una con la aplicación intacta (la línea base) y seis con un defecto introducido a propósito. '
      + 'Un proxy entre las pruebas y la Registraduría alteró las respuestas, así que las pruebas no se modificaron en ningún momento.</p>'
      + '<p>Es la misma idea que las pruebas de mutación del taller de unitarias: <strong>una suite vale lo que detecta</strong>, no lo que pasa.</p>'
    ) + R.tabla('Los tres veredictos posibles', ['Veredicto', 'Qué significa', 'Qué hacer'], [
      [R.marca('si', 'Detectado'), 'Al menos una prueba que pasaba en la línea base falló con el sabotaje.', 'Nada: la suite protege esa regla.'],
      [R.marca('no', 'Sobrevivió'), 'El sabotaje sí actuó, pero ninguna prueba lo notó. Hay pruebas que pasan por ahí sin comprobar el resultado.', 'Revisar las aserciones: probablemente verifican que "algo apareció" y no qué apareció.'],
      [R.marca('aviso', 'No ejercitado'), 'Ninguna prueba pasó por esa parte de la aplicación. No es que se equivoquen: es que no existen.', 'Falta un caso de prueba completo.'],
    ]),
  });

  /* 2. Matriz --------------------------------------------------------------- */
  const celda = (clave, s) => {
    const v = resultados[clave].sabotajes[s.id];
    if (!v) return R.marca('neutro', 'Sin datos');
    const alarmas = v.inestables?.length ? `<br><small>${R.plural(v.inestables.length, 'falsa alarma descartada', 'falsas alarmas descartadas')}</small>` : '';
    if (v.veredicto === 'detectado') return R.marca('si', 'Detectado') + `<br><small>por ${R.plural(v.atrapadoPor.length, 'prueba', 'pruebas')}</small>` + alarmas;
    if (v.veredicto === 'sobrevivio') return R.marca('no', 'Sobrevivió') + `<br><small>el sabotaje actuó ${R.plural(v.aplicado, 'vez', 'veces')}</small>` + alarmas;
    return R.marca('aviso', 'No ejercitado') + alarmas;
  };
  let html = R.tabla('Resultado de cada sabotaje',
    ['Sabotaje', 'Capa', ...validas.map((s) => R.esc(s.nombre))],
    SABOTAJES.map((s) => [`<code>${s.id}</code> ${R.esc(s.titulo)}<br><small>${R.esc(s.detalle)}</small>`, R.esc(s.capa), ...validas.map((v) => celda(v.clave, s))]));
  html += R.tabla('Puntaje de sabotaje', ['Suite', 'Sabotajes detectados', 'Pruebas en la suite'],
    validas.map((s) => [R.esc(s.nombre), R.barra(puntaje(s.clave), SABOTAJES.length, 'Sabotajes detectados'), String(Object.keys(resultados[s.clave].base).length)]));
  html += R.comoLeer(
    '<p>Fíjese en <strong>S4</strong> y <strong>S6</strong>. S4 no se ve desde la interfaz, porque el navegador bloquea esas edades: solo lo detecta una prueba que llame a la API. '
    + 'S6 no cambia nada visible: solo lo detecta una prueba que compruebe la accesibilidad. Una suite E2E que solo usa la interfaz no detecta ninguno de los dos. '
    + 'La del taller detecta S4 porque su prueba 09 llama a la API a propósito, y no detecta S6 porque eso lo revisa el módulo 3, que no participa en este experimento.</p>'
    + '<p>Más pruebas no es mejor puntaje. Compare la columna "Pruebas en la suite" con los sabotajes detectados.</p>'
  );
  secciones.push({ titulo: 'Qué sabotajes detectó cada suite', html });

  /* 3. Quien atrapo cada sabotaje ----------------------------------------- */
  html = '';
  for (const suite of validas) {
    const filas = SABOTAJES.filter((s) => resultados[suite.clave].sabotajes[s.id]?.veredicto === 'detectado')
      .map((s) => [`<code>${s.id}</code> ${R.esc(s.titulo)}`, `<ul>${resultados[suite.clave].sabotajes[s.id].atrapadoPor.map((n) => `<li>${R.esc(n)}</li>`).join('')}</ul>`]);
    html += filas.length
      ? R.tabla(`${R.esc(suite.nombre)}: pruebas que fallaron con cada sabotaje`, ['Sabotaje', 'Pruebas que lo detectaron'], filas)
      : `<p>${R.esc(suite.nombre)}: ninguna prueba detectó un sabotaje.</p>`;
  }
  html += R.comoLeer('<p>Si una regla la detecta una sola prueba, esa prueba es valiosa: borrarla deja la regla sin protección. Si la detectan muchas, probablemente hay pruebas redundantes.</p>');
  secciones.push({ titulo: 'Qué prueba detectó cada sabotaje', html });

  /* 4. Linea base ----------------------------------------------------------- */
  html = '';
  for (const suite of validas) {
    const base = resultados[suite.clave].base;
    const rotas = Object.entries(base).filter(([, s]) => s !== 'expected');
    html += rotas.length
      ? R.alerta(`<p><strong>${R.esc(suite.nombre)}: ${R.plural(rotas.length, 'prueba falla', 'pruebas fallan')} sin ningún sabotaje.</strong> No se pudieron evaluar, porque ya fallaban antes de romper nada.</p><ul>${rotas.map(([n, s]) => `<li>${R.esc(n)} <small>(${R.esc(s)})</small></li>`).join('')}</ul>`)
      : `<p>${R.esc(suite.nombre)}: las ${Object.keys(base).length} pruebas pasan con la aplicación intacta.</p>`;
  }
  const sinResultados = suites.filter((s) => !validas.includes(s));
  if (sinResultados.length) {
    html += R.alerta(`<p><strong>Sin resultados:</strong> ${sinResultados.map((s) => R.esc(s.nombre)).join(', ')}. Playwright no pudo ejecutar esas pruebas: suele ser un error de sintaxis o un import equivocado. Ejecútelas a mano con <code>npx playwright test --config ia/playwright.ia.config.js --project ia</code> para ver el error.</p>`);
  }
  html += R.comoLeer('<p>Una prueba que falla con la aplicación correcta no está detectando nada: está rota. Es frecuente en código generado por IA, que suele inventar textos o selectores que la página no tiene.</p>');
  secciones.push({ titulo: 'Línea base: la aplicación sin sabotear', html });

  /* 4b. Falsas alarmas ------------------------------------------------------ */
  const filasAlarma = [];
  for (const suite of validas) {
    for (const s of SABOTAJES) {
      for (const n of resultados[suite.clave].sabotajes[s.id]?.inestables || []) {
        filasAlarma.push([R.esc(suite.nombre), `<code>${s.id}</code>`, R.esc(n)]);
      }
    }
  }
  html = R.comoLeer(
    '<p>Cada vez que una prueba falla con un sabotaje, el experimento <strong>repite la ejecución</strong> con el mismo sabotaje. '
    + 'Un sabotaje es determinista: si la prueba lo detecta de verdad, falla las dos veces. Si falla una vez y pasa la otra, '
    + 'el fallo no tenía que ver con el sabotaje y se descarta.</p>'
    + '<p>Sin esa repetición, una prueba inestable se llevaría el mérito de detectar un defecto que en realidad no ve. '
    + 'Es la misma razón por la que en integración continua una prueba inestable es peor que no tener prueba: produce alarmas en las que nadie confía.</p>'
  );
  html += filasAlarma.length
    ? R.tabla('Fallos que no se repitieron', ['Suite', 'Durante', 'Prueba'], filasAlarma)
      + '<p>Estas pruebas merecen revisión: fallan sin motivo. La causa más común es que dos pruebas usen el mismo dato (por ejemplo, el mismo número de documento) al ejecutarse en paralelo.</p>'
    : '<p>Ninguna prueba falló de forma intermitente en esta corrida.</p>';
  secciones.push({ titulo: 'Falsas alarmas descartadas', html });

  /* 5. Revision automatica del codigo ------------------------------------- */
  for (const suite of otras.filter((s) => s.analisis)) {
    const a = suite.analisis;
    const fila = (ok, nombre, valor, explicacion) => [nombre, ok ? R.marca('si', 'Bien') : R.marca('no', 'Revisar'), R.esc(valor), R.esc(explicacion)];
    html = R.tabla('Lista de revisión, aplicada automáticamente',
      ['Qué se revisa', 'Estado', 'Encontrado', 'Por qué importa'], [
        fila(!a.sinExpect.length, 'Pruebas sin aserciones', `${a.sinExpect.length} de ${a.pruebas}`, 'Una prueba sin expect solo verifica que el código no lanzó una excepción. Pasa siempre.'),
        fila(a.esperasFijas === 0, 'Esperas fijas', `${a.esperasFijas}`, 'waitForTimeout es lento cuando la app responde rápido e insuficiente cuando responde lento: la causa número uno de pruebas inestables.'),
        fila(a.cssXpath <= a.porRol, 'Localizadores frágiles', `${a.cssXpath} CSS/XPath frente a ${a.porRol} por rol o etiqueta`, 'Los localizadores por rol sobreviven a un rediseño y además comprueban que el elemento es accesible.'),
        fila(a.documentosFijos === 0, 'Documentos fijos', `${a.documentosFijos}`, 'Un número de documento escrito a mano funciona la primera vez; la segunda ya está inscrito y la prueba cambia de resultado sin que nada haya cambiado.'),
        fila(a.urlsFijas === 0, 'URL de la aplicación escrita a mano', `${a.urlsFijas}`, 'La prueba no se puede apuntar a otro entorno (staging, CI). Use rutas relativas: page.goto("/").'),
      ]);
    if (a.sinExpect.length) html += `<p><strong>Pruebas sin aserciones:</strong></p><ul>${a.sinExpect.map((n) => `<li>${R.esc(n)}</li>`).join('')}</ul>`;
    html += R.comoLeer('<p>Esta revisión busca patrones en el texto y puede equivocarse en los dos sentidos. Úsela como punto de partida para leer el código, no como veredicto.</p>');
    secciones.push({ titulo: `Revisión del código: ${suite.nombre}`, html });
  }

  secciones.push({
    titulo: 'Preguntas para la Wiki',
    html: `<ol class="preguntas">
      <li>¿Qué sabotaje sobrevivió en las pruebas generadas y fue detectado por la suite del taller? Abra las dos pruebas y compare sus aserciones: ¿qué comprueba una que la otra no?</li>
      <li>Si comparó el prompt ingenuo con el guiado: ¿cuántos sabotajes más detectó el guiado? ¿Qué regla del prompt produjo la diferencia?</li>
      <li>Distinga "sobrevivió" de "no ejercitado" en sus resultados. ¿Cuál de los dos problemas le preocupa más, y por qué?</li>
      <li>Claude Code pudo ejecutar sus pruebas y corregirlas hasta que pasaran; ChatGPT no. ¿Se nota esa diferencia en la línea base? ¿Y en los sabotajes detectados? Lo segundo es lo que importa.</li>
      <li>S6 no cambia nada visible. ¿Debería detectarlo una prueba E2E, o es trabajo del módulo 3? Defienda su postura.</li>
    </ol>`,
  });

  return R.pagina({ titulo: 'Sabotajes: ¿las pruebas detectan defectos?', experimento: 'Módulo 6 · Experimento E2', resumen, ejemplo: esEjemplo, secciones });
}

/* ---------------------------------------------------------------------------
 * Linea de comandos
 * ------------------------------------------------------------------------- */

/** Arma la lista de suites a evaluar. */
function descubrirSuites(conEjemplo) {
  const suites = [{ clave: 'referencia', proyecto: 'referencia', nombre: 'Suite del taller (a mano)' }];
  if (conEjemplo) {
    const dir = path.join(__dirname, 'ejemplos');
    suites.push({ clave: 'ejemplo', proyecto: 'ejemplo', nombre: 'Ejemplo con defectos típicos', analisis: analizarArchivos(dir) });
    return suites;
  }
  const raiz = path.join(__dirname, 'generadas');
  if (!fs.existsSync(raiz)) return suites;
  const tieneSpecs = (d) => fs.readdirSync(d, { recursive: true }).map(String).some((f) => /\.spec\.(js|ts)$/.test(f));
  const subcarpetas = fs.readdirSync(raiz, { withFileTypes: true })
    .filter((e) => e.isDirectory() && tieneSpecs(path.join(raiz, e.name)))
    .map((e) => e.name)
    .sort();
  if (subcarpetas.length) {
    const sueltos = fs.readdirSync(raiz).filter((f) => /\.spec\.(js|ts)$/.test(f));
    if (sueltos.length) console.log(`Aviso: ${R.plural(sueltos.length, 'archivo suelto', 'archivos sueltos')} en ia/generadas/ se ignoran; muévalos a una subcarpeta.`);
    for (const nombre of subcarpetas) {
      const dir = path.join(raiz, nombre);
      suites.push({ clave: `ia:${nombre}`, proyecto: 'ia', dir, nombre, analisis: analizarArchivos(dir) });
    }
  } else if (tieneSpecs(raiz)) {
    suites.push({ clave: 'ia', proyecto: 'ia', dir: raiz, nombre: 'Pruebas generadas por IA', analisis: analizarArchivos(raiz) });
  }
  return suites;
}

async function main() {
  const conEjemplo = process.argv.includes('--ejemplo');

  if (!fs.existsSync(JAR)) {
    throw new Error(`No existe el jar:\n  ${JAR}\nCompílelo primero:  cd registraduria && mvn -DskipTests clean package`);
  }
  const suites = descubrirSuites(conEjemplo);
  if (suites.length === 1) {
    console.log('No hay pruebas en ia/generadas/. Se evaluará solo la suite del taller.\n'
      + 'Guarde sus pruebas generadas en ia/generadas/<carpeta>/ (por ejemplo chatgpt-guiado/registro.spec.js),\n'
      + 'o use --ejemplo para ver el experimento con el archivo de muestra.\n');
  }

  const proxy = crearProxy();
  await new Promise((resolve, reject) => {
    proxy.once('error', (e) => reject(/** @type {any} */ (e).code === 'EADDRINUSE'
      ? new Error(`El puerto ${PUERTO_PROXY} está ocupado. ¿Dejó la Registraduría corriendo? Deténgala: el experimento necesita ese puerto para el proxy.`)
      : e));
    proxy.listen(PUERTO_PROXY, resolve);
  });

  let app;
  const limpiar = () => { try { app && app.kill(); } catch {} proxy.close(); };
  process.on('SIGINT', () => { limpiar(); process.exit(130); });

  try {
    console.log('Levantando la Registraduría en el puerto 8081 (con la base de datos vacía)...');
    app = await levantarAplicacion();
    for (const s of SABOTAJES.filter((x) => x.buscar)) {
      const fuente = await get(`http://localhost:${PUERTO_APP}${s.id === 'S5' ? '/app.js' : '/'}`);
      if (!fuente || !fuente.body.includes(s.buscar)) {
        throw new Error(`El sabotaje ${s.id} no encuentra el código que debe alterar ("${s.buscar}"). ¿Cambió la interfaz? Actualice ia/sabotaje.js: si no, ese sabotaje no haría nada y el reporte mentiría.`);
      }
    }
    const minutos = Math.ceil(suites.length * 1.2);
    console.log(`Ejecutando el experimento: ${suites.length} ${suites.length === 1 ? 'suite' : 'suites'} × 7 ejecuciones. Unos ${minutos} minutos.\n`);
    const resultados = await experimento(suites);
    const ruta = R.guardar('sabotaje', reporte(resultados, suites, conEjemplo));
    console.log(`\nReporte generado:\n  ${ruta}`);
  } finally {
    limpiar();
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(`\n${e instanceof Error ? e.message : e}\n`); process.exit(1); });
}

module.exports = { SABOTAJES, analizarArchivos, descubrirSuites };
