// @ts-check
/**
 * MODULO 6 — Oraculo de la Registraduria.
 *
 * Dado un caso de prueba (que datos se envian y por que via), calcula que
 * resultado produce REALMENTE la aplicacion. Sirve para evaluar planes de
 * prueba escritos por una IA (experimento E3): si el plan dice que un caso
 * espera X y el oraculo dice Y, la IA se equivoco sobre como funciona el
 * sistema.
 *
 * IMPORTANTE: este archivo no es una especificacion, es una descripcion de lo
 * que la aplicacion HACE, y se verifico ejecutando cada combinacion contra la
 * aplicacion real (por la API y por el navegador). Si cambia Registry.java o
 * app.js, hay que volver a verificarlo.
 *
 * El detalle que lo hace interesante es que hay DOS capas con reglas propias:
 *
 *   Navegador (app.js)   valida nombre, documento y edad antes de enviar.
 *                        No mira si la persona esta viva.
 *   Servidor (Registry)  valida documento, vida, edad y duplicados, en ese
 *                        orden. No valida el nombre.
 *
 * Por eso el mismo dato puede dar resultados distintos segun la via: una edad
 * de 150 es VALIDACION_NAVEGADOR por la interfaz, INVALID_AGE por la API, y
 * DEAD por la API si ademas la persona no esta viva.
 */

const GENEROS = ['FEMALE', 'MALE', 'UNIDENTIFIED'];

/** Resultados posibles, con su texto para el reporte. */
const RESULTADOS = {
  VALID: 'Inscripción exitosa',
  UNDERAGE: 'Persona menor de edad',
  INVALID_AGE: 'Edad imposible (solo por la API)',
  DEAD: 'Persona no viva',
  DUPLICATED: 'Documento ya inscrito',
  INVALID: 'Documento inválido (solo por la API)',
  VALIDACION_NAVEGADOR: 'El navegador no envía el formulario',
  ERROR_SERVIDOR: 'Error del servidor (HTTP 500)',
  NO_APLICA: 'Imposible por la interfaz',
};

/** Las siete clases que un plan completo deberia cubrir (ERROR_SERVIDOR es un extra). */
const CLASES = ['VALID', 'UNDERAGE', 'INVALID_AGE', 'DEAD', 'DUPLICATED', 'INVALID', 'VALIDACION_NAVEGADOR'];

/**
 * Traduce lo que escribio la IA al vocabulario del oraculo.
 *
 * El prompt 03 NO le da a la IA la lista de resultados posibles: darsela
 * revelaria que existen INVALID_AGE o la validacion del navegador, que es
 * justo lo que el experimento quiere ver si descubre sola. En su lugar le pide
 * lo que OBSERVA: el texto de la pantalla o el cuerpo que responde el servicio.
 * Esta funcion traduce esas observaciones.
 */
