# Prompt 01 — Auditar la accesibilidad de una página

**Experimentos:** E1 (¿encuentra lo que axe no ve?) y E4 (¿encuentra lo mismo si se repite?)
**Herramientas:** ChatGPT y Claude Code

---

## Antes de empezar: no le dé las respuestas

`defectuosa.html` explica cada defecto en comentarios, y el módulo 3B lista los tres grupos. Si la IA ve cualquiera de los dos, **no encuentra los defectos: los lee**, y el experimento no mide nada.

Genere una copia sin comentarios, fuera del repositorio:

```bash
cd playwright
npm run ia:preparar
```

El comando le dice en qué carpeta dejó `pagina.html`. Trabaje **solo con ese archivo**.

---

## Cómo usarlo

### En ChatGPT

1. Abra una conversación **nueva**. Si reutiliza una en la que habló del taller, la IA ya tiene contexto que no debería tener.
2. Adjunte `pagina.html`, o pegue su contenido completo después del prompt.
3. Pegue el prompt de abajo.

### En Claude Code

1. Abra una terminal **en la carpeta que creó `ia:preparar`**, no en el repositorio.
2. Ejecute `claude` y pegue el prompt.
3. Opcional: si configuró el navegador (ver el [prompt 03](03-explorar-y-planear.md)), agregue al final del prompt: *"Además, abre pagina.html en el navegador y comprueba con la tecla Tab el orden y la visibilidad del foco."* Anote en el JSON si lo usó: es otra variable del experimento.

### Para el experimento E4

Ejecute **el mismo prompt tres veces**, cada vez en una conversación nueva, sin cambiar una coma. Guarde cada respuesta en su propio archivo: `auditoria-chatgpt-1.json`, `-2.json`, `-3.json`.

---

## El prompt

````text
Actúa como especialista en accesibilidad web con experiencia auditando
formularios públicos según WCAG 2.1 nivel AA.

Audita la página HTML que te adjunto. Es un formulario de inscripción de
votantes que usarán personas de todas las edades y capacidades, incluidas
personas que navegan solo con teclado, con lector de pantalla o con baja
visión.

Busca problemas de dos tipos:
1. Los que una herramienta automática detectaría: contraste, atributos
   faltantes, elementos sin nombre accesible, estructura.
2. Los que exigen juicio humano: textos que existen pero no comunican nada,
   mensajes que no ayudan a corregir un error, información que cambia en
   pantalla sin anunciarse, orden de foco que no sigue el orden visual,
   indicadores de foco que no se ven.

Reglas:
- Reporta solo problemas que puedas señalar en el código. Para cada uno,
  copia en "evidencia" el fragmento exacto donde está.
- Si no estás seguro de algo, no lo incluyas.
- No inventes elementos que no estén en la página.
- Un mismo problema en el mismo elemento se reporta una sola vez.

Responde ÚNICAMENTE con un JSON válido, sin texto antes ni después, con esta
forma:

{
  "herramienta": "",
  "modelo": "",
  "ejecucion": 1,
  "hallazgos": [
    {
      "elemento": "selector CSS o descripción precisa del elemento",
      "problema": "qué está mal, en una frase",
      "criterio_wcag": "número del criterio, por ejemplo 1.4.3",
      "severidad": "alta | media | baja",
      "evidencia": "fragmento exacto del código"
    }
  ]
}
````

---

## Qué hacer con la respuesta

**1. Guárdela** como `.json`, en la carpeta que prefiera. Complete a mano `herramienta` (`ChatGPT` o `Claude Code`), `modelo` (el que muestra la interfaz) y `ejecucion`.

> Si la IA envolvió el JSON en un bloque ` ```json `, no pasa nada: el evaluador lo quita. Si agregó texto antes o después, bórrelo.

**2. Pida sugerencias de clasificación:**

```bash
npm run ia:sugerir -- ruta/a/auditoria-chatgpt-1.json
```

Cada hallazgo recibe un campo `sugerencia` y un campo `defecto` vacío.

**3. Clasifique usted.** Para cada hallazgo, abra la página y compruébelo. Luego llene `defecto` con:

- el id del defecto real (`A-1` … `C-7`, la lista está en el [módulo 3B del README](../../README.md)), o
- `NO_EXISTE` si la IA se lo inventó. En ese caso explique por qué en un campo `nota_estudiante`.

> **La sugerencia puede estar equivocada.** Está hecha por coincidencia de palabras, no por comprensión. Aceptarla sin mirar la página es exactamente el hábito que este módulo quiere que usted pierda: tratar la salida de una máquina como verdad sin verificarla.

**4. Genere el reporte:**

```bash
npm run ia:evaluar-auditoria -- auditoria-chatgpt-1.json
# E4 y comparación: todos a la vez
npm run ia:evaluar-auditoria -- auditoria-chatgpt-*.json auditoria-claude-code-1.json
```

Queda en `playwright/ia/reportes/`.

---

## Errores típicos

| Síntoma | Causa |
|---|---|
| La IA encuentra exactamente los 17 defectos con sus nombres | Vio los comentarios. Repita con la copia de `ia:preparar`, en una conversación nueva. |
| El JSON no se puede leer | Hay texto fuera del JSON, o comas al final de una lista. |
| Muchos hallazgos del tipo "podría mejorarse" | La IA está rellenando. Clasifíquelos como `NO_EXISTE` salvo que señalen un problema concreto. |
| Dos ejecuciones idénticas dan resultados distintos | No es un error: es lo que mide E4. |
