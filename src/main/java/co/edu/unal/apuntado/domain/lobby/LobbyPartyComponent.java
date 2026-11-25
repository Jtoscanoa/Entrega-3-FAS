package co.edu.unal.apuntado.domain.lobby;

import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.domain.gameplay.Participante;
import co.edu.unal.apuntado.domain.lobby.LobbyException.Motivo;
import co.edu.unal.apuntado.domain.rules.IConfiguracion;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.random.RandomGenerator;

/** Salas privadas por codigo de 6 caracteres (RF01). Los bots llegan en la Fase 2. */
public final class LobbyPartyComponent implements ILobby {

    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int LARGO_CODIGO = 6;

    private static final class Sala {
        private final List<Participante> jugadores = new ArrayList<>();
        private boolean enJuego;
        private Long partidaId;
    }

    private final ITurno turnos;
    private final IConfiguracion configuracion;
    private final RandomGenerator azar;
    private final Map<String, Sala> salas = new ConcurrentHashMap<>();

    public LobbyPartyComponent(ITurno turnos, IConfiguracion configuracion, RandomGenerator azar) {
        this.turnos = turnos;
        this.configuracion = configuracion;
        this.azar = azar;
    }

    @Override
    public String crearSala(String sub, String alias) {
        String codigo;
        Sala sala = new Sala();
        sala.jugadores.add(new Participante(sub, alias));
        do {
            codigo = nuevoCodigo();
        } while (salas.putIfAbsent(codigo, sala) != null);
        return codigo;
    }

    @Override
    public List<String> unirse(String codigo, String sub, String alias) {
        Sala sala = obtener(codigo);
        synchronized (sala) {
            if (sala.enJuego) {
                throw new LobbyException(Motivo.SALA_EN_JUEGO);
            }
            if (sala.jugadores.stream().noneMatch(j -> j.sub().equals(sub))) {
                if (sala.jugadores.size() >= ConfiguracionReglas.JUGADORES_MAXIMO) {
                    throw new LobbyException(Motivo.SALA_LLENA);
                }
                sala.jugadores.add(new Participante(sub, alias));
            }
            return sala.jugadores.stream().map(Participante::alias).toList();
        }
    }

    @Override
    public long iniciar(String codigo, String sub, OpcionesPartida opciones) {
        Sala sala = obtener(codigo);
        synchronized (sala) {
            if (!sala.jugadores.get(0).sub().equals(sub)) {
                throw new LobbyException(Motivo.NO_ES_ANFITRION);
            }
            if (sala.enJuego) {
                throw new LobbyException(Motivo.SALA_EN_JUEGO);
            }
            if (sala.jugadores.size() < ConfiguracionReglas.JUGADORES_MINIMO) {
                throw new LobbyException(Motivo.JUGADORES_INSUFICIENTES);
            }
            long id = turnos.iniciarPartida(codigo, configurar(opciones), List.copyOf(sala.jugadores));
            sala.enJuego = true;
            sala.partidaId = id;
            return id;
        }
    }

    @Override
    public EstadoSala estado(String codigo) {
        Sala sala = obtener(codigo);
        synchronized (sala) {
            return new EstadoSala(codigo, sala.jugadores.get(0).sub(), List.copyOf(sala.jugadores), sala.partidaId);
        }
    }

    private ConfiguracionReglas configurar(OpcionesPartida o) {
        ConfiguracionReglas base = configuracion.predeterminada(o.modalidad());
        return base.conComodines(Boolean.TRUE.equals(o.comodines()))
                .conRobarDelDescarte(Boolean.TRUE.equals(o.robarDelDescarte()))
                .conCierreAPintas(Boolean.TRUE.equals(o.cierreAPintas()))
                .conSegundoMazo(Boolean.TRUE.equals(o.segundoMazo()))
                .conUmbral(o.umbral() == null ? base.umbralEliminacion() : o.umbral())
                .conSegundosPorTurno(o.segundosPorTurno() == null ? base.segundosPorTurno() : o.segundosPorTurno())
                .conResiduoMaximo(o.residuoMaximo() == null ? base.residuoMaximo() : o.residuoMaximo());
    }

    private Sala obtener(String codigo) {
        Sala s = salas.get(codigo);
        if (s == null) {
            throw new LobbyException(Motivo.SALA_INEXISTENTE);
        }
        return s;
    }

    private String nuevoCodigo() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < LARGO_CODIGO; i++) {
            sb.append(ALFABETO.charAt(azar.nextInt(ALFABETO.length())));
        }
        return sb.toString();
    }
}
