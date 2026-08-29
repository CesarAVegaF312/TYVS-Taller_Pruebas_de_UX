// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/**
 * MÓDULO 3 — Accesibilidad automatizada (WCAG con axe)
 *
 * Aquí empieza de verdad la parte de UX del taller.
 *
 * Los módulos 1 y 2 verifican que la interfaz FUNCIONE. Este verifica que
 * se pueda USAR: por alguien que navega con teclado, con lector de pantalla,
 * con baja visión o con daltonismo.
 *
 * Contexto de industria: la accesibilidad dejó de ser opcional. El European
 * Accessibility Act es exigible desde junio de 2025, y en Estados Unidos la
 * ADA genera litigio constante sobre sitios web.
 *
 * ⚠️ LÍMITE IMPORTANTE, y es lo más valioso de este módulo:
 * axe detecta de forma fiable alrededor del 40% de los problemas WCAG. Son
 * los mecánicos: contraste insuficiente, imágenes sin texto alternativo,
 * botones y enlaces sin nombre accesible.
 *
 * El resto exige juicio humano y NINGUNA herramienta lo automatiza:
 * ¿el texto alternativo describe la imagen o solo dice "imagen"? ¿el orden
 * de tabulación sigue el orden lógico de la tarea? ¿el mensaje de error
 * explica cómo corregir el problema?
 *
 * Una suite de axe en verde NO significa "el sitio es accesible".
 * Significa "no tiene los errores que una máquina puede detectar sola".
 *
 * Todo esto suena a advertencia genérica hasta que se mide. Eso hace el
 * módulo 3B (modulo3b-defectos-sembrados.spec.js): audita una página con 17
 * defectos deliberados y comprueba cuáles encuentra axe y cuáles no.
 */

test.describe('Módulo 3 — Accesibilidad (WCAG 2.1 AA)', () => {

  test('01 - La página inicial no tiene violaciones detectables', async ({ page }) => {
    await page.goto('/');

    const resultados = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Si falla, el mensaje muestra la regla, el impacto y el selector exacto.
    expect(
      resultados.violations,
      formatearViolaciones(resultados.violations)
    ).toEqual([]);
  });

  test('02 - La página con errores de validación sigue siendo accesible', async ({ page }) => {
    // Los estados de error son el punto ciego clásico: se audita la página
    // "feliz" y se olvida cómo queda cuando algo sale mal.
    await page.goto('/');
    await page.getByLabel('Número de documento').fill('-5');
    await page.getByRole('button', { name: 'Registrar votante' }).click();
    await expect(page.getByText('El documento debe ser un número mayor que cero.')).toBeVisible();

    const resultados = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(
      resultados.violations,
      formatearViolaciones(resultados.violations)
    ).toEqual([]);
  });

  test('03 - El resultado de la inscripción se anuncia a lectores de pantalla', async ({ page }) => {
    await page.goto('/');
    const documento = (Date.now() % 1000000) + 7;

    await page.getByLabel('Nombre completo').fill('Ana Accesible');
    await page.getByLabel('Número de documento').fill(String(documento));
    await page.getByLabel('Edad').fill('30');
    await page.getByRole('button', { name: 'Registrar votante' }).click();

    // role="status" con aria-live="polite" hace que el lector de pantalla
    // lea el resultado sin que la persona tenga que ir a buscarlo.
    // Sin esto, alguien que no ve la pantalla no se entera de que pasó algo.
    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Inscripción exitosa');
  });

  test('04 - Existe un enlace para saltar al contenido principal', async ({ page }) => {
    // WCAG 2.4.1: quien navega con teclado no debería tener que tabular por
    // toda la cabecera en cada página. El enlace está oculto hasta recibir foco.
    await page.goto('/');
    await page.keyboard.press('Tab');

    const salto = page.getByRole('link', { name: 'Saltar al contenido principal' });
    await expect(salto).toBeFocused();
  });

  test('05 - Todos los campos tienen etiqueta asociada', async ({ page }) => {
    await page.goto('/');

    // Un input sin <label for> es invisible para un lector de pantalla:
    // se anuncia como "cuadro de edición", sin decir de qué.
    const camposSinEtiqueta = await page.evaluate(() => {
      const campos = Array.from(document.querySelectorAll('input, select, textarea'));
      return campos
        .filter((c) => {
          const tieneLabel = document.querySelector(`label[for="${c.id}"]`);
          const tieneAria = c.getAttribute('aria-label') || c.getAttribute('aria-labelledby');
          return !tieneLabel && !tieneAria;
        })
        .map((c) => c.outerHTML.slice(0, 80));
    });

    expect(camposSinEtiqueta).toEqual([]);
  });
});

/** Convierte las violaciones de axe en un mensaje legible al fallar. */
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
