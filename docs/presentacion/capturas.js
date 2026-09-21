// @ts-check
/**
 * Toma las capturas de la Registraduria que usa la presentacion.
 *
 *   node docs/presentacion/capturas.js          (desde la raiz del repo)
 *
 * Levanta el jar en el puerto 8080, captura y lo detiene. Hay que tener el jar
 * compilado y el puerto libre. Si cambia la interfaz, vuelva a ejecutarlo y
 * luego regenere la presentacion con construir.py: las capturas son reales,
 * no maquetas, y deben coincidir con lo que el estudiante ve.
 */
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require(path.join(__dirname, '..', '..', 'playwright', 'node_modules', '@playwright', 'test'));

const RAIZ = path.join(__dirname, '..', '..');
const JAR = path.join(RAIZ, 'registraduria', 'target', 'registraduria-1.0-SNAPSHOT.jar');
const IMG = path.join(__dirname, 'img');
const BASE = 'http://localhost:8080';

const salud = () => new Promise((r) => http.get(BASE + '/actuator/health', (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => r(d)); }).on('error', () => r('')));

(async () => {
  if ((await salud()).includes('UP')) throw new Error('Ya hay algo en el puerto 8080. Detengalo: las capturas necesitan una Registraduria recien iniciada.');
  const app = spawn('java', ['-jar', JAR], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 90 && !(await salud()).includes('UP'); i++) await new Promise((r) => setTimeout(r, 1000));
    const b = await chromium.launch();
    const ctx = await b.newContext({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();

    // 1. Formulario con un resultado de rechazo visible.
    await page.goto(BASE + '/');
    await page.getByLabel('Nombre completo').fill('Sara Gómez');
    await page.getByLabel('Número de documento').fill('1034567');
    await page.getByLabel('Edad').fill('17');
    await page.getByRole('button', { name: 'Registrar votante' }).click();
    await page.getByRole('heading', { name: 'Persona menor de edad' }).waitFor();
    await page.locator('#contenido').screenshot({ path: path.join(IMG, 'formulario-resultado.png') });

    // 2. Validacion del navegador: el servidor nunca recibe la peticion.
    await page.goto(BASE + '/');
    await page.getByLabel('Nombre completo').fill('Edad Imposible');
    await page.getByLabel('Número de documento').fill('-5');
    await page.getByLabel('Edad').fill('150');
    await page.getByRole('button', { name: 'Registrar votante' }).click();
    await page.getByText('La edad debe estar entre 0 y 120.').waitFor();
    await page.locator('#form-registro').screenshot({ path: path.join(IMG, 'formulario-validacion.png') });

    // 3. La pagina con defectos sembrados del modulo 3B.
    await page.goto(BASE + '/defectuosa.html');
    await page.screenshot({ path: path.join(IMG, 'defectuosa.png'), clip: { x: 0, y: 0, width: 760, height: 900 } });

    // 4. Cabecera y formulario vacio, para la portada.
    await page.goto(BASE + '/');
    await page.screenshot({ path: path.join(IMG, 'portada.png'), clip: { x: 0, y: 0, width: 760, height: 820 } });

    await b.close();
    console.log('Capturas en ' + IMG);
  } finally {
    app.kill();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
