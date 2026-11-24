package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.JugadaRegistrada;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.locks.ReentrantLock;

/** Estado vivo de una partida. Solo se toca con {@link #candado} tomado (un escritor por partida). */
final class PartidaEnMemoria {

    enum Fase { ESPERANDO_ROBO, ESPERANDO_DESCARTE, ENTRE_RONDAS, FINALIZADA }

    static final class Asiento {
        final Participante participante;
        final List<Carta> mano = new ArrayList<>();
        int marcador;
        boolean activo = true;

        Asiento(Participante participante) {
            this.participante = participante;
        }

        String id() {
            return participante.sub();
        }
    }

    final long id;
    final ConfiguracionReglas cfg;
    final List<Asiento> asientos = new ArrayList<>();
    final ReentrantLock candado = new ReentrantLock();
    final List<JugadaRegistrada> jugadas = new ArrayList<>();
    Fase fase = Fase.ENTRE_RONDAS;
    int indiceAbridor = -1;
    int indiceTurno;
    int numeroTurno;
    int numeroRonda;
    String claveMazo;
    String huella;
    long rondaId;
    Carta ultimaRobada;
    /** Jugadores con todas sus sesiones cerradas. Al iniciar nadie esta aqui: se presume presencia (ADR-08b). */
    final Set<String> desconectados = new HashSet<>();
    /** Inicio del turno vigente (o de su reanudacion tras una pausa) y su hora limite; null = mesa en pausa. */
    Instant inicioTurno;
    Instant venceEn;
    /** Cambia con cada programacion: un vencimiento de otra generacion ya no vale (ADR-08b). */
    long generacion;

    PartidaEnMemoria(long id, ConfiguracionReglas cfg, List<Participante> jugadores) {
        this.id = id;
        this.cfg = cfg;
        jugadores.forEach(j -> asientos.add(new Asiento(j)));
    }

    Asiento asientoEnTurno() {
        return asientos.get(indiceTurno);
    }

    Asiento asientoDe(String jugadorId) {
        return asientos.stream().filter(a -> a.id().equals(jugadorId)).findFirst().orElse(null);
    }

    int siguienteActivo(int desde) {
        int i = desde;
        do {
            i = (i + 1) % asientos.size();
        } while (!asientos.get(i).activo);
        return i;
    }

    /** Asientos activos empezando por quien abre, en el orden del reparto. */
    List<Asiento> ordenDeReparto() {
        List<Asiento> r = new ArrayList<>();
        int i = indiceAbridor;
        do {
            r.add(asientos.get(i));
            i = siguienteActivo(i);
        } while (i != indiceAbridor);
        return r;
    }

    Map<String, Integer> marcadorDeActivos() {
        Map<String, Integer> m = new LinkedHashMap<>();
        asientos.stream().filter(a -> a.activo).forEach(a -> m.put(a.id(), a.marcador));
        return m;
    }

    Map<String, Integer> marcadorDeTodos() {
        Map<String, Integer> m = new LinkedHashMap<>();
        asientos.forEach(a -> m.put(a.id(), a.marcador));
        return m;
    }

    boolean conectado(String jugadorId) {
        return !desconectados.contains(jugadorId);
    }

    /** Ningun jugador de la partida tiene una sesion abierta: la mesa se pausa. */
    boolean mesaVacia() {
        return asientos.stream().allMatch(a -> desconectados.contains(a.id()));
    }

    List<String> conectados() {
        return asientos.stream().map(Asiento::id).filter(this::conectado).toList();
    }

    void registrar(String jugadorId, String accion, String carta, Instant cuando) {
        jugadas.add(new JugadaRegistrada(numeroTurno, jugadas.size() + 1, jugadorId, accion, carta, cuando));
    }
}
