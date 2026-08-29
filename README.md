# Taller de Pruebas de UI y UX

Este taller cubre dos cosas que suelen confundirse, y la distinción entre ellas es su principal objetivo de aprendizaje:

- **Pruebas de UI (E2E)**: automatizan un navegador para verificar que la interfaz **funciona**. Son pruebas funcionales.
- **Pruebas de UX (usabilidad y accesibilidad)**: verifican que la interfaz se pueda **usar** — por cualquier persona, incluida la que navega con teclado o con lector de pantalla.

Una aplicación puede pasar todas las pruebas E2E del mundo y seguir siendo inusable. Son preguntas distintas y requieren técnicas distintas.

---

## 🎯 Objetivos

- Automatizar pruebas de interfaz con **Playwright** y con **Selenium**, y saber cuándo conviene cada una.
- Aplicar el patrón **Page Object Model** para que las pruebas sobrevivan a los rediseños.
- Escribir localizadores **estables** y esperas **por condición**, nunca fijas.
- Auditar accesibilidad **WCAG 2.1 AA** con axe, y entender qué parte del problema **no** se puede automatizar.
- Detectar regresiones visuales que ninguna aserción sobre el DOM ve.
- Diseñar y ejecutar una **sesión de usabilidad con usuarios reales**, midiendo tasa de éxito de tarea y **SUS**.

---

## 📑 Índice

