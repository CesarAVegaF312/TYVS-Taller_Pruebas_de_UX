// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/**
 * MÓDULO 3B — Ver a la herramienta fallar (defectos sembrados)
 *
 * El módulo 3 audita index.html y sale verde. Eso está bien como resultado y
 * es pésimo como aprendizaje: usted nunca ve un reporte de axe con violaciones
 * dentro, nunca lee un helpUrl, y se queda con la idea de que "verde = listo".
 *
 * defectuosa.html es la misma pantalla con 16 defectos puestos a mano. Este
 * módulo demuestra tres cosas, en orden de importancia creciente:
 *
 *   1. axe encuentra defectos reales y dice exactamente dónde están.
 *   2. Lo que axe le reporta depende de CÓMO lo configuró usted. Cuatro de
 *      los defectos desaparecen del informe solo por filtrar `.withTags()`.
 *   3. Siete defectos no los encuentra nunca, por muy bien que lo configure.
 *
 * El punto 2 suele ser el que sorprende. La mayoría de los tutoriales copian
 * `.withTags(['wcag2a','wcag2aa',...])` sin explicar que ese filtro silencia
 * la categoría "best-practice" de axe, donde viven cosas nada menores como el
 * orden de encabezados o los tabindex positivos.
 *
 * NOTA SOBRE MANTENIMIENTO: las listas de abajo se obtuvieron EJECUTANDO axe
 * sobre la página, no leyendo la documentación. Si actualiza
 * @axe-core/playwright y alguna regla cambia de categoría o de nombre, estas
 * pruebas fallan y le dicen qué se movió. Eso es intencional: es la forma de
 * enterarse en vez de que el material envejezca en silencio.
 */

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** GRUPO A — axe las reporta CON el filtro de etiquetas WCAG. */
const GRUPO_A = [
  'button-name',    // botón de ayuda sin nombre accesible
  'color-contrast', // texto de ayuda y pie de página bajo 4.5:1
  'html-has-lang',  // <html> sin lang
  'image-alt',      // <img> sin alt
  'link-name',      // enlace sin texto discernible
  'select-name',    // <select> sin etiqueta
];

/** GRUPO B — axe las reporta SOLO al quitar el filtro (son best-practice). */
const GRUPO_B = [
  'heading-order',     // salto de h1 a h4
  'landmark-one-main', // no hay <main>
  'region',            // contenido fuera de landmarks
  'tabindex',          // tabindex positivos que rompen el orden de foco
];

