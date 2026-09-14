# Guía de Playwright

## Instalación

```bash
cd playwright
npm install
npx playwright install chromium
```

`npm install` baja la librería; `playwright install` baja el **navegador**. Son dos cosas distintas y hacen falta las dos.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta todas las pruebas en modo headless |
| `npm run test:ui` | Abre el modo interactivo: ideal para depurar |
| `npm run test:headed` | Ejecuta con el navegador visible |
| `npm run test:e2e` | Solo los módulos 1 y 2 |
| `npm run test:a11y` | Solo la auditoría de accesibilidad |
| `npm run test:visual` | Solo la regresión visual |
| `npm run visual:update` | Regenera las capturas de referencia |
| `npm run report` | Abre el último reporte HTML |

## El bloque `webServer`

```js
webServer: {
  command: 'java -jar ../registraduria/target/registraduria-1.0-SNAPSHOT.jar',
  url: 'http://localhost:8080/actuator/health',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
}
```

Playwright levanta la Registraduría antes de las pruebas y la apaga al terminar. `reuseExistingServer` hace que, si usted ya la tiene corriendo, no intente arrancar otra: en local reutiliza, en CI siempre arranca una limpia.

Ojo: `url` apunta a `/actuator/health`, no a `/`. Playwright espera a que esa URL responda, que es la forma correcta de saber que el servicio está listo. Un `timeout` fijo sería una apuesta.

## Localizadores

Orden de preferencia:

1. **`getByRole`** — `getByRole('button', { name: 'Registrar votante' })`. El más robusto, y de paso comprueba que el elemento es accesible.
2. **`getByLabel`** — `getByLabel('Edad')`. Para campos de formulario.
3. **`getByText`** — para contenido no interactivo.
4. **`getByTestId`** — cuando no hay nada semántico a lo que agarrarse.
5. **CSS / XPath** — último recurso.

```js
// Bien: sobrevive a un rediseño
page.getByRole('button', { name: 'Registrar votante' })

// Mal: se rompe con el primer cambio de estilos
page.locator('.btn.btn-primary.mt-3')

// Peor: se rompe si alguien inserta un div
page.locator('/html/body/div[2]/form/button')
```

## Esperas

**No hay ninguna espera fija en este taller, y no debe haberla en su entrega.**

Playwright reintenta cada aserción hasta que se cumple o expira el tiempo. Esto:

```js
await expect(page.getByRole('heading', { name: 'Inscripción exitosa' })).toBeVisible();
```

espera automáticamente a que el elemento aparezca. Un `page.waitForTimeout(3000)` es una apuesta: lento cuando la aplicación responde rápido, insuficiente cuando responde lento. Es la causa número uno de pruebas inestables.

## Depurar una prueba que falla

```bash
npm run test:ui                          # modo interactivo, paso a paso
npx playwright test --debug              # con el inspector
npx playwright show-trace test-results/.../trace.zip
```

La configuración guarda traza, captura y video **solo cuando algo falla** (`trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`). En CI eso es lo que permite diagnosticar sin reproducir localmente.

## Accesibilidad con axe

```js
const AxeBuilder = require('@axe-core/playwright').default;

const resultados = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();

expect(resultados.violations).toEqual([]);
```

`withTags` acota la auditoría a los criterios de nivel A y AA de WCAG 2.0 y 2.1. Sin ese filtro, axe incluye reglas de buenas prácticas que no son requisitos formales y el resultado se vuelve ruidoso.

Recuerde el límite: **axe detecta cerca del 40% de los problemas WCAG**. Verde no es sinónimo de accesible.
