/*
 * Lógica del formulario de inscripción.
 *
 * Consume el mismo endpoint POST /register que usan los talleres de
 * integración y de carga. La interfaz solo traduce el resultado del dominio
 * a un mensaje entendible por una persona.
 */

// Mensajes por cada resultado que puede devolver el dominio.
const MENSAJES = {
  VALID: {
    titulo: 'Inscripción exitosa',
    detalle: 'La persona quedó registrada como votante habilitada.',
    clase: 'exito',
  },
  DUPLICATED: {
    titulo: 'Documento ya inscrito',
    detalle: 'Ese número de documento ya tiene una inscripción registrada.',
    clase: 'rechazo',
  },
  UNDERAGE: {
    titulo: 'Persona menor de edad',
    detalle: 'Para inscribirse como votante debe tener 18 años o más.',
    clase: 'rechazo',
  },
  DEAD: {
    titulo: 'Persona no viva',
    detalle: 'No es posible inscribir a una persona que no está viva.',
    clase: 'rechazo',
  },
  INVALID: {
    titulo: 'Datos inválidos',
    detalle: 'Revise el número de documento: debe ser un número positivo.',
    clase: 'rechazo',
  },
  // En condiciones normales este mensaje NO se muestra nunca: la función
  // validar() de más abajo aplica la misma regla (0 a 120) antes de enviar,
  // así que el navegador detiene el caso primero.
  //
  // Aun así se incluye, y no es código muerto. Si alguien cambia la validación
  // del cliente, o el servidor endurece la regla —por ejemplo bajando la edad
  // máxima a 115—, la interfaz responde con un mensaje útil en vez de con
  // "El servicio respondió de forma inesperada". Manejar todos los resultados
  // que el dominio puede devolver es más barato que descubrir el hueco en
  // producción.
  INVALID_AGE: {
    titulo: 'Edad fuera de rango',
    detalle: 'La edad debe estar entre 0 y 120 años. Verifique el dato capturado.',
    clase: 'rechazo',
  },
};

const form = document.getElementById('form-registro');
const resultado = document.getElementById('resultado');
const resultadoTitulo = document.getElementById('resultado-titulo');
const resultadoDetalle = document.getElementById('resultado-detalle');
const boton = document.getElementById('btn-registrar');

/** Muestra u oculta el mensaje de error de un campo. */
function marcarError(idCampo, mensaje) {
  const campo = document.getElementById(idCampo);
  const error = document.getElementById('error-' + idCampo);
  if (mensaje) {
    error.textContent = mensaje;
    error.hidden = false;
    campo.setAttribute('aria-invalid', 'true');
    return false;
  }
  error.textContent = '';
  error.hidden = true;
  campo.removeAttribute('aria-invalid');
  return true;
}

/**
 * Validación de formato en el navegador.
 * No sustituye a la del servidor: solo evita viajes innecesarios y da
 * retroalimentación inmediata.
 */
function validar(datos) {
  let ok = true;
  ok = marcarError('nombre', datos.name ? null : 'Escriba el nombre completo.') && ok;
  ok = marcarError('documento',
    Number.isInteger(datos.id) && datos.id > 0
      ? null
      : 'El documento debe ser un número mayor que cero.') && ok;
  ok = marcarError('edad',
    Number.isInteger(datos.age) && datos.age >= 0 && datos.age <= 120
      ? null
      : 'La edad debe estar entre 0 y 120.') && ok;
  return ok;
}

function mostrarResultado(titulo, detalle, clase) {
  resultadoTitulo.textContent = titulo;
  resultadoDetalle.textContent = detalle;
  resultado.className = clase || '';
  resultado.hidden = false;
}

form.addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const datos = {
    name: document.getElementById('nombre').value.trim(),
    id: parseInt(document.getElementById('documento').value, 10),
    age: parseInt(document.getElementById('edad').value, 10),
    gender: document.getElementById('genero').value,
    alive: document.getElementById('vivo').checked,
  };

  if (!validar(datos)) {
    mostrarResultado(
      'Revise los datos',
      'Hay campos con errores. Corríjalos e intente de nuevo.',
      'rechazo'
    );
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Registrando…';

  try {
    const respuesta = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });

    const cuerpo = (await respuesta.text()).trim();
    const mensaje = MENSAJES[cuerpo];

    if (mensaje) {
      mostrarResultado(mensaje.titulo, mensaje.detalle, mensaje.clase);
    } else {
      mostrarResultado(
        'No se pudo completar la inscripción',
        'El servicio respondió de forma inesperada. Intente más tarde.',
        'rechazo'
      );
    }
  } catch (e) {
    mostrarResultado(
      'Sin conexión con el servicio',
      'No fue posible contactar la Registraduría. Verifique su conexión.',
      'rechazo'
    );
  } finally {
    boton.disabled = false;
    boton.textContent = 'Registrar votante';
  }
});
