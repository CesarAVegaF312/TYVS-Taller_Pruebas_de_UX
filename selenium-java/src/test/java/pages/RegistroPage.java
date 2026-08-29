package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.Select;

/**
 * Page Object de la pagina de inscripcion de votantes.
 *
 * La prueba habla el lenguaje del negocio ("inscribir un votante") y esta
 * clase traduce eso a interacciones con el navegador. Si manana cambia el
 * identificador de un campo, se corrige AQUI y ninguna prueba se entera.
 *
 * Sobre los localizadores: se usan ids, que son el localizador mas estable.
 * Se evitan a proposito los XPath absolutos (/html/body/div[2]/form/div[3])
 * y las clases de CSS generadas, porque se rompen con cualquier rediseno.
 */
public class RegistroPage extends BasePage {

    private static final By NOMBRE = By.id("nombre");
    private static final By DOCUMENTO = By.id("documento");
    private static final By EDAD = By.id("edad");
    private static final By GENERO = By.id("genero");
    private static final By VIVO = By.id("vivo");
    private static final By BOTON_REGISTRAR = By.id("btn-registrar");
    private static final By RESULTADO_TITULO = By.id("resultado-titulo");
    private static final By ERROR_DOCUMENTO = By.id("error-documento");

    private final String baseUrl;

    public RegistroPage(WebDriver driver, String baseUrl) {
        super(driver);
        this.baseUrl = baseUrl;
    }

    public RegistroPage abrir() {
        driver.get(baseUrl + "/");
        waitForVisible(NOMBRE);
        return this;
    }

    public RegistroPage escribirNombre(String nombre) {
        type(NOMBRE, nombre);
        return this;
    }

    public RegistroPage escribirDocumento(int documento) {
        type(DOCUMENTO, String.valueOf(documento));
        return this;
    }

    public RegistroPage escribirEdad(int edad) {
        type(EDAD, String.valueOf(edad));
        return this;
    }

    public RegistroPage seleccionarGenero(String genero) {
        new Select(waitForVisible(GENERO)).selectByValue(genero);
        return this;
    }

    /** Marca o desmarca la casilla "La persona esta viva". */
    public RegistroPage marcarViva(boolean viva) {
        boolean actual = waitForVisible(VIVO).isSelected();
        if (actual != viva) {
            click(VIVO);
        }
        return this;
    }

    public RegistroPage registrar() {
        click(BOTON_REGISTRAR);
        return this;
    }

    /** Titulo del mensaje de resultado, esperando a que aparezca. */
    public String resultado() {
        return getText(RESULTADO_TITULO);
    }

    /** Mensaje de error del campo documento. */
    public String errorDocumento() {
        return getText(ERROR_DOCUMENTO);
    }

    /**
     * Inscribe a una persona en un solo paso.
     * Las pruebas que no necesitan controlar cada campo usan este atajo.
     */
    public RegistroPage inscribir(String nombre, int documento, int edad, String genero, boolean viva) {
        return escribirNombre(nombre)
                .escribirDocumento(documento)
                .escribirEdad(edad)
                .seleccionarGenero(genero)
                .marcarViva(viva)
                .registrar();
    }

    /** Genera un documento distinto en cada llamada. */
    public static int documentoUnico() {
        return (int) (Math.random() * 900000) + 100000;
    }
}
