package tests;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pages.RegistroPage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de UI de la Registraduria con Selenium y Page Object Model.
 *
 * Esta es la pista alternativa a Playwright: los MISMOS escenarios, otra
 * herramienta. La comparacion es deliberada, y en el README se analiza que
 * gana y que pierde cada una.
 *
 * PRERREQUISITO: el servicio debe estar corriendo en http://localhost:8080.
 * A diferencia de Playwright, Selenium no levanta la aplicacion por su cuenta;
 * hay que arrancarla antes (ver el README).
 */
@DisplayName("UI de inscripcion de votantes (Selenium)")
class RegistroUITest extends BaseTest {

    private RegistroPage registro;

    @BeforeEach
    void abrirPagina() {
        registro = new RegistroPage(driver, BASE_URL).abrir();
    }

    @Test
    @DisplayName("01 - La pagina carga con el titulo correcto")
    void laPaginaCargaConElTituloCorrecto() {
        assertTrue(registro.getTitle().contains("Registraduría"),
                "El titulo fue: " + registro.getTitle());
    }

    @Test
    @DisplayName("02 - Una persona adulta y viva queda inscrita")
    void personaValidaQuedaInscrita() {
        registro.inscribir("Ana Martinez", RegistroPage.documentoUnico(), 30, "FEMALE", true);

        assertEquals("Inscripción exitosa", registro.resultado());
    }

    @Test
    @DisplayName("03 - Una persona de 17 anios es rechazada")
    void menorDeEdadEsRechazado() {
        registro.inscribir("Sara Gomez", RegistroPage.documentoUnico(), 17, "FEMALE", true);

        assertEquals("Persona menor de edad", registro.resultado());
    }

    @Test
    @DisplayName("04 - Una persona de 18 anios queda inscrita (valor limite)")
    void adultoEnElLimiteQuedaInscrito() {
        registro.inscribir("Justo Mayor", RegistroPage.documentoUnico(), 18, "MALE", true);

        assertEquals("Inscripción exitosa", registro.resultado());
    }

    @Test
    @DisplayName("05 - Una persona no viva es rechazada")
    void personaNoVivaEsRechazada() {
        registro.inscribir("Pedro Ruiz", RegistroPage.documentoUnico(), 45, "MALE", false);

        assertEquals("Persona no viva", registro.resultado());
    }

    @Test
    @DisplayName("06 - Un documento repetido es rechazado")
    void documentoRepetidoEsRechazado() {
        int documento = RegistroPage.documentoUnico();

        registro.inscribir("Primera Vez", documento, 40, "MALE", true);
        assertEquals("Inscripción exitosa", registro.resultado());

        registro.inscribir("Segunda Vez", documento, 40, "MALE", true);
        assertEquals("Documento ya inscrito", registro.resultado());
    }

    @Test
    @DisplayName("07 - Un documento negativo se rechaza en el navegador")
    void documentoNegativoSeRechazaEnElNavegador() {
        registro.escribirNombre("Error Esperado")
                .escribirDocumento(-5)
                .escribirEdad(30)
                .registrar();

        assertEquals("El documento debe ser un número mayor que cero.",
                registro.errorDocumento());
    }
}
