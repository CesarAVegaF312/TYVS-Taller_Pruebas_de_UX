package tests;


import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.net.MalformedURLException;
import java.net.URI;

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

        // Navegador remoto si se pasa -Dselenium.remote.url=http://localhost:4444
        // (el Selenium Grid de docker compose). El navegador corre en el
        // contenedor, asi que no depende del Chrome ni del chromedriver del equipo.
        String remoteUrl = System.getProperty("selenium.remote.url", "");
        if (!remoteUrl.isBlank()) {
            try {
                return new RemoteWebDriver(URI.create(remoteUrl).toURL(), options);
            } catch (MalformedURLException e) {
                throw new IllegalArgumentException("selenium.remote.url invalida: " + remoteUrl, e);
            }
        }

        return new ChromeDriver(options);
    }
}
