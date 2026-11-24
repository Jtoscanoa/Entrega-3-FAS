package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.Combinacion;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoLiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.CartaEnMano;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.LiquidacionRonda;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.ManoLiquidada;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.PuntajeRonda;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Traduce el estado inmutable de una liquidacion al DTO de persistencia. Sin reglas: solo forma. */
final class InstantaneaLiquidacion {

    private InstantaneaLiquidacion() {
    }

    static LiquidacionRonda construir(PartidaEnMemoria p, String cerrador, List<Carta> manoCerrador,
                                      ResultadoValidacion cierre, Map<String, Agrupacion> agrupaciones,
                                      ResultadoLiquidacion liq, String sal, String orden) {
        List<ManoLiquidada> manos = new ArrayList<>();
        manos.add(new ManoLiquidada(cerrador, liq.puntosRonda().get(cerrador), true,
                posiciones(manoCerrador, List.of())));
        agrupaciones.forEach((id, g) -> manos.add(new ManoLiquidada(id, liq.puntosRonda().get(id), false,
                posiciones(cartasDe(g), g.combinaciones()))));
        List<PuntajeRonda> puntajes = new ArrayList<>();
        liq.marcador().forEach((id, total) -> puntajes.add(new PuntajeRonda(id,
                liq.eliminados().contains(id) ? "ELIMINADO" : "RONDA", liq.puntosRonda().get(id), total)));
        return new LiquidacionRonda(p.id, p.rondaId, cerrador, cierre.tipo().name(), manos, puntajes,
                p.jugadas, sal, orden, List.copyOf(liq.eliminados()), liq.ganador().orElse(null));
    }

    private static List<Carta> cartasDe(Agrupacion g) {
        List<Carta> todas = new ArrayList<>();
        g.combinaciones().forEach(c -> todas.addAll(c.cartas()));
        todas.addAll(g.sueltas());
        return todas;
    }

    /** Asigna a cada carta el numero (1..k) de su combinacion, o null si quedo suelta. */
    private static List<CartaEnMano> posiciones(List<Carta> cartas, List<Combinacion> combinaciones) {
        Integer[] asignacion = new Integer[cartas.size()];
        for (int k = 0; k < combinaciones.size(); k++) {
            for (Carta c : combinaciones.get(k).cartas()) {
                asignacion[primeraLibre(cartas, asignacion, c)] = k + 1;
            }
        }
        List<CartaEnMano> r = new ArrayList<>();
        for (int i = 0; i < cartas.size(); i++) {
            r.add(new CartaEnMano(i + 1, cartas.get(i).codigo(), asignacion[i]));
        }
        return r;
    }

    private static int primeraLibre(List<Carta> cartas, Integer[] asignacion, Carta buscada) {
        for (int i = 0; i < cartas.size(); i++) {
            if (asignacion[i] == null && cartas.get(i).equals(buscada)) {
                return i;
            }
        }
        throw new IllegalStateException("Carta de combinacion ausente en la mano: " + buscada.codigo());
    }
}
