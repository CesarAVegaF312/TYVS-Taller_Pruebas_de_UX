# Prompt 02 — Generar pruebas E2E a partir de una historia de usuario

**Experimento:** E2 (las pruebas que escribe la IA, ¿detectan algo?)
**Herramientas:** ChatGPT y Claude Code
**Hay dos versiones del prompt**, y comparar sus resultados es la mitad del experimento.

---

## Antes de empezar: no le dé las pruebas del taller

Si Claude Code se abre dentro del repositorio, puede leer `modulo1-e2e.spec.js` y `modulo2-pom.spec.js` y copiarlos. Entonces el experimento mediría las pruebas del profesor, no las de la IA.

Prepare una carpeta aparte con lo mínimo:

```bash
cd playwright
npm run ia:preparar-generacion
```

La carpeta contiene:

| Archivo | Para qué |
|---|---|
| `historia.md` | la historia de usuario con sus criterios de aceptación |
| `index.html`, `app.js`, `estilos.css` | la interfaz, tal como la sirve la aplicación |
| `package.json`, `playwright.config.js` | para que Claude Code pueda **ejecutar** las pruebas que escribe |
| `tests/` | vacía: ahí van las pruebas generadas |

**ChatGPT y Claude Code reciben exactamente los mismos archivos.** La diferencia es que Claude Code puede ejecutar las pruebas y corregirlas, y ChatGPT no. Esa diferencia es una de las cosas que el experimento pone a prueba.

---

## Las dos versiones

### 02-A · Prompt ingenuo

Así escribe un prompt quien tiene prisa. Úselo tal cual, sin mejorarlo:

````text
Escribe pruebas automatizadas con Playwright para este formulario.
Te adjunto la historia de usuario, el HTML y el JavaScript.
````

### 02-B · Prompt guiado

Así lo escribe alguien que sabe qué hace útil a una prueba. Fíjese en que **no le dice a la IA qué pruebas escribir**: le dice qué propiedades deben tener.

````text
Actúa como ingeniero de pruebas con experiencia en Playwright Test (JavaScript).

Te adjunto una historia de usuario con sus criterios de aceptación, y el HTML
y el JavaScript de la interfaz. La aplicación corre en http://localhost:8080.

Escribe un archivo de pruebas E2E que cumpla estas reglas:

1. Cada criterio de aceptación tiene al menos una prueba que FALLARÍA si ese
   criterio dejara de cumplirse. Una prueba que pasa aunque la regla esté
   rota no sirve.
2. Si un criterio no se puede comprobar desde la interfaz, compruébalo por la
   vía que corresponda. No lo omitas en silencio.
3. Verifica el resultado exacto (el texto que ve la persona), no solo que
   "apareció algo".
4. Cada prueba es independiente: usa un número de documento distinto en cada
   ejecución, porque los documentos repetidos se rechazan.
5. Usa rutas relativas (page.goto('/')): la URL base viene de la
   configuración.
6. Localiza elementos por rol o por etiqueta (getByRole, getByLabel), no por
   CSS ni XPath.
7. Nunca uses esperas fijas (waitForTimeout). Las aserciones de Playwright ya
   esperan.
8. Importa desde '@playwright/test'. Un solo archivo, sin Page Objects.

Antes del código, lista en comentarios qué prueba cubre cada criterio.
Responde solo con el contenido del archivo .spec.js.
````

---

## Cómo usarlo

### En ChatGPT

1. Conversación **nueva** para cada versión (A y B).
2. Adjunte `historia.md`, `index.html` y `app.js` de la carpeta preparada.
3. Pegue el prompt. Copie el código que devuelve **sin corregirlo**, aunque vea errores: se evalúa lo que entregó la IA.

### En Claude Code

1. Levante la Registraduría (desde el repositorio):
   ```bash
   cd registraduria && java -jar target/registraduria-1.0-SNAPSHOT.jar
   ```
2. En otra terminal, **en la carpeta preparada**:
   ```bash
   npm install
   claude
   ```
3. Pegue el prompt y agregue al final: *"Guarda el archivo en tests/registro.spec.js y ejecútalo con npx playwright test hasta que pase."*
4. Cuando termine, **detenga la Registraduría**: el experimento necesita los puertos libres.

> Anote cuántas veces tuvo que corregir Claude Code sus propias pruebas antes de que pasaran. Es un dato para la reflexión: que una prueba pase después de varios intentos no significa que detecte algo.

---

## Dónde guardar lo que genere

Una carpeta por combinación, dentro del repositorio:

```text
playwright/ia/generadas/
├─ chatgpt-ingenuo/registro.spec.js
├─ chatgpt-guiado/registro.spec.js
├─ claude-code-ingenuo/registro.spec.js
└─ claude-code-guiado/registro.spec.js
```

Cada carpeta aparece como una columna en el reporte. Puede empezar con una sola.

---

## Evaluar

Con la Registraduría **detenida** y el jar compilado:

```bash
cd playwright
npm run ia:sabotaje
```

Tarda unos minutos: ejecuta cada carpeta siete veces (una normal y seis con un defecto introducido). El reporte queda en `playwright/ia/reportes/`.

---

## Errores típicos

| Síntoma | Causa |
|---|---|
| Las pruebas fallan en la "línea base" | La IA inventó textos o selectores que la página no tiene. Es un resultado, no un error del experimento: déjelo así. |
| `El puerto 8080 está ocupado` | La Registraduría sigue corriendo. Deténgala. |
| Todas las pruebas de ChatGPT fallan con `Cannot find module` | Importó desde `playwright` en vez de `@playwright/test`. Anótelo como hallazgo; si quiere evaluar el resto, corrija **solo** esa línea y dígalo en la Wiki. |
| Las pruebas pasan una vez y fallan la siguiente | Usan un documento fijo. La revisión automática del reporte lo señala. |
