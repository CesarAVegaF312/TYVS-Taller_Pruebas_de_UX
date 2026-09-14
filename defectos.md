# Registro de Defectos — EJEMPLO DEL PROFESOR

> **Este archivo es un ejemplo**, no su entrega. Muestra el nivel de detalle
> esperado y, sobre todo, la diferencia entre un defecto funcional y uno de
> usabilidad. Para su taller parta de [`defectos_template.md`](defectos_template.md).

---

## Formato 1: Lista detallada

### Defecto UX-01 — El formulario acepta puntos en el documento y falla sin explicar

- **Tipo**: Usabilidad
- **Módulo**: 5 (sesión con usuarios)
- **Cómo se detectó**: 3 de 5 participantes escribieron el documento con separadores de miles.
- **Pasos para reproducir**:
  1. Abrir <http://localhost:8080>
  2. Escribir `12.345.678` en el campo "Número de documento"
  3. Completar el resto y pulsar "Registrar votante"
- **Resultado esperado**: el sistema acepta el formato habitual, o explica cuál espera **antes** de enviar.
- **Resultado obtenido**: el campo `type="number"` descarta el valor en silencio; el mensaje de error aparece solo tras intentar enviar.
- **Severidad**: Alta — dos participantes abandonaron la tarea.
- **Cambio propuesto**: aceptar el formato con puntos y normalizarlo, o mostrar el formato esperado como texto de ayuda visible desde el inicio.
- **Estado**: Abierto

> Este defecto **no lo detecta ninguna prueba automatizada**: la validación funciona exactamente como fue programada. El problema es que la interfaz espera un formato que la persona no adivina. Solo aparece observando a alguien usarla.

---

### Defecto UX-02 — El resultado no recibe el foco tras enviar el formulario

- **Tipo**: Accesibilidad
- **Módulo**: 3 (auditoría manual, no axe)
- **Cómo se detectó**: navegación solo con teclado y lector de pantalla.
- **Pasos para reproducir**:
  1. Completar el formulario usando únicamente el teclado
  2. Activar "Registrar votante" con Enter
  3. Observar dónde queda el foco
- **Resultado esperado**: la persona se entera del resultado sin tener que buscarlo.
- **Resultado obtenido**: el foco permanece en el botón. El mensaje sí se anuncia gracias a `role="status"` con `aria-live="polite"`, pero el foco no se mueve, así que quien navega con teclado debe tabular a ciegas para leer el detalle.
- **Severidad**: Media
- **Criterio WCAG afectado**: 2.4.3 Orden del foco
- **Cambio propuesto**: mover el foco al encabezado del resultado tras una inscripción exitosa.
- **Estado**: Abierto

> **axe no reporta este defecto**, y ese es justo el punto del Módulo 3. La página tiene `aria-live` correctamente puesto, así que para la herramienta está bien. Que el orden del foco sea *lógico* es un juicio humano.

---

### Defecto UX-03 — El botón no comunica que la operación terminó

- **Tipo**: Usabilidad
- **Módulo**: 5 (sesión con usuarios)
- **Cómo se detectó**: un participante pulsó "Registrar votante" tres veces seguidas.
- **Resultado esperado**: quede claro que la petición está en curso y cuándo terminó.
- **Resultado obtenido**: el botón se deshabilita y cambia a "Registrando…", pero la respuesta es tan rápida en local que el cambio no se percibe. Con la red lenta del participante, el retardo se leyó como "no pasó nada".
- **Severidad**: Media
- **Cambio propuesto**: mantener el estado de carga un mínimo perceptible (~300 ms) y desplazar la vista al mensaje de resultado.
- **Estado**: Resuelto — verificado por `modulo1-e2e.spec.js` › `03 - Registra a una persona válida`, que espera el mensaje en lugar de un tiempo fijo.

---

## Formato 2: Tabla de seguimiento

| ID | Título | Tipo | Cómo se detectó | Severidad | Estado |
|----|--------|------|------------------|-----------|--------|
| UX-01 | Puntos en el documento | Usabilidad | Sesión con usuarios | Alta | Abierto |
| UX-02 | El foco no sigue al resultado | Accesibilidad | Auditoría manual | Media | Abierto |
| UX-03 | Estado de carga imperceptible | Usabilidad | Sesión con usuarios | Media | Resuelto |

---

## Convenciones de estado

| Estado | Significado |
|--------|-------------|
| **Abierto** | Detectado, sin corregir. |
| **En progreso** | En análisis o corrección. |
| **Resuelto** | Corregido y validado con una prueba. |

---

## Observación

Los tres defectos de este ejemplo comparten algo: **ninguno lo habría
encontrado una prueba E2E**. UX-01 y UX-03 salieron de observar personas;
UX-02, de una auditoría manual que axe no puede hacer.

Ese es el argumento del taller completo: automatizar responde "¿funciona?".
La usabilidad responde "¿se entiende?", y esa pregunta todavía necesita ojos
humanos.
