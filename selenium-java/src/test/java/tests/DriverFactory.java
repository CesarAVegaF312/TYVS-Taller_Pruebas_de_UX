package tests;


import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

/**
 * Factory para crear instancias de WebDriver.
 * Soporta modo headless para CI/CD.
 */
public class DriverFactory {

    private DriverFactory() {}

    public static WebDriver createChromeDriver() {
        // Selenium Manager (incluido desde Selenium 4.6) descarga y configura
        // el driver del navegador automaticamente. No hace falta ni bajar
        // chromedriver a mano ni una libreria extra.

        ChromeOptions options = new ChromeOptions();

        // Headless si se pasa -Dheadless=true (usado en CI)
        boolean headless = Boolean.parseBoolean(System.getProperty("headless", "false"));
        if (headless) {
            options.addArguments("--headless=new");
            options.addArguments("--no-sandbox");
            options.addArguments("--disable-dev-shm-usage");
            options.addArguments("--window-size=1920,1080");
        }

        return new ChromeDriver(options);
    }
}
