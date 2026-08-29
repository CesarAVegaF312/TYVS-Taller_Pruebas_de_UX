# Guía de Selenium

Guía del módulo `selenium-java/`. Automatiza un navegador real (Chrome) para probar la interfaz de la **Registraduría** del propio repositorio.

A diferencia de versiones anteriores de este taller, no depende de ningún sitio externo: funciona sin internet y practica el ciclo realista de *levantar la aplicación y probarla*.

---

## Requisitos

| Herramienta | Versión |
|---|---|
| JDK | 17 o superior |
| Maven | 3.8+ |
| Chrome | reciente |

> 📌 **No hace falta descargar ChromeDriver.** Desde Selenium **4.6**, *Selenium Manager* viene incluido y resuelve el driver automáticamente. Versiones anteriores de este taller usaban la librería WebDriverManager para eso; ya es redundante y se eliminó.

---

## Ejecución

La Registraduría **debe estar corriendo antes**. Selenium, a diferencia de Playwright, no la levanta por su cuenta:

```bash
# Terminal 1 — el sistema bajo prueba
cd registraduria
mvn -DskipTests clean package
java -jar target/registraduria-1.0-SNAPSHOT.jar

# Terminal 2 — las pruebas
cd selenium-java
mvn test                     # navegador visible
mvn test -Dheadless=true     # sin interfaz, como en CI
```

Para apuntar a otra URL:

```bash
mvn test -Dbase.url=http://otro-host:9090
```

---

## Estructura

```text
selenium-java/src/test/java/
├── tests/
│   ├── BaseTest.java          # ciclo de vida del driver
│   ├── DriverFactory.java     # creación del ChromeDriver
│   └── RegistroUITest.java    # los 7 escenarios
└── pages/
    ├── BasePage.java          # esperas y acciones comunes
    └── RegistroPage.java      # Page Object del formulario
```

---

## Las dos decisiones de diseño que importan

### 1. Solo esperas explícitas

`BaseTest` **no** configura una espera implícita, y es deliberado:

```java
driver.manage().window().maximize();

// OJO: NO se configura una espera implícita.
wait = new WebDriverWait(driver, Duration.ofSeconds(10));
```

Mezclar esperas implícitas y explícitas produce tiempos de espera impredecibles: la implícita interfiere con el sondeo interno de `ExpectedConditions` y los tiempos efectivos dejan de ser los declarados. La documentación de Selenium lo desaconseja explícitamente.

Todas las esperas pasan por `BasePage`:

```java
protected WebElement waitForVisible(By locator) {
    return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
}
```

Y no hay un solo `Thread.sleep` en el proyecto. No debe haberlo en su entrega.

### 2. Localizadores por `id`

```java
private static final By DOCUMENTO = By.id("documento");
```

El `id` es el localizador más estable. Se evitan a propósito:

- **XPath absolutos** (`/html/body/div[2]/form/div[3]`) — se rompen si alguien inserta un `div`.
- **Clases de CSS generadas** (`.css-1x9k2h`) — cambian en cada build del framework de estilos.

---

## Page Object Model

`RegistroPage` traduce el lenguaje del negocio a interacciones con el navegador:

```java
registro.inscribir("Sara Gomez", documento, 17, "FEMALE", true);
assertEquals("Persona menor de edad", registro.resultado());
```

El beneficio aparece cuando la interfaz cambia: si el `id` del botón cambia, se corrige en **un** lugar y los 7 escenarios siguen funcionando.

Los métodos devuelven `this` para poder encadenarlos:

```java
registro.escribirNombre("Error Esperado")
        .escribirDocumento(-5)
        .escribirEdad(30)
        .registrar();
```

---

## Comparación con Playwright

Los mismos escenarios están implementados en `playwright/tests/modulo2-pom.spec.js`. Compárelos:

| | Playwright | Selenium |
|---|---|---|
| Espera automática | En cada aserción | Manual (`WebDriverWait`) |
| Levanta la aplicación | Sí (`webServer`) | No |
| Accesibilidad | `@axe-core/playwright` | integración aparte |
| Regresión visual | `toHaveScreenshot()` nativo | librería externa |
| Lenguajes | JS/TS, Python, Java, .NET | prácticamente todos |
| Base instalada | En crecimiento | Enorme, mucho código heredado |

Saber las dos le permite defender una elección y reconocer el patrón en cualquier proyecto existente.

---

## Ejercicios

1. Añada un escenario para el valor límite de edad `120` (válido) y `121`. ¿Qué responde la interfaz? ¿Es lo que esperaba?
2. Cambie el `id` del botón en `index.html`. ¿Cuántos archivos tuvo que tocar para que las pruebas vuelvan a pasar? Ese número es la medida del valor del POM.
3. Reemplace un localizador por un XPath absoluto, inserte un `div` en el HTML y observe qué pasa.

---

## Recursos

- [Documentación de Selenium](https://www.selenium.dev/documentation/)
- [Selenium Manager](https://www.selenium.dev/documentation/selenium_manager/) — sustituye a WebDriverManager desde Selenium 4.6
- [Esperas en Selenium](https://www.selenium.dev/documentation/webdriver/waits/)
