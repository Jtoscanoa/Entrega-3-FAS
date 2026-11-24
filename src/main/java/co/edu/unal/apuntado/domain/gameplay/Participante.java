package co.edu.unal.apuntado.domain.gameplay;

/** Jugador humano: {@code sub} es el identificador del token OIDC (ADR-07). */
public record Participante(String sub, String alias) {
}
