// @ts-check
const { expect } = require('@playwright/test');

/**
 * PAGE OBJECT MODEL de la pagina de inscripcion.
 *
 * La idea: la prueba habla el lenguaje del NEGOCIO ("inscribir un votante"),
 * y esta clase traduce eso a interacciones con el navegador.
 *
 * El beneficio real aparece cuando la interfaz cambia. Si el boton cambia de
 * texto, se corrige AQUI, en un solo lugar, y las 8 pruebas que lo usan
 * siguen funcionando sin tocarse. Sin POM habria que editar 8 archivos.
 */
class RegistroPage {

  constructor(page) {
    this.page = page;

    // Localizadores por ROL y texto visible: sobreviven a un rediseño y de
    // paso comprueban que el elemento es accesible.
    this.nombre = page.getByLabel('Nombre completo');
    this.documento = page.getByLabel('Número de documento');
    this.edad = page.getByLabel('Edad');
    this.genero = page.getByLabel('Género');
    this.vivo = page.getByLabel('La persona está viva');
    this.botonRegistrar = page.getByRole('button', { name: 'Registrar votante' });
    this.resultado = page.getByRole('status');
  }

  async abrir() {
    await this.page.goto('/');
  }

  /**
   * Inscribe a una persona. Los campos no indicados usan valores por defecto
   * razonables, para que cada prueba solo declare lo que le importa.
   */
  async inscribir({ nombre = 'Persona Prueba', documento, edad = 30, genero = 'FEMALE', vivo = true }) {
    await this.nombre.fill(nombre);
    await this.documento.fill(String(documento));
    await this.edad.fill(String(edad));
    await this.genero.selectOption(genero);
    if (vivo) {
      await this.vivo.check();
    } else {
      await this.vivo.uncheck();
    }
    await this.botonRegistrar.click();
  }

  /** Verifica el titulo del mensaje de resultado. */
  async esperarResultado(titulo) {
    await expect(this.page.getByRole('heading', { name: titulo })).toBeVisible();
  }

  /** Genera un documento distinto en cada llamada. */
  static documentoUnico() {
    return Math.floor(Math.random() * 900000) + 100000;
  }
}

module.exports = { RegistroPage };