function normalizarEsperado(valor) {
  const t = String(valor ?? '').trim().replace(/^["'`]|["'`]$/g, '');
  const mayus = t.toUpperCase().replace(/[\s-]+/g, '_');
  if (Object.prototype.hasOwnProperty.call(RESULTADOS, mayus)) return mayus;
  const minus = t.toLowerCase().replace(/\s+/g, ' ');
  const porTexto = {
    // Titulos del resultado en pantalla
    'inscripción exitosa': 'VALID', 'persona menor de edad': 'UNDERAGE', 'persona no viva': 'DEAD',
    'documento ya inscrito': 'DUPLICATED', 'datos inválidos': 'INVALID', 'edad fuera de rango': 'INVALID_AGE',
    // Validacion del navegador: mensaje general y mensajes junto a cada campo
    'revise los datos': 'VALIDACION_NAVEGADOR',
    'el documento debe ser un número mayor que cero.': 'VALIDACION_NAVEGADOR',
    'la edad debe estar entre 0 y 120.': 'VALIDACION_NAVEGADOR',
    'escriba el nombre completo.': 'VALIDACION_NAVEGADOR',
  };
  if (porTexto[minus]) return porTexto[minus];
  if (porTexto[minus.replace(/\.$/, '')]) return porTexto[minus.replace(/\.$/, '')];
  if (porTexto[`${minus}.`]) return porTexto[`${minus}.`];
  // Codigos HTTP. Un 500 es lo que hace la aplicacion; cualquier otro codigo es
  // una expectativa distinta, y debe contar como equivocada, no como ilegible.
  const http = minus.match(/^(?:http\s*)?([1-5]\d\d)\b/);
  if (http) return http[1] === '500' ? 'ERROR_SERVIDOR' : `HTTP_${http[1]}`;
  return 'NO_RECONOCIDO';
}

/**
 * @param {{via:string, entrada:any}} caso
 * @returns {{resultado:string, razon:string}}
 */
function oraculo(caso) {
  const via = String(caso.via || '').toUpperCase();
  const e = caso.entrada || {};
  const nombre = e.nombre === undefined ? 'Nombre de prueba' : String(e.nombre);
  const genero = e.genero === undefined ? 'FEMALE' : String(e.genero);
  const vivo = e.vivo === undefined ? true : e.vivo;
  const repetido = e.repetido === true;
  const { documento, edad } = e;

  if (via !== 'UI' && via !== 'API') {
    return { resultado: 'FUERA_DEL_ORACULO', razon: 'La vía debe ser "UI" o "API".' };
  }
  if (!Number.isInteger(documento) || !Number.isInteger(edad) || typeof vivo !== 'boolean') {
    return { resultado: 'FUERA_DEL_ORACULO', razon: 'El oráculo solo evalúa documento y edad enteros, y vivo como true o false.' };
  }

  if (via === 'UI') {
    if (!GENEROS.includes(genero)) {
      return { resultado: 'NO_APLICA', razon: 'El género es una lista desplegable: por la interfaz no se puede enviar otro valor.' };
    }
    if (!nombre.trim()) {
      return { resultado: 'VALIDACION_NAVEGADOR', razon: 'El navegador exige el nombre antes de enviar.' };
    }
    if (documento <= 0) {
      return { resultado: 'VALIDACION_NAVEGADOR', razon: 'El navegador rechaza un documento que no sea mayor que cero; el servidor nunca recibe la petición.' };
    }
    if (edad < 0 || edad > 120) {
      return { resultado: 'VALIDACION_NAVEGADOR', razon: 'El navegador rechaza edades fuera de 0 a 120; el servidor nunca recibe la petición, así que INVALID_AGE no se puede ver por la interfaz.' };
    }
  } else if (!GENEROS.includes(genero)) {
    return { resultado: 'ERROR_SERVIDOR', razon: 'El servidor no controla un género desconocido y responde HTTP 500. (En el taller de integración este caso devuelve 400.)' };
  }

  // Servidor: Registry.registerVoter, en su orden real.
  if (documento <= 0) return { resultado: 'INVALID', razon: 'El servidor comprueba primero el documento.' };
  if (!vivo) return { resultado: 'DEAD', razon: 'El servidor comprueba la vida ANTES que la edad: una persona no viva da DEAD aunque su edad sea imposible o menor.' };
  if (edad < 0 || edad > 120) return { resultado: 'INVALID_AGE', razon: 'Edad fuera de 0 a 120, comprobada antes que la mayoría de edad.' };
  if (edad < 18) return { resultado: 'UNDERAGE', razon: 'Edad de 0 a 17.' };
  if (repetido) return { resultado: 'DUPLICATED', razon: 'El duplicado se comprueba al final: solo aparece si todo lo demás es válido.' };
  return { resultado: 'VALID', razon: via === 'API' && !nombre.trim() ? 'El servidor no valida el nombre: por la API, un nombre vacío se inscribe.' : 'Cumple todas las reglas.' };
}

module.exports = { oraculo, normalizarEsperado, RESULTADOS, CLASES, GENEROS };
