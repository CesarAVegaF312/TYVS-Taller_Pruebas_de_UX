// @ts-check
/**
 * EJEMPLO FICTICIO — escrito a mano, NO generado por ninguna IA.
 *
 * Imita los defectos que aparecen con frecuencia en pruebas generadas
 * automaticamente, para que el experimento E2 tenga algo que mostrar antes de
 * que usted genere las suyas:
 *
 *   - una prueba sin aserciones
 *   - una espera fija (waitForTimeout)
 *   - localizadores CSS en vez de por rol
 *   - un numero de documento escrito a mano
 *   - la URL de la aplicacion escrita a mano
 *   - una asercion que comprueba que "algo aparecio", no que aparecio
 *
 * Todas pasan con la aplicacion intacta. Ejecute
 *   npm run ia:sabotaje -- --ejemplo
 * y mire cuantos defectos detectan de verdad.
 *
 * NO copie este archivo como modelo. Para eso estan modulo1 y modulo2.
 */
const { test, expect } = require('@playwright/test');

test.describe('Inscripción de votantes (ejemplo con defectos típicos)', () => {

  test('inscribe a una persona válida', async ({ page }) => {
    await page.goto('http://localhost:8080/');
    await page.locator('#nombre').fill('Ana Pérez');
    await page.locator('#documento').fill(String(Date.now() % 1000000 + 100));
    await page.locator('#edad').fill('30');
    await page.locator('#btn-registrar').click();
    await page.waitForTimeout(1000);
    // Comprueba que el recuadro aparece, no qué dice.
    await expect(page.locator('#resultado')).toBeVisible();
  });

  test('rechaza a un menor de edad', async ({ page }) => {
    await page.goto('/');
    await page.locator('#nombre').fill('Luis Gómez');
    await page.locator('#documento').fill(String(Date.now() % 1000000 + 200));
    await page.locator('#edad').fill('17');
    await page.locator('#btn-registrar').click();
    await expect(page.locator('#resultado-titulo')).toHaveText('Persona menor de edad');
  });

  test('rechaza un documento repetido', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 2; i++) {
      await page.locator('#nombre').fill('Marta Ruiz');
      await page.locator('#documento').fill('123456');
      await page.locator('#edad').fill('40');
      await page.locator('#btn-registrar').click();
    }
    await expect(page.locator('#resultado-titulo')).toHaveText('Documento ya inscrito');
  });

  test('muestra error con documento negativo', async ({ page }) => {
    await page.goto('/');
    await page.locator('#nombre').fill('Error Esperado');
    await page.locator('#documento').fill('-5');
    await page.locator('#edad').fill('30');
    await page.locator('#btn-registrar').click();
    await expect(page.locator('#error-documento')).toBeVisible();
  });

  test('el formulario se puede enviar', async ({ page }) => {
    await page.goto('/');
    await page.locator('#nombre').fill('Sin Aserciones');
    await page.locator('#documento').fill(String(Date.now() % 1000000 + 300));
    await page.locator('#edad').fill('25');
    await page.locator('#btn-registrar').click();
  });
});