test.describe('Módulo 3B — La herramienta encontrando defectos', () => {

  test('01 - Con el filtro WCAG, axe reporta exactamente el grupo A', async ({ page }) => {
    await page.goto('/defectuosa.html');

    const resultados = await new AxeBuilder({ page })
      .withTags(ETIQUETAS_WCAG)
      .analyze();

    const reglas = reglasDe(resultados);

    // Lea el detalle en la consola: es el reporte que tendría que interpretar
    // en un proyecto real.
    console.log(formatearViolaciones(resultados.violations));

    expect(reglas, 'Las reglas WCAG detectadas cambiaron respecto a lo medido').toEqual(GRUPO_A);
  });

  test('02 - Sin el filtro, aparecen cuatro reglas más: el filtro decide lo que usted ve', async ({ page }) => {
    await page.goto('/defectuosa.html');

    // Exactamente la misma página, exactamente los mismos defectos.
    // Lo único que cambia es que no llamamos a .withTags().
    const resultados = await new AxeBuilder({ page }).analyze();
    const reglas = reglasDe(resultados);

    const esperadas = [...GRUPO_A, ...GRUPO_B].sort();
    expect(reglas).toEqual(esperadas);

    // La moraleja, dicha como aserción: copiar el .withTags() de un tutorial
    // sin entenderlo le esconde defectos que sí existen.
    const ocultasPorElFiltro = reglas.filter((r) => !GRUPO_A.includes(r));
    expect(ocultasPorElFiltro).toEqual(GRUPO_B);
  });

  test('03 - La misma auditoría sobre la página correcta no reporta nada', async ({ page }) => {
    // El control del experimento. Sin esta prueba, un cero en el módulo 3
    // podría significar "la página está bien" o "axe no se ejecutó".
    // Aquí sabemos que axe funciona, porque acaba de encontrar diez reglas.
    await page.goto('/');

    const resultados = await new AxeBuilder({ page }).analyze();

    expect(reglasDe(resultados), formatearViolaciones(resultados.violations)).toEqual([]);
  });

  test('04 - GRUPO C: axe aprueba un placeholder usado como etiqueta; una comprobación propia no', async ({ page }) => {
    await page.goto('/defectuosa.html');

    // El campo "nombre" no tiene <label>: solo un placeholder, que desaparece
    // al escribir. Para axe está bien, porque el placeholder cuenta como
    // nombre accesible.
    const resultados = await new AxeBuilder({ page }).analyze();

    // De TODO lo que axe podría decir sobre este input, lo único que dice es
    // que tiene un tabindex positivo. Ni una palabra sobre la etiqueta que
    // falta: ni `label`, ni `label-title-only`, ni `form-field-multiple-labels`.
    const reglasQueSenalanElCampo = resultados.violations
      .filter((v) => v.nodes.some((n) => n.target.includes('#d-nombre')))
      .map((v) => v.id)
      .sort();

    expect(
      reglasQueSenalanElCampo,
      'Si aquí aparece una regla de etiquetado, axe mejoró: actualice el material'
    ).toEqual(['tabindex']);

    // Y sin embargo el navegador confirma que la única fuente del nombre es
    // el placeholder:
    await expect(page.locator('#d-nombre')).toHaveAccessibleName('Nombre completo');
    expect(await page.locator('#d-nombre').getAttribute('placeholder')).toBe('Nombre completo');

    // La comprobación escrita a mano (la misma del módulo 3, prueba 05) sí lo
    // encuentra. Esto es lo que justifica escribir aserciones propias además
    // de pasar la herramienta.
    const sinEtiquetaAsociada = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, textarea'))
        .filter((c) => {
          const tieneLabelFor = document.querySelector(`label[for="${c.id}"]`);
          const tieneAria = c.getAttribute('aria-label') || c.getAttribute('aria-labelledby');
          return !tieneLabelFor && !tieneAria;
        })
        .map((c) => '#' + c.id);
    });

    expect(sinEtiquetaAsociada).toContain('#d-nombre');
    expect(sinEtiquetaAsociada).toContain('#d-genero');
  });

  test('05 - GRUPO C: el resultado no se anuncia a lectores de pantalla', async ({ page }) => {
    await page.goto('/defectuosa.html');

    await page.locator('#d-nombre').fill('Ana Invisible');
    await page.locator('#d-documento').fill(String((Date.now() % 900000) + 100000));
    await page.locator('#d-edad').fill('30');
    await page.locator('#d-btn-registrar').click();

    // El texto aparece en pantalla...
    await expect(page.locator('#resultado-titulo')).toHaveText('Inscripción exitosa');

    // ...pero no hay ninguna región en vivo, así que un lector de pantalla no
    // dice nada. La persona se queda esperando sin saber que ya pasó algo.
    //
    // Se consulta con locator() y no con getByRole(): getByRole ignora los
    // elementos ocultos, y en index.html la región de resultado nace con el
    // atributo hidden. Con getByRole las dos páginas darían cero y la prueba
    // pasaría por el motivo equivocado.
    await expect(page.locator('[role="status"]')).toHaveCount(0);
    await expect(page.locator('[aria-live]')).toHaveCount(0);

    // En index.html el mismo contenedor sí está anunciado. Ese es el contraste.
    await page.goto('/');
    await expect(page.locator('[role="status"][aria-live="polite"]')).toHaveCount(1);
  });

  test('06 - GRUPO C: el mensaje de error no dice cómo corregir el problema', async ({ page }) => {
    await page.goto('/defectuosa.html');

    await page.locator('#d-documento').fill('-5');
    await page.locator('#d-btn-registrar').click();

    // WCAG 3.3.3 pide una sugerencia de corrección. "Error." cumple con
    // "existe un mensaje" y con nada más. Ninguna herramienta juzga esto:
    // hace falta alguien que lea la frase y se pregunte "¿y ahora qué hago?".
    await expect(page.locator('#d-error')).toHaveText('Error.');

    // La página correcta sí explica qué se espera.
    await page.goto('/');
    await page.getByLabel('Número de documento').fill('-5');
    await page.getByRole('button', { name: 'Registrar votante' }).click();
    await expect(page.locator('#error-documento'))
      .toHaveText('El documento debe ser un número mayor que cero.');
  });
});

/** Ids de regla violados, sin repetir y ordenados: comparables entre corridas. */
function reglasDe(resultados) {
  return [...new Set(resultados.violations.map((v) => v.id))].sort();
}

/** Convierte las violaciones de axe en un mensaje legible. */
function formatearViolaciones(violaciones) {
  if (!violaciones.length) return 'Sin violaciones';
  return (
    '\n' +
    violaciones
      .map((v) => {
        const nodos = v.nodes.map((n) => '      ' + n.target.join(' ')).join('\n');
        return `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n${nodos}`;
      })
      .join('\n\n')
  );
}
