package co.edu.unal.apuntado.domain.gameplay.mazo;

import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import java.util.List;
import java.util.Optional;

/** Barajado, reparto y reposicion. Nunca expone el orden del mazo. */
public interface IMazo {

    /** Baraja, sella y devuelve la huella publicable. */
    String abrirRonda(String clave, ConfiguracionReglas cfg, int jugadores);

    /** Reparte: la primera mano (quien abre) trae 11 cartas; las demas, 10. Voltea la primera carta de la pila. */
    List<List<Carta>> repartir(String clave, int jugadores);

    Robo robarDelMazo(String clave);

    Optional<Carta> tomarDescarte(String clave);

    void descartar(String clave, Carta carta);

    Optional<Carta> cimaDescarte(String clave);

    void liberar(String clave);
}
