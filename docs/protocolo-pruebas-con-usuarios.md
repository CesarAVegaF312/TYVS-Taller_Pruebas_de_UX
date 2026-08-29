# Módulo 5 — Pruebas de usabilidad con usuarios reales

Este es el único módulo del taller que **no se automatiza**, y por eso es el más importante para entender qué es UX.

## Por qué hace falta

Los módulos anteriores automatizan cuatro cosas distintas, y ninguna de ellas responde la pregunta de usabilidad:

| Módulo | Responde | No responde |
|---|---|---|
| 1 y 2 — E2E | ¿La interfaz **funciona**? | Si alguien entiende cómo usarla |
| 3 — Accesibilidad | ¿Cumple WCAG lo que una máquina puede medir? | Si el texto alternativo es *útil* |
| 4 — Regresión visual | ¿Cambió algo sin querer? | Si lo que se ve es *comprensible* |

Un formulario puede pasar las 21 pruebas automatizadas y aun así hacer que la gente abandone en el segundo campo. La usabilidad se mide **observando a personas**, no ejecutando código.

---

## Diseño de la sesión

### Participantes

**5 participantes bastan.** Es un resultado clásico de Nielsen: con 5 personas se detecta cerca del 85% de los problemas de usabilidad, y a partir de ahí cada participante adicional aporta cada vez menos porque empieza a repetir hallazgos.

Recluta a personas que **no** hayan trabajado en el proyecto. Un compañero que ya conoce el formulario no puede descubrir que es confuso.

### Tareas

Formula tareas como **objetivos**, no como instrucciones. La diferencia decide si la prueba sirve:

| ❌ Instrucción (no sirve) | ✅ Objetivo (sirve) |
|---|---|
| "Escribe 30 en el campo Edad y pulsa Registrar" | "Inscribe a tu tía Ana, de 30 años, para que pueda votar" |
| "Desmarca la casilla 'La persona está viva'" | "Te informan que la persona del documento 12345 falleció. Regístralo" |

La primera versión ya contiene la respuesta; solo comprueba que los dedos funcionan. La segunda revela si la persona **encuentra** el camino.

Tareas sugeridas para la Registraduría:

1. Inscribe a una persona adulta para que pueda votar.
2. Intenta inscribir a alguien de 16 años. ¿Qué pasó y por qué?
3. Inscribe a la misma persona de la tarea 1 otra vez. Explica el resultado.
4. Sin usar el ratón, inscribe a una persona más.

### Reglas para quien modera

- **No ayudes.** El silencio incómodo es dato: si alguien no encuentra el botón en 30 segundos, eso es el hallazgo.
- **No expliques la interfaz** antes de empezar.
- Pide **pensar en voz alta**: "dime qué estás mirando y qué esperas que pase".
- Cuando pregunten "¿está bien así?", devuelve la pregunta: "¿tú qué crees que va a pasar?".
- Registra lo que **hacen**, no solo lo que dicen. Las dos cosas suelen no coincidir.

---

## Métricas

### Cuantitativas

| Métrica | Cómo se mide | Qué revela |
|---|---|---|
| **Tasa de éxito de tarea** | % de participantes que la completan sin ayuda | Si la interfaz es utilizable |
| **Tiempo en tarea** | Segundos desde el inicio hasta completarla | Si es eficiente |
| **Número de errores** | Acciones equivocadas antes de acertar | Dónde está la fricción |
| **Tasa de abandono** | % que se rinde | Los problemas graves |

### SUS (System Usability Scale)

Cuestionario de 10 preguntas que se aplica **al terminar** la sesión. Cada una se responde de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo):

1. Creo que usaría este sistema con frecuencia.
2. Encontré el sistema innecesariamente complejo.
3. Pensé que el sistema era fácil de usar.
4. Creo que necesitaría apoyo técnico para poder usar este sistema.
5. Encontré que las funciones del sistema estaban bien integradas.
6. Pensé que había demasiada inconsistencia en el sistema.
7. Imagino que la mayoría de la gente aprendería a usarlo muy rápido.
8. Encontré el sistema muy incómodo de usar.
9. Me sentí muy seguro usando el sistema.
10. Necesité aprender muchas cosas antes de poder usarlo.

**Cálculo del puntaje:**

1. Preguntas **impares** (1, 3, 5, 7, 9): resta 1 a la respuesta → `x - 1`
2. Preguntas **pares** (2, 4, 6, 8, 10): resta la respuesta a 5 → `5 - x`
3. Suma los 10 valores y **multiplica por 2.5**

El resultado va de 0 a 100. **No es un porcentaje.**

**Interpretación** (según los baremos de Sauro y Lewis):

| Puntaje SUS | Lectura |
|---|---|
| > 80.3 | Excelente (percentil 90+) |
| 68 – 80.3 | Bueno |
| **68** | **Promedio de la industria** |
| 51 – 68 | Aceptable, con problemas |
| < 51 | Deficiente |

> ⚠️ Un SUS de 68 no es "68%". Es exactamente la media: la mitad de los sistemas medidos puntúan por debajo.

---

## Qué entregar

En el Wiki del repositorio:

1. **Guion de la sesión**: tareas planteadas y su redacción exacta.
2. **Tabla de resultados** por participante:

   | Participante | T1 éxito | T1 tiempo | T2 éxito | T2 tiempo | ... | SUS |
   |---|---|---|---|---|---|---|
   | P1 | Sí | 42 s | No | — | | 72.5 |

3. **Los 3 problemas más graves** encontrados, con:
   - qué hizo la persona,
   - qué esperaba que pasara,
   - qué pasó en realidad,
   - severidad (alta / media / baja),
   - cambio propuesto.
4. **SUS promedio** con su interpretación.
5. **Reflexión**: ¿qué problema encontraron los usuarios que **ninguna** de las 21 pruebas automatizadas podía detectar? Esta pregunta es el objetivo de todo el módulo.

---

## Consideración ética

Antes de grabar o registrar cualquier sesión, pide consentimiento explícito y explica para qué se usarán los datos. Anonimiza a los participantes en la entrega (P1, P2…), nunca con nombres reales.

Y una regla que conviene decir en voz alta al empezar: **no estamos evaluando a la persona, estamos evaluando la interfaz**. Si alguien no logra completar una tarea, el fallo es del diseño.