- [Sistema bajo prueba](#sistema-bajo-prueba)
- [Prerrequisitos](#prerrequisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Módulos del taller](#módulos-del-taller)
- [Playwright o Selenium: ¿cuál hago?](#playwright-o-selenium-cuál-hago)
- [Para entregar](#para-entregar-con-este-taller)
- [Rúbrica](#rúbrica)
- [Créditos](#créditos-y-uso-académico)

---

## Sistema bajo prueba

A diferencia de versiones anteriores de este taller, **no se prueba un sitio de terceros**. El sujeto es la misma aplicación `registraduria` de los talleres de pruebas unitarias, integración y carga, ahora con una interfaz web.

Eso importa por tres razones:

1. El taller **no depende de que un sitio externo siga en línea**. Funciona sin internet.
2. Se practica el ciclo realista: *levanto mi aplicación → la pruebo*.
3. Las reglas de negocio que ya conoce (mayor de edad, persona viva, documento único) reaparecen aquí, ahora desde el punto de vista de quien las ve en pantalla.

```text
.
├─ registraduria/                    # SISTEMA BAJO PRUEBA (Spring Boot)
│   └─ src/main/resources/static/    # index.html (correcta), defectuosa.html (17 defectos)
├─ playwright/                       # pista principal
│   ├─ pages/                        # Page Objects
│   └─ tests/                        # módulos 1, 2, 3, 3B y 4
├─ selenium-java/                    # pista alternativa
│   └─ src/test/java/
├─ docs/
│   ├─ protocolo-pruebas-con-usuarios.md   # módulo 5
│   ├─ playwright-guide.md
│   ├─ selenium-guide.md
│   └─ cicd-guide.md
├─ defectos.md                       # ejemplo del profesor
└─ defectos_template.md              # plantilla para su entrega
```

---

## Prerrequisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| JDK | 17 o superior | compilar y ejecutar la Registraduría |
| Maven | 3.8+ | construir el proyecto |
| Node.js | 18 o superior | ejecutar Playwright |
| Chrome | reciente | pista de Selenium |

> 📌 **No hace falta descargar ChromeDriver a mano.** Selenium 4.6 en adelante incluye *Selenium Manager*, que resuelve el driver automáticamente. (Versiones anteriores de este taller usaban WebDriverManager para eso; ya es innecesario.)

---

## Puesta en marcha

### 1. Compile el sistema bajo prueba

```bash
cd registraduria
mvn -DskipTests clean package
```

### 2. Levántelo

```bash
java -jar target/registraduria-1.0-SNAPSHOT.jar
```

Compruebe que responde:

```bash
curl http://localhost:8080/actuator/health   # {"status":"UP", ...}
```

Y abra <http://localhost:8080> en el navegador: debería ver el formulario de inscripción.

### 3. Ejecute las pruebas

**Playwright** (levanta el servicio solo si no lo encuentra corriendo):

```bash
cd playwright
npm install
npx playwright install chromium
npm test
```

**Selenium** (requiere que el servicio ya esté arriba):

```bash
cd selenium-java
mvn test                      # con navegador visible
mvn test -Dheadless=true      # sin interfaz gráfica, como en CI
```

> 💡 La configuración de Playwright incluye un bloque `webServer` que arranca la Registraduría automáticamente y la apaga al terminar. Selenium no hace eso: hay que levantarla antes. Es una diferencia real entre las dos herramientas y conviene notarla.

---

## Módulos del taller

### Módulo 1 — Pruebas E2E ([`modulo1-e2e.spec.js`](playwright/tests/modulo1-e2e.spec.js))

Automatización básica del navegador: completar el formulario, enviarlo, verificar el resultado. Ocho escenarios que cubren las reglas de negocio desde la interfaz.

Dos principios que se aplican en todo el archivo:

**Localizadores por rol y texto visible, no por CSS ni XPath.**

```js
// ✅ Sobrevive a un rediseño, y de paso comprueba que el elemento es accesible
page.getByRole('button', { name: 'Registrar votante' })

// ❌ Se rompe con el primer cambio de estilos
page.locator('.btn.btn-primary.mt-3')
```

**Cero esperas fijas.** Playwright reintenta cada aserción hasta que se cumple o expira el tiempo. Un `sleep(3000)` es una apuesta: lento cuando la aplicación responde rápido, insuficiente cuando responde lento. Es la causa número uno de pruebas inestables.

### Módulo 2 — Page Object Model ([`modulo2-pom.spec.js`](playwright/tests/modulo2-pom.spec.js))

Los mismos escenarios, pero las pruebas se leen como reglas de negocio en vez de como secuencias de clics:

```js
await registro.inscribir({ documento: RegistroPage.documentoUnico(), edad: 17 });
await registro.esperarResultado('Persona menor de edad');
```

El beneficio aparece cuando la interfaz cambia: si el botón cambia de texto, se corrige en **un** lugar y las pruebas que lo usan siguen funcionando.

### Módulo 3 — Accesibilidad ([`modulo3-accesibilidad.spec.js`](playwright/tests/modulo3-accesibilidad.spec.js))

Aquí empieza la parte de UX. Auditoría automatizada de **WCAG 2.1 AA** con `axe`.

Contexto: la accesibilidad dejó de ser opcional. El **European Accessibility Act** es exigible desde junio de 2025, y en Estados Unidos la ADA genera litigio constante sobre sitios web.

> ⚠️ **El límite de axe es lo más valioso de este módulo.** axe detecta de forma fiable cerca del **40%** de los problemas WCAG: los mecánicos (contraste insuficiente, `<img>` sin `alt`, botones y enlaces sin nombre accesible). El resto exige juicio humano: ¿el texto alternativo *describe* la imagen o solo dice "imagen"? ¿el orden de tabulación sigue el orden lógico de la tarea?
>
> **Una suite de axe en verde no significa "el sitio es accesible".** Significa "no tiene los errores que una máquina puede detectar sola".

El **módulo 3B** convierte ese párrafo en algo comprobable: en vez de creerlo, usted lo mide sobre una página con defectos reales. Ahí verá, por ejemplo, que la frase "axe detecta campos sin etiqueta" es **falsa tal como suena**: detecta un `<select>` sin etiqueta, pero da por bueno un `<input>` cuya única etiqueta es un `placeholder`.

Note además que el módulo audita la página **con errores de validación visibles**, no solo la página feliz. Los estados de error son el punto ciego clásico de las auditorías.

### Módulo 3B — Ver a la herramienta fallar ([`modulo3b-defectos-sembrados.spec.js`](playwright/tests/modulo3b-defectos-sembrados.spec.js))

El módulo 3 sale verde. Como resultado está bien; como aprendizaje es pésimo, porque usted nunca ve un informe de axe con violaciones dentro ni aprende a leerlo.

Por eso existe **[`/defectuosa.html`](registraduria/src/main/resources/static/defectuosa.html)**: la misma pantalla con **17 defectos puestos a mano**, cada uno marcado en el código con un comentario. Ábrala en el navegador junto a la página correcta y compárelas.

```bash
npm run test:a11y:defectos
```

Lo que enseña este módulo no es que axe encuentre defectos. Es que **los defectos no se reparten en dos montones sino en tres**, y que la frontera entre los dos primeros la decide usted:

| Grupo | Qué son | Cuántos | Cómo aparecen |
|---|---|---|---|
| **A** | axe los reporta con `.withTags([...wcag...])` | 6 reglas | `button-name`, `color-contrast`, `html-has-lang`, `image-alt`, `link-name`, `select-name` |
| **B** | axe los reporta **solo si quita ese filtro** | 4 reglas | `heading-order`, `landmark-one-main`, `region`, `tabindex` |
| **C** | axe **no** los reporta nunca | 7 defectos | revisión manual |

> 🔍 **El grupo B es el hallazgo incómodo.** Casi todos los tutoriales copian `.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])` sin decir que ese filtro silencia la categoría `best-practice` de axe — donde viven el orden de encabezados, la ausencia de `<main>` y los `tabindex` positivos. Son cuatro defectos reales que desaparecen del informe por una línea de configuración. La prueba 02 del módulo corre la misma página dos veces, con y sin filtro, para que vea la diferencia.

**Los 7 defectos del grupo C** (búsquelos usted, están en la lista de entregables):

1. `placeholder` usado como única etiqueta — desaparece al escribir.
2. `alt="imagen"` — el atributo existe pero no describe nada.
3. `outline: none` — el foco de teclado se vuelve invisible.
4. Una casilla rotulada `Estado`, que no dice qué significa marcarla.
5. El resultado se muestra sin `role="status"`: nunca se anuncia.
6. Un enlace que dice `Haga clic aquí`.
7. Un mensaje de error que dice `Error.` y nada más (WCAG 3.3.3 pide una sugerencia).

El más instructivo es el primero. **Medimos que axe lo aprueba**: el `placeholder` cuenta como nombre accesible en el cálculo de *accname*, así que la regla `label` da el campo por bueno. Lo único que axe dice sobre ese input es que tiene un `tabindex` positivo — ni una palabra sobre la etiqueta que falta.

En cambio la comprobación escrita a mano del módulo 3 (prueba 05), que exige `<label for>` o `aria-label`, **sí lo encuentra**. Esa es la justificación concreta de por qué escribir aserciones propias no es redundante con pasar la herramienta.

> ⚠️ Las tres listas del módulo se obtuvieron **ejecutando** axe sobre la página, no leyendo documentación. Si actualiza `@axe-core/playwright` y una regla cambia de categoría, estas pruebas fallan y le dicen exactamente qué se movió. Es intencional: así el material no envejece en silencio.

### Módulo 4 — Regresión visual ([`modulo4-visual.spec.js`](playwright/tests/modulo4-visual.spec.js))

Detecta lo que ninguna aserción sobre el DOM ve: un botón que se salió del contenedor, un texto ilegible sobre una imagen, un formulario que se desborda en móvil. Para el DOM todo sigue en su sitio; para la persona, la pantalla está rota.

```bash
npm run test:visual        # comparar contra las referencias
npm run visual:update      # actualizar las referencias
```

> ⚠️ **El riesgo del patrón**: es cómodo actualizar las referencias sin mirar el diff, y ahí la prueba deja de proteger. Revise **siempre** la imagen de diferencias antes de aceptar una actualización.
>
> Las capturas dependen del sistema operativo y de las fuentes instaladas, así que una referencia generada en Windows no coincide con la de un runner Linux. Por eso el flujo de CI de este taller **no** ejecuta el módulo 4; en un proyecto real se generarían dentro del contenedor oficial de Playwright.

### Módulo 5 — Usabilidad con usuarios reales ([`docs/protocolo-pruebas-con-usuarios.md`](docs/protocolo-pruebas-con-usuarios.md))

El único módulo que **no se automatiza**, y por eso el que mejor explica qué es UX.

Cinco participantes, tareas planteadas como objetivos (no como instrucciones), medición de tasa de éxito de tarea y tiempo en tarea, y cuestionario **SUS** al final.

La pregunta que cierra el taller: *¿qué problema encontraron los usuarios que ninguna de las 27 pruebas automatizadas podía detectar?*

---

## Playwright o Selenium: ¿cuál hago?

**Las dos pistas cubren los mismos escenarios de negocio.** No son niveles: son herramientas alternativas.

| | Playwright | Selenium |
|---|---|---|
| Espera automática | Sí, en cada aserción | Manual (`WebDriverWait`) |
| Levanta la app | Sí (`webServer`) | No |
| Accesibilidad | `@axe-core/playwright` | requiere integración aparte |
| Regresión visual | `toHaveScreenshot()` nativo | requiere librería externa |
| Presencia en la industria | En fuerte crecimiento | Estándar histórico, enorme base instalada |
| Lenguajes | JS/TS, Python, Java, .NET | prácticamente todos |

**Recomendación**: haga la pista de **Playwright completa** (módulos 1 a 4) y la de **Selenium** solo para el módulo 2, de modo que pueda comparar el mismo Page Object en las dos herramientas. Sabrá defender una elección en una entrevista y reconocerá el patrón en cualquier código heredado.

> 📌 Versiones anteriores de este taller usaban Cypress. Se migró a Playwright porque soporta múltiples navegadores reales, no tiene las restricciones de mismo-origen de Cypress, trae regresión visual y accesibilidad de fábrica, y hoy tiene más tracción en la industria.

---

## PARA ENTREGAR CON ESTE TALLER

### 1) Repositorio

- Repositorio Git con URL de acceso público (o invitación).
- `.gitignore` que excluya `node_modules/`, `target/`, `test-results/` y `playwright-report/`.
- Integrantes en `integrantes.txt` o en el README.
- **Rama principal ejecutable**: `npm test` en verde sin pasos manuales.

> ⚠️ Verifique que el código quedó realmente versionado antes de entregar:
>
> ```bash
> git ls-files            # deben aparecer sus specs y páginas
> git status --ignored    # revise que no haya código fuente ignorado
> ```
>
> La prueba definitiva: clone su propio repositorio en otra carpeta y ejecute las pruebas.

### 2) Pruebas E2E (módulos 1 y 2)

- Al menos **8 escenarios** cubriendo las reglas de negocio desde la interfaz.
- Page Object Model aplicado: ninguna prueba contiene un localizador directo.
- **Cero** esperas fijas (`sleep`, `waitForTimeout(n)`).
- Localizadores por rol o texto visible; se penaliza el XPath absoluto.
- Pruebas **independientes**: cada una debe pasar ejecutada sola y en cualquier orden.

### 3) Accesibilidad (módulos 3 y 3B)

- Auditoría con axe de al menos **3 estados** de la interfaz (inicial, con error, con resultado).
- Cero violaciones de nivel AA en `index.html`, o justificación escrita de cada excepción.
- **Auditoría de [`/defectuosa.html`](registraduria/src/main/resources/static/defectuosa.html)**, con el informe de axe pegado en el Wiki. Debe reportar, para cada regla encontrada, **qué persona queda excluida** por ese defecto. Un informe copiado sin interpretar no cuenta.
- **Los 7 defectos del grupo C**: localícelos a mano (sin mirar los comentarios `[C-n]` del código hasta haber terminado) y explique, para cada uno, **por qué ninguna herramienta puede detectarlo**.
- **Análisis obligatorio en el Wiki**: ejecute axe sobre `defectuosa.html` **con y sin** el filtro `.withTags()`, y explique la diferencia. ¿Cuál de las 4 reglas que el filtro esconde le parece más grave, y por qué?

### 4) Regresión visual (módulo 4)

- Al menos **3 capturas de referencia**, una de ellas en viewport móvil.
- Evidencia de una regresión detectada: cambie un estilo a propósito, capture el diff y revierta.

### 5) Usabilidad con usuarios (módulo 5)

- Sesión con **5 participantes**, según [el protocolo](docs/protocolo-pruebas-con-usuarios.md).
- Tabla de resultados: tasa de éxito y tiempo por tarea.
- **SUS promedio** con su interpretación.
- Los **3 problemas más graves**, con severidad y cambio propuesto.
- Consentimiento de los participantes y datos anonimizados.

### 6) Gestión de defectos

- `defectos.md` con al menos **2 defectos**: uno funcional y uno de usabilidad o accesibilidad.
- Estado: Abierto / En progreso / Resuelto.

### 7) Integración continua

- Flujo que ejecute las pruebas en cada push (ver [`docs/cicd-guide.md`](docs/cicd-guide.md)).
- Publicación del reporte de Playwright como artefacto.

### 8) Reflexión final (en el Wiki)

- ¿Qué problema encontraron los usuarios reales que ninguna prueba automatizada detectó?
- ¿Qué encontró axe que usted no habría notado mirando la pantalla?
- ¿Qué le costó más: escribir las pruebas o mantenerlas estables?

---

## Rúbrica

| **Criterios de evaluación** | **Indicadores** | **Excelente (5 pts)** | **Bueno (4 pts)** | **Necesita mejorar (3.5 pts)** | **Deficiente (2.5 pts)** | **No cumple (0 pts)** |
|---|---|---|---|---|---|---|
| **Estructura y ejecución** | El proyecto corre con `npm test` sin pasos manuales. | Todo verde tras un clon limpio. | Corre con ajustes menores. | Requiere pasos no documentados. | Falla en varias pruebas. | No ejecuta. |
| **Pruebas E2E** **(vale por 2)** | Cobertura de las reglas de negocio desde la UI. | 8+ escenarios, todos independientes y estables. | 6–7 escenarios correctos. | Menos de 6, o alguno inestable. | Escenarios que no verifican nada. | No hay pruebas E2E. |
| **Calidad de los localizadores y esperas** | Estabilidad frente a cambios. | Localizadores por rol o texto; ninguna espera fija. | Alguna inconsistencia menor. | Mezcla de estrategias; alguna espera fija. | XPath absolutos o `sleep` generalizado. | Pruebas frágiles o acopladas al DOM. |
| **Page Object Model** | Separación entre qué se prueba y cómo se interactúa. | POM completo; ninguna prueba con localizadores. | POM con pequeñas fugas. | POM parcial. | Clases sin responsabilidad clara. | No aplica POM. |
| **Accesibilidad (axe / WCAG)** **(vale por 2)** | Auditoría y análisis crítico. | 3+ estados auditados, cero violaciones AA, informe de `defectuosa.html` interpretado y los 7 defectos del grupo C localizados a mano. | Auditoría completa; encuentra parte del grupo C o lo analiza en superficie. | Solo la página inicial auditada. | Ejecuta axe sin interpretar. | No audita accesibilidad. |
| **Regresión visual** | Detección de cambios no intencionales. | 3+ referencias, una móvil, con evidencia de una regresión detectada. | Referencias correctas sin evidencia de regresión. | 1–2 referencias. | Referencias actualizadas sin revisar el diff. | No aplica regresión visual. |
| **Usabilidad con usuarios** **(vale por 2)** | Sesión, métricas e interpretación. | 5 participantes, métricas por tarea, SUS interpretado y 3 problemas con severidad. | Sesión completa, análisis parcial. | Menos de 5 participantes o sin SUS. | Solo opiniones, sin métricas. | No realiza sesión. |
| **Gestión de defectos** | Registro y trazabilidad. | 2+ defectos bien documentados, uno de usabilidad. | Defectos presentes con detalle parcial. | Registro superficial. | Mención sin evidencia. | No entrega `defectos.md`. |
| **Integración continua** | Automatización del flujo. | CI que corre las pruebas y publica el reporte. | CI funcional básico. | CI parcial o inestable. | CI configurado pero fallando. | Sin CI. |
| **Documentación y reflexión** | Wiki con análisis. | Documentación completa con reflexión crítica. | Clara pero sin profundidad. | Incompleta. | Mínima. | Sin documentación. |

> **Cómo suma**: 13 criterios × 5 pts = **65 puntos**. Son 10 filas, pero *Pruebas E2E*, *Accesibilidad* y *Usabilidad con usuarios* valen por dos cada una — son el núcleo del taller.

| Rango de puntaje | Desempeño |
| ---------------- | --------- |
| 59 – 65 | Excelente dominio técnico y metodológico. |
| 46 – 58 | Buen trabajo con documentación o análisis parcial. |
| 39 – 45 | Cumple con lo básico pero sin profundidad. |
| < 39 | No cumple con los criterios mínimos del taller. |

---

## Conclusión

Las cinco técnicas del taller responden preguntas distintas, y ninguna sustituye a las demás:

| Técnica | Pregunta que responde |
|---|---|
| E2E | ¿La interfaz **funciona**? |
| Page Object Model | ¿Las pruebas **sobreviven** a un rediseño? |
| Accesibilidad (axe) | ¿Cumple lo que una máquina puede medir de WCAG? |
| Regresión visual | ¿Cambió algo **sin querer**? |
| Usabilidad con usuarios | ¿La gente **entiende** cómo usarla? |

Automatizar responde las cuatro primeras. La quinta solo se responde observando a personas — y suele ser la que decide si un producto se usa o se abandona.

---

## Créditos y uso académico

**Autor:** César Augusto Vega Fernández
**Curso:** Testing y Validación de Software
**Programa:** Maestría en Ingeniería de Software – Universidad de La Sabana

Material orientado a fortalecer las competencias en **pruebas de interfaz automatizadas, accesibilidad, regresión visual y evaluación de usabilidad**.

### Licencia de uso

Este material se distribuye bajo la licencia [Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es).

---

© Universidad de La Sabana – Facultad de Ingeniería
Maestría en Ingeniería de Software
