// @ts-check
/**
 * MODULO 6 — Prepara una carpeta para que una IA genere pruebas E2E (prompt 02).
 *
 * Por que una carpeta aparte: si Claude Code se abre dentro del repositorio
 * puede leer modulo1-e2e.spec.js y modulo2-pom.spec.js y copiarlos. El
 * experimento E2 mediria entonces las pruebas del profesor.
 *
 * La carpeta contiene lo que tendria un equipo real al empezar: la historia de
 * usuario y la interfaz. Nada de pruebas existentes, nada de README del taller.
 *
 * ChatGPT y Claude Code reciben EXACTAMENTE los mismos archivos. La unica
 * diferencia es que Claude Code puede ejecutar las pruebas (por eso hay un
 * package.json y una configuracion de Playwright).
 *
 * Uso (desde playwright/):
 *   npm run ia:preparar-generacion                 -> carpeta temporal del sistema
 *   npm run ia:preparar-generacion -- <carpeta>    -> la carpeta que usted indique
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ_REPO = path.resolve(__dirname, '..', '..');
const ESTATICOS = path.join(RAIZ_REPO, 'registraduria', 'src', 'main', 'resources', 'static');
const destino = process.argv[2]
  ? path.resolve(process.env.INIT_CWD || process.cwd(), process.argv[2])
  : path.join(os.tmpdir(), 'tyvs-generacion-ia');

const relativo = path.relative(RAIZ_REPO, destino);
if (!relativo.startsWith('..') && !path.isAbsolute(relativo)) {
  console.error(
    `\nEl destino ${destino}\nesta DENTRO del repositorio del taller.\n\n` +
    'Ahi Claude Code puede leer las pruebas de los modulos 1 y 2 y copiarlas.\n' +
    'Elija una carpeta fuera del repositorio.\n'
  );
  process.exit(1);
}

// La misma version de Playwright que usa el taller: las pruebas generadas se
// evaluan luego con esa version, y no conviene que cambie el comportamiento.
let version = '^1.49.1';
try {
  version = require(path.join(__dirname, '..', 'node_modules', '@playwright', 'test', 'package.json')).version;
} catch {
  try { version = require(path.join(__dirname, '..', 'package.json')).devDependencies['@playwright/test']; } catch {}
}

const HISTORIA = `# Historia de usuario: inscripción de votantes

**Como** funcionario de la Registraduría,
**quiero** inscribir votantes mediante un formulario web,
**para que** solo las personas habilitadas queden registradas para votar.

La aplicación corre en \`http://localhost:8080\`. El formulario envía los datos
al servicio \`POST /register\`, que responde con un texto indicando el resultado.

## Criterios de aceptación

1. Una persona **viva**, de **18 años o más** y con un **documento que no esté
   inscrito** queda inscrita. La pantalla muestra **"Inscripción exitosa"**.

2. Una persona **menor de 18 años** no queda inscrita. La pantalla muestra
   **"Persona menor de edad"**.

3. Una persona **que no está viva** no queda inscrita. La pantalla muestra
   **"Persona no viva"**.

4. Un **documento que ya está inscrito** no se puede inscribir de nuevo. La
   pantalla muestra **"Documento ya inscrito"**.

5. El formulario **no envía** datos con formato inválido, y lo indica junto al
   campo:
   - documento que no sea un número mayor que cero:
     **"El documento debe ser un número mayor que cero."**
   - edad fuera del rango de 0 a 120: **"La edad debe estar entre 0 y 120."**

6. El resultado de la inscripción **se anuncia a quien usa lector de
   pantalla**, sin que tenga que ir a buscarlo.

7. El sistema **nunca inscribe una edad imposible** (menor que 0 o mayor que
   120), **ni siquiera si la petición llega directamente al servicio** sin pasar
   por el formulario. En ese caso el servicio responde \`INVALID_AGE\`.
`;

const CONFIG = `// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// La aplicacion debe estar corriendo en http://localhost:8080 antes de ejecutar
// las pruebas. Esta configuracion no la levanta.
module.exports = defineConfig({
  testDir: './tests',
  retries: 0,
  use: { baseURL: 'http://localhost:8080', ...devices['Desktop Chrome'] },
});
`;

const PAQUETE = {
  name: 'generacion-pruebas-ia',
  private: true,
  scripts: { test: 'playwright test' },
  devDependencies: { '@playwright/test': version },
};

fs.mkdirSync(path.join(destino, 'tests'), { recursive: true });
const pruebasExistentes = fs.readdirSync(path.join(destino, 'tests')).filter((f) => /\.spec\.(js|ts)$/.test(f));

for (const archivo of ['index.html', 'app.js', 'estilos.css']) {
  fs.copyFileSync(path.join(ESTATICOS, archivo), path.join(destino, archivo));
}
fs.writeFileSync(path.join(destino, 'historia.md'), HISTORIA, 'utf8');
fs.writeFileSync(path.join(destino, 'playwright.config.js'), CONFIG, 'utf8');
fs.writeFileSync(path.join(destino, 'package.json'), JSON.stringify(PAQUETE, null, 2) + '\n', 'utf8');

console.log(`
Listo. Carpeta para generar pruebas con IA:

  ${destino}

  historia.md             la historia de usuario y sus 7 criterios
  index.html, app.js,     la interfaz (lo que se adjunta a ChatGPT)
  estilos.css
  package.json,           para que Claude Code pueda ejecutar las pruebas
  playwright.config.js    (Playwright ${version})
  tests/                  donde van las pruebas generadas
${pruebasExistentes.length ? `\nAviso: tests/ ya tenia ${pruebasExistentes.length} archivo(s). No se borraron.\n` : ''}
Siguiente paso: docs/prompts/02-generar-pruebas-e2e.md
`);
