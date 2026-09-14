# Módulo 6 — Probar con IA

**Módulo exploratorio: no suma puntos en la rúbrica.** Su objetivo es que usted salga con criterio propio sobre cuándo una IA ayuda a probar software y cuándo estorba, sostenido con datos que midió usted mismo.

---

## Qué es y qué no es este módulo

| | Este módulo | Taller de Pruebas de Sistemas de IA |
|---|---|---|
| Pregunta | ¿Sirve una IA para **probar** una aplicación? | ¿Cómo se prueba una aplicación que **es** una IA? |
| La IA es | la herramienta | el sistema bajo prueba |

Aquí no se discute si la IA "es buena". Se mide, sobre esta aplicación concreta, qué encuentra, qué se inventa y qué se le escapa.

---

## La idea central: a la IA no se le cree, se la evalúa

Los cuatro experimentos siguen el mismo ciclo, y el ciclo importa más que cualquier herramienta:

```text
 1. PROMPT      2. EJECUTAR        3. SALIDA        4. EVALUAR              5. REPORTE
 plantilla  →   ChatGPT o      →   JSON o       →   script contra una   →   HTML que explica
 del taller     Claude Code        código           verdad conocida         qué pasó y por qué
```

Lo que hace posible el paso 4 es algo que casi nunca se tiene en un proyecto real: **una verdad conocida**. Sabemos exactamente qué 17 defectos tiene `defectuosa.html`, qué reglas aplica la Registraduría y en qué orden. Eso permite medir en vez de opinar.

---

## Antes de empezar

### Herramientas

- **ChatGPT**: recibe lo que usted le pega o adjunta, y responde.
- **Claude Code**: trabaja en una carpeta de su computador. Lee archivos, ejecuta comandos y, con Playwright MCP, maneja un navegador.

Esa diferencia es una variable del experimento, no un detalle: Claude Code puede ejecutar las pruebas que escribe y corregirlas; ChatGPT no.

### Lo que debe tener listo

```bash
cd registraduria && mvn -DskipTests clean package   # el jar
cd ../playwright && npm install                      # las dependencias
```

### Privacidad y honestidad

- Los datos de la Registraduría son ficticios. Aun así, **no pegue en una IA datos personales, credenciales ni código de su trabajo**: lo que envía a un servicio externo puede quedar almacenado.
- Si usa estos resultados en la Wiki, **diga qué herramienta y qué modelo usó**. Un resultado sin esa información no se puede reproducir.

---

## La trampa que invalida el experimento

**Si la IA puede ver las respuestas, no las encuentra: las copia.** Es el error más fácil de cometer, y el taller tiene tres lugares donde ocurre:

| Dónde están las respuestas | Qué experimento arruina | Cómo se evita |
|---|---|---|
| Los comentarios de `defectuosa.html` y el módulo 3B | E1, E4 | `npm run ia:preparar` hace una copia sin comentarios, fuera del repositorio |
| Las pruebas de los módulos 1 y 2 | E2 | `npm run ia:preparar-generacion` arma una carpeta sin pruebas |
| El README y las pruebas del taller | E3 | caja negra en una carpeta vacía; caja blanca solo en `registraduria/` |

En aprendizaje automático esto tiene nombre: evaluar un modelo con datos que ya vio. El resultado siempre sale espectacular y nunca significa nada.

---

## Sesión 1 — ¿Encuentra la IA lo que axe no ve? (E1 y E4)

**Pregunta:** en el módulo 3B vimos que axe encuentra 10 de 17 defectos y ninguno de los 7 del grupo C. ¿Una IA sí los encuentra?

| Paso | Qué hacer | Guía |
|---|---|---|
| 1 | Genere la copia sin pistas: `npm run ia:preparar` | |
| 2 | Audite con **ChatGPT** usando el prompt 01. Guarde `auditoria-chatgpt-1.json` | [Prompt 01](prompts/01-auditar-accesibilidad.md) |
| 3 | Repita **dos veces más**, en conversaciones nuevas, sin cambiar el prompt: `-2.json` y `-3.json` | |
| 4 | Audite con **Claude Code**, desde la carpeta de la copia: `auditoria-claude-code-1.json` | |
| 5 | Pida sugerencias: `npm run ia:sugerir -- auditoria-chatgpt-1.json` (y así con cada archivo) | |
| 6 | **Clasifique cada hallazgo usted**, mirando la página: el id del defecto, o `NO_EXISTE` | |
| 7 | Genere el reporte con todos los archivos a la vez | |

```bash
npm run ia:evaluar-auditoria -- auditoria-chatgpt-1.json auditoria-chatgpt-2.json auditoria-chatgpt-3.json auditoria-claude-code-1.json
```

**Punto de control.** Antes de mirar el reporte, anote cuántos defectos del grupo C cree que encontró cada herramienta. Después compare con lo que dice el reporte. Si su estimación era mucho más alta, ese es el primer aprendizaje: **la salida de una IA parece más completa de lo que es**.

> El paso 6 es el más lento y el más importante. Aceptar las sugerencias sin mirar la página es tratar la salida de una máquina como verdad sin verificarla, justo el hábito que este módulo quiere romper. Cronometre cuánto tarda: es un dato para la reflexión.

