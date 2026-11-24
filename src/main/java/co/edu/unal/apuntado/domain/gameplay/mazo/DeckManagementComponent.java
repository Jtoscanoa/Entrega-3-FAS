package co.edu.unal.apuntado.domain.gameplay.mazo;

import co.edu.unal.apuntado.domain.gameplay.auditoria.IAuditoriaReparto;
import co.edu.unal.apuntado.domain.gameplay.auditoria.OrdenMazo;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.Pinta;
import co.edu.unal.apuntado.domain.rules.modelo.Valor;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.random.RandomGenerator;

/** Fisher-Yates sobre un generador criptografico; el estado de cada ronda se usa bajo el candado de la partida. */
public final class DeckManagementComponent implements IMazo {

    private static final int CARTAS_ABRIDOR = 11;
    private static final int CARTAS_RESTO = 10;
    private static final int COMODINES_POR_MAZO = 2;

    private static final class EstadoMazo {
        private final Deque<Carta> mazo = new ArrayDeque<>();
        private final Deque<Carta> pila = new ArrayDeque<>();
        private int reposiciones;
    }

    private final IAuditoriaReparto auditoria;
    private final RandomGenerator azar;
    private final Map<String, EstadoMazo> rondas = new ConcurrentHashMap<>();

    public DeckManagementComponent(IAuditoriaReparto auditoria, RandomGenerator azar) {
        this.auditoria = auditoria;
        this.azar = azar;
    }

    @Override
    public String abrirRonda(String clave, ConfiguracionReglas cfg, int jugadores) {
        if (!cfg.admiteJugadores(jugadores)) {
            throw new IllegalArgumentException("Mesa no admitida: " + jugadores + " jugadores");
        }
        List<Carta> baraja = nuevaBaraja(cfg);
        barajar(baraja);
        EstadoMazo estado = new EstadoMazo();
        estado.mazo.addAll(baraja);
        if (rondas.putIfAbsent(clave, estado) != null) {
            throw new IllegalStateException("La ronda ya esta abierta: " + clave);
        }
        return auditoria.sellar(clave, ordenDe(baraja));
    }

    @Override
    public List<List<Carta>> repartir(String clave, int jugadores) {
        EstadoMazo e = estado(clave);
        List<List<Carta>> manos = new ArrayList<>();
        for (int i = 0; i < jugadores; i++) {
            int cuantas = i == 0 ? CARTAS_ABRIDOR : CARTAS_RESTO;
            List<Carta> mano = new ArrayList<>();
            for (int k = 0; k < cuantas; k++) {
                mano.add(e.mazo.pollFirst());
            }
            manos.add(mano);
        }
        e.pila.push(e.mazo.pollFirst());
        return manos;
    }

    @Override
    public Robo robarDelMazo(String clave) {
        EstadoMazo e = estado(clave);
        Optional<String> huella = e.mazo.isEmpty() ? Optional.of(reponer(clave, e)) : Optional.empty();
        return new Robo(e.mazo.pollFirst(), huella);
    }

    @Override
    public Optional<Carta> tomarDescarte(String clave) {
        return Optional.ofNullable(estado(clave).pila.pollFirst());
    }

    @Override
    public void descartar(String clave, Carta carta) {
        estado(clave).pila.push(carta);
    }

    @Override
    public Optional<Carta> cimaDescarte(String clave) {
        return Optional.ofNullable(estado(clave).pila.peekFirst());
    }

    @Override
    public void liberar(String clave) {
        rondas.remove(clave);
        auditoria.olvidar(clave);
    }

    private String reponer(String clave, EstadoMazo e) {
        if (e.pila.size() < 2) {
            throw new MazoAgotadoException(clave);
        }
        Carta cima = e.pila.pollFirst();
        List<Carta> resto = new ArrayList<>(e.pila);
        e.pila.clear();
        e.pila.push(cima);
        barajar(resto);
        e.mazo.addAll(resto);
        e.reposiciones++;
        return auditoria.sellar(clave + "#r" + e.reposiciones, ordenDe(resto));
    }

    private EstadoMazo estado(String clave) {
        EstadoMazo e = rondas.get(clave);
        if (e == null) {
            throw new IllegalStateException("Ronda no abierta: " + clave);
        }
        return e;
    }

    private static List<Carta> nuevaBaraja(ConfiguracionReglas cfg) {
        List<Carta> baraja = new ArrayList<>();
        int mazos = cfg.segundoMazo() ? 2 : 1;
        for (int m = 0; m < mazos; m++) {
            for (Pinta p : Pinta.values()) {
                for (Valor v : Valor.values()) {
                    baraja.add(new Carta(v, p));
                }
            }
            if (cfg.comodinesHabilitados()) {
                baraja.addAll(Collections.nCopies(COMODINES_POR_MAZO, Carta.COMODIN));
            }
        }
        return baraja;
    }

    private void barajar(List<Carta> cartas) {
        for (int i = cartas.size() - 1; i > 0; i--) {
            Collections.swap(cartas, i, azar.nextInt(i + 1));
        }
    }

    private static OrdenMazo ordenDe(List<Carta> cartas) {
        return new OrdenMazo(cartas.stream().map(Carta::codigo).toList());
    }
}
