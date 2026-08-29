package tests;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Clase base para todos los tests.
 * Inicializa y cierra el driver automáticamente.
 */
public abstract class BaseTest {

    /** URL del sistema bajo prueba; configurable con -Dbase.url=... */
    protected static final String BASE_URL =
            System.getProperty("base.url", "http://localhost:8080");

    protected WebDriver driver;
    protected WebDriverWait wait;

    @BeforeEach
    void setUp() {
        driver = DriverFactory.createChromeDriver();
        driver.manage().window().maximize();

        // OJO: NO se configura una espera implicita. Mezclar esperas
        // implicitas y explicitas produce tiempos impredecibles: la implicita
        // interfiere con el sondeo interno de ExpectedConditions. La propia
        // documentacion de Selenium lo desaconseja. Aqui usamos SOLO esperas
        // explicitas, a traves de BasePage.
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
