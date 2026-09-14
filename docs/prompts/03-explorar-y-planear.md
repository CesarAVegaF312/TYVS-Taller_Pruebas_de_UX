# Prompt 03 — Un agente explora la aplicación y diseña el plan de pruebas

**Experimento:** E3 (¿qué reglas descubre un agente, y cuáles se le escapan?)
**Herramienta:** Claude Code, con navegador. ChatGPT no puede hacer este experimento: no puede usar la aplicación.

---

## Qué cambia respecto a los prompts anteriores

En los prompts 01 y 02 la IA recibe archivos. Aquí **usa la aplicación**: abre el navegador, llena el formulario, prueba valores y observa qué pasa, igual que haría una persona haciendo pruebas exploratorias. Después propone un plan de pruebas.

El experimento se hace dos veces:

| Modo | Dónde se abre Claude Code | Qué puede ver |
|---|---|---|
| **Caja negra** | una carpeta vacía | solo la aplicación funcionando |
| **Caja blanca** | `registraduria/` | la aplicación y su código fuente |

Comparar los dos planes responde una pregunta real de la industria: **¿leer el código hace mejores pruebas, o solo pruebas que repiten lo que el código ya hace?**

---

## Preparación (una sola vez)

**1. Conecte el navegador a Claude Code.** Es el comando que da la documentación oficial de Playwright MCP:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

Compruebe que quedó registrado con `claude mcp list`.

**2. Levante la Registraduría** y déjela corriendo durante todo el experimento:

```bash
cd registraduria
java -jar target/registraduria-1.0-SNAPSHOT.jar
```

---

## Caja negra

1. Cree una carpeta vacía **fuera del repositorio** y abra ahí una terminal. Por ejemplo:
   ```bash
   mkdir ~/exploracion-caja-negra && cd ~/exploracion-caja-negra
   ```
2. Ejecute `claude` y pegue el prompt de abajo.

## Caja blanca

1. Abra una terminal **en `registraduria/`**, dentro del repositorio. Ahí están el código de la aplicación y sus pruebas unitarias, pero no el README del taller ni las pruebas E2E.
2. Ejecute `claude` y pegue el mismo prompt, agregando al final:
   *"Además de usar la aplicación, puedes leer el código fuente de esta carpeta."*

> Use una sesión nueva de Claude Code para cada modo. Si hace los dos en la misma, el segundo plan hereda lo que el agente aprendió en el primero.

---

## El prompt

````text
Actúa como ingeniero de pruebas haciendo pruebas exploratorias.

Hay una aplicación web corriendo en http://localhost:8080. Es un formulario de
inscripción de votantes. No tienes documentación.

1. Usa el navegador para explorarla. Prueba valores normales, valores en los
   bordes y valores absurdos. Observa qué muestra la pantalla en cada caso.
2. Observa también cómo se comunica la página con el servidor. Si descubres
   un servicio, puedes llamarlo directamente para ver cómo responde.
3. Deduce las reglas que aplica la aplicación.
4. Diseña un plan de pruebas que cubra esas reglas, incluidos sus valores
   límite.

No inventes reglas que no hayas observado. Si no pudiste comprobar algo,
no lo incluyas.

Entrega el plan ÚNICAMENTE como un JSON válido, sin texto antes ni después:

{
  "herramienta": "Claude Code",
  "modo": "caja-negra",
  "ejecucion": 1,
  "casos": [
    {
      "id": "C1",
      "titulo": "qué comprueba el caso, en una frase",
      "via": "UI o API",
      "entrada": {
        "nombre": "texto",
        "documento": 12345,
        "edad": 30,
        "vivo": true,
        "repetido": false,
        "genero": "FEMALE"
      },
      "esperado": "si la vía es UI: el texto exacto que muestra la pantalla; si es API: el cuerpo exacto que responde el servicio, o el código HTTP"
    }
  ]
}

"repetido": true significa que ese documento ya se había inscrito antes.
````

> **Por qué el prompt no lista los resultados posibles.** Decirle a la IA "los resultados son VALID, UNDERAGE, INVALID_AGE…" le revelaría reglas que tiene que descubrir. Por eso se le pide lo que **observa**, y el evaluador lo traduce.

---

## Qué hacer con la respuesta

1. Guarde cada plan como JSON: `plan-caja-negra.json` y `plan-caja-blanca.json`. En el segundo, cambie `"modo"` a `"caja-blanca"` si la IA no lo hizo.
2. Genere el reporte con los dos a la vez:
   ```bash
   cd playwright
   npm run ia:evaluar-plan -- ruta/plan-caja-negra.json ruta/plan-caja-blanca.json
   ```

El evaluador pasa cada caso por un **oráculo** que reproduce las reglas de la aplicación, capa por capa, verificado contra la aplicación real en 116 combinaciones. Así distingue lo que el agente **cree** que prueba de lo que prueba **de verdad**.

---

## Para ir más allá: los agentes de Playwright

Playwright trae agentes propios que planifican, generan y reparan pruebas:

```bash
cd playwright
npx playwright init-agents --loop=claude
```

Crea tres agentes (*planner*, *generator* y *healer*) que Claude Code puede usar. Si lo prueba, tenga en cuenta tres cosas que se comprobaron al preparar este módulo:

- **Se ejecuta dentro del repositorio**, así que los agentes pueden leer las pruebas del taller. No sirve para el experimento de caja negra.
- **`.mcp.json` sale ligado a su sistema operativo.** En Windows se genera con `"command": "cmd"`, que no existe en macOS ni Linux. No lo suba al repositorio: cada persona debe generarlo en su máquina.
- **Crea `tests/seed.spec.ts`**, una prueba vacía que `npm test` recoge y cuenta como aprobada sin verificar nada. Muévala fuera de `tests/` o bórrela antes de ejecutar la suite.

---

## Errores típicos

| Síntoma | Causa |
|---|---|
| Claude Code dice que no puede abrir un navegador | El MCP no quedó registrado. Revise `claude mcp list`. |
| El plan describe reglas perfectas, sin haber usado la aplicación | En caja negra, pídale que muestre qué valores probó. Si no exploró, el plan es una suposición. |
| El reporte marca muchos "fuera del oráculo" | Documento o edad no son números enteros, o `vivo` no es `true`/`false`. |
| El reporte no reconoce el resultado esperado | La IA describió el resultado en vez de copiarlo ("muestra un error"). Es un hallazgo: anótelo. |
