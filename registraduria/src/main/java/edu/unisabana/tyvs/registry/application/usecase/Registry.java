package edu.unisabana.tyvs.registry.application.usecase;

import edu.unisabana.tyvs.registry.application.port.out.RegistryRepositoryPort;
import edu.unisabana.tyvs.registry.domain.model.Person;
import edu.unisabana.tyvs.registry.domain.model.RegisterResult;

/**
 * Caso de uso: registrar un votante.
 *
 * Las reglas son las MISMAS que en los talleres de pruebas unitarias, de
 * integracion y de carga. Es la misma Registraduria.
 *
 * DETALLE QUE IMPORTA EN ESTE TALLER: la regla de INVALID_AGE tambien esta
 * implementada en el navegador (app.js valida 0 <= edad <= 120). No es
 * duplicacion por descuido, es defensa en profundidad, y cada capa cumple una
 * funcion distinta:
 *
 *   - la del navegador da retroalimentacion inmediata y evita un viaje al
 *     servidor; es una cortesia, no una garantia
 *   - la del servidor es la que de verdad protege el dato, porque la API se
 *     puede llamar sin pasar por la interfaz (el taller de carga hace
 *     exactamente eso)
 *
 * La consecuencia practica es que una persona usando el formulario NUNCA vera
 * la respuesta INVALID_AGE: el navegador la detiene antes. Eso no significa
 * que sobre la validacion del servidor, significa que hace falta probarla por
 * otra via. Ver modulo1-e2e.spec.js, prueba 09.
 */
public class Registry {

    /** Edad minima para votar. */
    public static final int MIN_AGE = 18;

    /** Edad maxima biologicamente posible; por encima, el dato es imposible. */
    public static final int MAX_AGE = 120;

    private final RegistryRepositoryPort repo;

    public Registry(RegistryRepositoryPort repo) {
        this.repo = repo;
    }

    public RegisterResult registerVoter(Person p) {
        if (p == null)
            return RegisterResult.INVALID;
        if (p.getId() <= 0)
            return RegisterResult.INVALID;
        if (!p.isAlive())
            return RegisterResult.DEAD;
        // El orden importa: una edad imposible se descarta ANTES de preguntar
        // si es menor de edad. Si se invirtiera, -1 caeria en la rama de
        // UNDERAGE e INVALID_AGE quedaria inalcanzable.
        if (p.getAge() < 0 || p.getAge() > MAX_AGE)
            return RegisterResult.INVALID_AGE;
        if (p.getAge() < MIN_AGE)
            return RegisterResult.UNDERAGE;

        try {
            if (repo.existsById(p.getId()))
                return RegisterResult.DUPLICATED;
            repo.save(p.getId(), p.getName(), p.getAge(), p.isAlive());
            return RegisterResult.VALID;
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo registrar al votante", e);
        }
    }
}