---

## Sesión 2 — Las pruebas que escribe la IA, y el plan que diseña (E2 y E3)

### E2 — ¿Las pruebas generadas detectan algo?

**Pregunta:** una prueba que pasa, ¿sirve? Solo lo sabemos rompiendo la aplicación a propósito y viendo si alguna prueba se entera.

| Paso | Qué hacer | Guía |
|---|---|---|
| 1 | Arme la carpeta de trabajo: `npm run ia:preparar-generacion` | [Prompt 02](prompts/02-generar-pruebas-e2e.md) |
| 2 | Genere pruebas con el prompt **ingenuo** y con el **guiado**, en ChatGPT y en Claude Code | |
| 3 | Guarde cada resultado en su carpeta: `ia/generadas/chatgpt-guiado/registro.spec.js`, etc. | |
| 4 | Con la Registraduría **detenida**: `npm run ia:sabotaje` | |

El script ejecuta cada conjunto de pruebas **siete veces**: una con la aplicación intacta y seis con un defecto introducido a propósito (se aceptan menores, se aceptan duplicados, desaparece la validación…). Si una prueba falla con un sabotaje, **se repite la ejecución** para confirmar que no fue casualidad.

**Punto de control.** Antes de ejecutar, prediga cuántos de los seis sabotajes detectará cada carpeta. El prompt guiado debería ganarle al ingenuo. ¿Por cuánto?

¿Quiere ver el experimento antes de generar nada? Hay un ejemplo preparado:

```bash
npm run ia:sabotaje -- --ejemplo
```

### E3 — ¿Qué reglas descubre un agente explorando?

**Pregunta:** si un agente usa la aplicación como lo haría una persona, ¿descubre todas sus reglas? ¿Leer el código le ayuda o lo lleva a copiar la implementación?

| Paso | Qué hacer | Guía |
|---|---|---|
| 1 | Conecte el navegador: `claude mcp add playwright npx @playwright/mcp@latest` | [Prompt 03](prompts/03-explorar-y-planear.md) |
| 2 | Con la Registraduría **corriendo**, pida el plan en **caja negra** (carpeta vacía) | |
| 3 | Pídalo en **caja blanca** (dentro de `registraduria/`), en una sesión nueva | |
| 4 | `npm run ia:evaluar-plan -- plan-caja-negra.json plan-caja-blanca.json` | |

**Punto de control.** Hay una regla que la interfaz esconde: el navegador bloquea las edades imposibles antes de enviarlas, así que `INVALID_AGE` solo aparece llamando al servicio directamente. ¿La descubrió el agente en caja negra? Es la misma lección que la prueba 09 del módulo 1.

---

## Qué dice cada reporte

| Reporte | La cifra que más importa | Por qué |
|---|---|---|
| Auditoría (E1) | defectos del **grupo C** encontrados, y hallazgos **inventados** | es lo único que axe no hace; y cada invento cuesta tiempo descartarlo |
| Estabilidad (E4) | defectos que aparecen en **las tres** ejecuciones | lo que aparece solo a veces es suerte, no capacidad |
| Sabotajes (E2) | sabotajes **detectados**, y la diferencia entre **sobrevivió** y **no ejercitado** | que una prueba pase no dice si protege |
| Plan (E3) | clases marcadas **"Solo lo cree"** y casos con el **esperado equivocado** | un plan que parece completo y no lo es resulta peor que uno que admite lo que le falta |

Todos los reportes traen recuadros *"Cómo leer esto"* y cierran con preguntas para la Wiki.

---

## Para la Wiki (opcional)

Una página *Probar con IA* con:

1. Los cuatro reportes (adjuntos o enlazados).
2. Las respuestas a las preguntas del final de cada reporte.
3. **Una recomendación**, en un párrafo: si mañana tuviera que usar IA para probar una aplicación como esta, ¿para qué tarea la usaría, para cuál no, y qué verificación manual no se saltaría nunca? Apóyela en sus cifras.

---

## Cómo funcionan los evaluadores

Para quien quiera saber por qué confiar en los reportes:

- **Auditoría.** La verdad de referencia está en `playwright/ia/verdad/defectos-sembrados.json`. La columna de axe no se escribió de memoria: se midió en el módulo 3B, y si axe cambia, esas pruebas fallan.
- **Sabotajes.** Un proxy en el puerto 8080 se pone delante de la Registraduría (en el 8081) y altera sus respuestas. Antes de empezar, el script comprueba que el código que va a alterar existe tal cual; si alguien cambia la interfaz, el script se niega a correr en vez de producir un reporte que mienta. Cada detección se confirma con una segunda ejecución.
- **Plan.** El oráculo (`playwright/ia/oraculo.js`) reproduce las reglas de las dos capas: el navegador valida nombre, documento y edad; el servidor valida documento, vida, edad y duplicados, en ese orden. Se verificó contra la aplicación real en **116 combinaciones**, por la interfaz y por la API, sin una sola diferencia.
- **Ejemplos.** Los archivos de `playwright/ia/ejemplos/` están escritos a mano para mostrar el formato. Los reportes generados con ellos lo advierten en la parte superior: **no son resultados de ninguna IA**.
