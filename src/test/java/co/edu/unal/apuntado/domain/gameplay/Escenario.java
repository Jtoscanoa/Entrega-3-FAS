package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.gameplay.auditoria.DealAuditComponent;
import co.edu.unal.apuntado.domain.gameplay.auditoria.IAuditoriaReparto;
import co.edu.unal.apuntado.domain.gameplay.auditoria.OrdenMazo;
import co.edu.unal.apuntado.domain.gameplay.mazo.IMazo;
import co.edu.unal.apuntado.domain.gameplay.mazo.Robo;
import co.edu.unal.apuntado.domain.rules.GameConfigurationComponent;
import co.edu.unal.apuntado.domain.rules.HandEvaluatorComponent;
import co.edu.unal.apuntado.domain.rules.IEvaluadorMano;
import co.edu.unal.apuntado.domain.rules.RegistroReglas;
import co.edu.unal.apuntado.domain.rules.RoundScoringComponent;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState;
import co.edu.unal.apuntado.infrastructure.persistence.LiquidacionDuplicadaException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/** Dobles de prueba y cableado manual (sin Spring) del orquestador con el motor de reglas real. */
final class Escenario {

    /** Mano de quien abre: cuarta de 7, escalera 2-3-4 de corazones, terna de 9 y un descarte (5D). */
    static final String MANO_CLASICA_GANADORA = "7C 7D 7T 7P 2C 3C 4C 9D 9T 9P 5D";
    /** Tres ternas + 4T de residuo + descarte AD. */
    static final String MANO_APUNTADA_CON_RESIDUO = "5C 6C 7C 8D 8T 8P JC QC KC 4T AD";
    static final String MANO_RIVAL = "AC 3D 5T 8P JC KD 2P 6C 9C 10D";

    static List<Carta> cartas(String texto) {
        return Arrays.stream(texto.trim().split("\\s+")).map(Carta::deCodigo).toList();
    }

    /** Mazo determinista: reparte las manos dadas, roba de una cola fija y sella con la auditoria real. */
    static final class MazoFalso implements IMazo {
        private final List<List<Carta>> manos;
        private final Deque<Carta> cola = new ArrayDeque<>(cartas("2D 3T 4P 6D 7T 8C 9P 10C JD QP KC AT 2T 3P 4C 5C"));
        private final Deque<Carta> pila = new ArrayDeque<>();
        IAuditoriaReparto auditoria;

        MazoFalso(String... manos) {
            this.manos = Arrays.stream(manos).map(Escenario::cartas).toList();
        }

        @Override
        public String abrirRonda(String clave, ConfiguracionReglas cfg, int jugadores) {
            return auditoria.sellar(clave, new OrdenMazo(List.of("2D", "3T", clave)));
        }

        @Override
        public List<List<Carta>> repartir(String clave, int jugadores) {
            pila.clear();
            pila.push(Carta.deCodigo("4D"));
            List<List<Carta>> r = new ArrayList<>();
            for (int i = 0; i < jugadores; i++) {
                r.add(new ArrayList<>(manos.get(i % manos.size())));
            }
            return r;
        }

        @Override
        public synchronized Robo robarDelMazo(String clave) {
            return new Robo(cola.pollFirst(), Optional.empty());
        }

        @Override
        public Optional<Carta> tomarDescarte(String clave) {
            return Optional.ofNullable(pila.pollFirst());
        }

        @Override
        public void descartar(String clave, Carta carta) {
            pila.push(carta);
        }

        @Override
        public Optional<Carta> cimaDescarte(String clave) {
            return Optional.ofNullable(pila.peekFirst());
        }

        @Override
        public void liberar(String clave) {
            pila.clear();
            auditoria.olvidar(clave);
        }
    }

    static final class EstadoFalso implements IMatchState {
        final AtomicInteger liquidaciones = new AtomicInteger();
        final AtomicInteger intentos = new AtomicInteger();
        final List<LiquidacionRonda> guardadas = new CopyOnWriteArrayList<>();
        volatile boolean fallar;
        /** D9: el registro del inicio de ronda falla mientras sea true (BD caida tras una liquidacion). */
        volatile boolean fallarInicioRonda;
        private final AtomicInteger rondas = new AtomicInteger();
        private final Set<Long> liquidadas = ConcurrentHashMap.newKeySet();

        @Override
        public long guardarPartida(NuevaPartida partida) {
            return 1L;
        }

        @Override
        public long registrarInicioRonda(long partidaId, int numero, String huellaSha256, String abridorSub) {
            if (fallarInicioRonda) {
                throw new IllegalStateException("fallo inyectado al registrar la ronda " + numero);
            }
            return rondas.incrementAndGet();
        }

        @Override
        public void guardarLiquidacion(LiquidacionRonda l) {
            intentos.incrementAndGet();
            if (fallar) {
                throw new IllegalStateException("fallo inyectado a mitad de la liquidacion");
            }
            if (!liquidadas.add(l.rondaId())) {
                throw new LiquidacionDuplicadaException(l.rondaId());
            }
            liquidaciones.incrementAndGet();
            guardadas.add(l);
        }

        @Override
        public Recuperacion anularPartidasEnCurso() {
            return new Recuperacion(List.of(), List.of());
        }
    }

    static final class ProgramadorManual implements ProgramadorTurnos {
        final List<Runnable> pendientes = new CopyOnWriteArrayList<>();
        final List<Duration> esperas = new CopyOnWriteArrayList<>();

        @Override
        public void programar(Duration espera, Runnable accion) {
            pendientes.add(accion);
            esperas.add(espera);
        }

        Runnable ultimo() {
            return pendientes.get(pendientes.size() - 1);
        }

        Duration ultimaEspera() {
            return esperas.get(esperas.size() - 1);
        }
    }

    static final Instant AHORA = Instant.parse("2026-11-16T12:00:00Z");

    final List<EventoDominio> eventos = new CopyOnWriteArrayList<>();
    final EstadoFalso estado = new EstadoFalso();
    final ProgramadorManual programador = new ProgramadorManual();
    final IAuditoriaReparto auditoria = new DealAuditComponent(new SecureRandom());
    final TurnOrchestratorComponent orquestador;

    Escenario(IMazo mazo) {
        this(mazo, new HandEvaluatorComponent(new RegistroReglas()));
    }

    /** Con otro evaluador (p. ej. un registro con una variante de prueba, FF-13). */
    Escenario(IMazo mazo, IEvaluadorMano evaluador) {
        if (mazo instanceof MazoFalso falso) {
            falso.auditoria = auditoria;
        }
        IEventosPartida colector = eventos::add;
        orquestador = new TurnOrchestratorComponent(evaluador,
                new RoundScoringComponent(), new GameConfigurationComponent(), mazo, auditoria, estado, colector,
                programador, Clock.fixed(AHORA, ZoneOffset.UTC));
    }

    long iniciar(ConfiguracionReglas cfg, int jugadores) {
        List<Participante> ps = new ArrayList<>();
        for (int i = 0; i < jugadores; i++) {
            ps.add(new Participante("sub-" + (char) ('a' + i), "jugador" + i));
        }
        return orquestador.iniciarPartida("K7Q2ZP", cfg, ps);
    }

    <T extends EventoDominio> List<T> eventosDe(Class<T> tipo) {
        return eventos.stream().filter(tipo::isInstance).map(tipo::cast).toList();
    }
}
