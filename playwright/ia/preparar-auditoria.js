// @ts-check
/**
 * MODULO 6 — Prepara la pagina para que una IA la audite SIN hacer trampa.
 *
 * defectuosa.html explica cada defecto en comentarios ([A-1] html-has-lang...).
 * Si esa pagina se le pasa tal cual a ChatGPT, o si Claude Code se abre dentro
 * de este repositorio, la IA no ENCUENTRA los defectos: los LEE. El resultado
 * del experimento no mediria nada.
 *
 * Es el mismo error que evaluar un modelo con datos que ya vio durante el
 * entrenamiento, y es mas facil de cometer de lo que parece: el modulo 3B, que
 * lista los tres grupos de defectos, tambien vive en este repositorio.
 *
 * Este script:
 *   1. copia defectuosa.html quitando TODOS los comentarios (HTML, CSS y JS),
 *   2. copia logo.svg para que la pagina se vea igual,
 *   3. deja ambos en una carpeta FUERA del repositorio.
 *
 * Uso (desde playwright/):
 *   npm run ia:preparar                 -> carpeta temporal del sistema
 *   npm run ia:preparar -- <carpeta>    -> la carpeta que usted indique
 *
 * La carpeta de destino no puede estar dentro de este repositorio: el script
 * se niega, porque ahi Claude Code volveria a tener acceso a las respuestas.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ_REPO = path.resolve(__dirname, '..', '..');
const ESTATICOS = path.join(RAIZ_REPO, 'registraduria', 'src', 'main', 'resources', 'static');

const destino = process.argv[2]
  ? path.resolve(process.env.INIT_CWD || process.cwd(), process.argv[2])
  : path.join(os.tmpdir(), 'tyvs-auditoria-ia');

const relativo = path.relative(RAIZ_REPO, destino);
if (!relativo.startsWith('..') && !path.isAbsolute(relativo)) {
  console.error(
    `\nEl destino ${destino}\nesta DENTRO del repositorio del taller.\n\n` +
    'Ahi Claude Code puede leer defectuosa.html con sus comentarios y el\n' +
    'spec del modulo 3B, que contienen las respuestas. Elija una carpeta\n' +
    'fuera del repositorio.\n'
  );
  process.exit(1);
}

/** Quita comentarios HTML, los de CSS dentro de <style> y los de linea de JS dentro de <script>. */
function sinComentarios(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g,
      (_, abre, css, cierra) => abre + css.replace(/\/\*[\s\S]*?\*\//g, '') + cierra)
    // Solo comentarios que ocupan la linea completa: un // a mitad de linea
    // podria ser parte de una URL dentro de un string.
    .replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/g,
      (_, abre, js, cierra) => abre + js.replace(/^[ \t]*\/\/.*$/gm, '') + cierra)
    // Las lineas que quedaron vacias al quitar comentarios.
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimStart();
}

const original = fs.readFileSync(path.join(ESTATICOS, 'defectuosa.html'), 'utf8');
const limpio = sinComentarios(original);

// Comprobacion defensiva: si queda alguna marca de las respuestas, no se entrega nada.
const pistas = limpio.match(/\[[ABC]-\d\]|<!--|\/\*|GRUPO [ABC]|WCAG|\baxe\b/g);
if (pistas) {
  console.error('Quedaron pistas en la copia, no se genera: ' + [...new Set(pistas)].join(', '));
  process.exit(1);
}

fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'pagina.html'), limpio, 'utf8');
fs.copyFileSync(path.join(ESTATICOS, 'logo.svg'), path.join(destino, 'logo.svg'));

console.log(`
Listo. Carpeta para la auditoria con IA:

  ${destino}

  pagina.html  la pagina, sin comentarios
  logo.svg     la imagen que usa

- ChatGPT: adjunte o pegue pagina.html junto con el prompt 01.
- Claude Code: abra una terminal EN ESA CARPETA (no en el repositorio) y
  ejecute claude ahi. Si lo abre en el repositorio, puede leer las respuestas.
`);
