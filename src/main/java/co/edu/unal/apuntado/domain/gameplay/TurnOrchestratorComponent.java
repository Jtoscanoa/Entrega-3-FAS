package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.gameplay.EventoDominio.Origen;
import co.edu.unal.apuntado.domain.gameplay.PartidaEnMemoria.Asiento;
import co.edu.unal.apuntado.domain.gameplay.PartidaEnMemoria.Fase;
import co.edu.unal.apuntado.domain.gameplay.auditoria.IAuditoriaReparto;
import co.edu.unal.apuntado.domain.gameplay.auditoria.RevelacionReparto;
import co.edu.unal.apuntado.domain.gameplay.mazo.IMazo;
import co.edu.unal.apuntado.domain.gameplay.mazo.Robo;
import co.edu.unal.apuntado.domain.rules.IConfiguracion;
import co.edu.unal.apuntado.domain.rules.IEvaluadorMano;
import co.edu.unal.apuntado.domain.rules.ILiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoLiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.domain.rules.modelo.SolicitudLiquidacion;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.JugadorPersistido;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.LiquidacionRonda;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.NuevaPartida;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.ReglasPersistidas;
import co.edu.unal.apuntado.infrastructure.persistence.LiquidacionDuplicadaException;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Mediador estricto (ADR-06): controla SOLO la secuencia temporal del turno y la invocacion de interfaces,
 * dentro del candado de la partida. No evalua manos ni calcula puntos (FF-01c): delega en IEvaluadorMano,
 * ILiquidacion e IMazo. Orden de cada liquidacion: persistir -> actualizar memoria -> difundir.
 */
public final class TurnOrchestratorComponent implements ITurno {

    private final IEvaluadorMano evaluador;
    private final ILiquidacion liquidacion;
    private final IConfiguracion configuracion;
    private final IMazo mazo;
    private final IAuditoriaReparto auditoria;
    private final IMatchState estadoPersistente;
    private final IEventosPartida eventos;
    private final ProgramadorTurnos programador;
    private final Clock reloj;
    private final Map<Long, PartidaEnMemoria> partidas = new ConcurrentHashMap<>();

    public TurnOrchestratorComponent(IEvaluadorMano evaluador, ILiquidacion liquidacion,
                                     IConfiguracion configuracion, IMazo mazo, IAuditoriaReparto auditoria,
                                     IMatchState estadoPersistente, IEventosPartida eventos,
                                     ProgramadorTurnos programador, Clock reloj) {
        this.evaluador = evaluador;
        this.liquidacion = liquidacion;
        this.configuracion = configuracion;
        this.mazo = mazo;
        this.auditoria = auditoria;
        this.estadoPersistente = estadoPersistente;
        this.eventos = eventos;
        this.programador = programador;
        this.reloj = reloj;
    }

    // ------------------------------------------------------------------ comandos

    @Override
    public long iniciarPartida(String codigoSala, ConfiguracionReglas cfg, List<Participante> jugadores) {
        configuracion.validarMesa(cfg, jugadores.size());
        long id = estadoPersistente.guardarPartida(new NuevaPartida(codigoSala,
                jugadores.stream().map(j -> new JugadorPersistido(j.sub(), j.alias())).toList(), reglas(cfg)));
        partidas.put(id, new PartidaEnMemoria(id, cfg, jugadores));
        conCandado(id, partida -> {
            abrirRonda(partida);
            return null;
        });
        return id;
    }

    @Override
    public void robar(long partidaId, String jugadorId, boolean delDescarte, int numeroTurno) {
        conCandado(partidaId, p -> {
            validarTurno(p, jugadorId, numeroTurno, Fase.ESPERANDO_ROBO);
            aplicarRobo(p, jugadorId, delDescarte);
            return null;
        });
    }

    @Override
    public void descartar(long partidaId, String jugadorId, String codigoCarta, int numeroTurno) {
        conCandado(partidaId, p -> {
            validarTurno(p, jugadorId, numeroTurno, Fase.ESPERANDO_DESCARTE);
            aplicarDescarte(p, jugadorId, quitarDeLaMano(p, Carta.deCodigo(codigoCarta)));
            return null;
        });
    }

    @Override
    public ResultadoValidacion cerrar(long partidaId, String jugadorId, String codigoCarta, int numeroTurno) {
        return conCandado(partidaId, p -> {
            validarTurno(p, jugadorId, numeroTurno, Fase.ESPERANDO_DESCARTE);
            Carta descarte = Carta.deCodigo(codigoCarta);
            List<Carta> resto = restoSinCarta(p.asientoEnTurno(), descarte);
            ResultadoValidacion cierre = evaluador.validarCierre(resto, p.cfg);
            if (!cierre.valido()) {
                eventos.publicar(new EventoDominio.CierreRechazado(p.id, jugadorId, cierre.motivo().mensaje()));
                return cierre;
            }
            liquidarCierre(p, jugadorId, descarte, resto, cierre);
            return cierre;
        });
    }

    @Override
    public void vencerTurno(long partidaId, int numeroTurno) {
        conCandado(partidaId, p -> {
            if (p.fase == Fase.FINALIZADA || p.fase == Fase.ENTRE_RONDAS || p.numeroTurno != numeroTurno) {
                return null;
            }
            String jugador = p.asientoEnTurno().id();
            if (p.fase == Fase.ESPERANDO_ROBO) {
                aplicarRobo(p, jugador, false);
            }
            Carta porDefecto = p.ultimaRobada != null ? p.ultimaRobada : ultimaDeLaMano(p.asientoEnTurno());
            aplicarDescarte(p, jugador, quitarDeLaMano(p, porDefecto));
            return null;
        });
    }

    @Override
    public VistaPartida vistaDe(long partidaId, String jugadorId) {
        return conCandado(partidaId, p -> {
            Asiento a = p.asientoDe(jugadorId);
            if (a == null) {
                throw new ComandoInvalidoException(MotivoComando.FUERA_DE_TURNO);
            }
            String cima = p.claveMazo == null ? null : mazo.cimaDescarte(p.claveMazo).map(Carta::codigo).orElse(null);
            List<String> eliminados = p.asientos.stream().filter(x -> !x.activo).map(Asiento::id).toList();
            return new VistaPartida(p.id, p.numeroRonda, a.mano.stream().map(Carta::codigo).toList(), cima,
                    p.marcadorDeTodos(), p.fase == Fase.FINALIZADA ? null : p.asientoEnTurno().id(),
                    p.numeroTurno, p.huella, p.fase == Fase.FINALIZADA, p.fase.name(), p.cfg.modalidad(),
                    p.cfg.umbralEliminacion(), p.cfg.robarDelDescarte(), eliminados);
        });
    }

    // ------------------------------------------------------------------ secuencia de turno

    private <T> T conCandado(long partidaId, Function<PartidaEnMemoria, T> accion) {
        PartidaEnMemoria p = partidas.get(partidaId);
        if (p == null) {
            throw new ComandoInvalidoException(MotivoComando.PARTIDA_INEXISTENTE);
        }
        p.candado.lock();
        try {
            return accion.apply(p);
        } finally {
            p.candado.unlock();
        }
    }

    private void validarTurno(PartidaEnMemoria p, String jugadorId, int numeroTurno, Fase esperada) {
        if (p.fase == Fase.FINALIZADA) {
            throw new ComandoInvalidoException(MotivoComando.PARTIDA_FINALIZADA);
        }
        if (numeroTurno != p.numeroTurno) {
            throw new ComandoInvalidoException(MotivoComando.TURNO_OBSOLETO);
        }
        if (!p.asientoEnTurno().id().equals(jugadorId)) {
            throw new ComandoInvalidoException(MotivoComando.FUERA_DE_TURNO);
        }
        if (p.fase != esperada) {
            throw new ComandoInvalidoException(MotivoComando.FASE_INCORRECTA);
        }
    }

    private void aplicarRobo(PartidaEnMemoria p, String jugadorId, boolean delDescarte) {
        Robo robo = delDescarte ? tomarDeLaPila(p) : mazo.robarDelMazo(p.claveMazo);
        p.asientoEnTurno().mano.add(robo.carta());
        p.fase = Fase.ESPERANDO_DESCARTE;
        p.ultimaRobada = robo.carta();
        p.registrar(jugadorId, delDescarte ? "ROBAR_POZO" : "ROBAR_MAZO", robo.carta().codigo(), reloj.instant());
        robo.huellaReposicion().ifPresent(h -> eventos.publicar(new EventoDominio.MazoRepuesto(p.id, h)));
        eventos.publicar(new EventoDominio.CartaRobada(p.id, jugadorId, delDescarte ? Origen.DESCARTE : Origen.MAZO));
        eventos.publicar(new EventoDominio.CartaRecibida(p.id, jugadorId, robo.carta().codigo()));
    }

    private Robo tomarDeLaPila(PartidaEnMemoria p) {
        if (!p.cfg.robarDelDescarte()) {
            throw new ComandoInvalidoException(MotivoComando.DESCARTE_NO_PERMITIDO);
        }
        Carta carta = mazo.tomarDescarte(p.claveMazo)
                .orElseThrow(() -> new ComandoInvalidoException(MotivoComando.PILA_VACIA));
        return new Robo(carta, Optional.empty());
    }

    private void aplicarDescarte(PartidaEnMemoria p, String jugadorId, Carta carta) {
        mazo.descartar(p.claveMazo, carta);
        p.registrar(jugadorId, "DESCARTAR", carta.codigo(), reloj.instant());
        eventos.publicar(new EventoDominio.CartaDescartada(p.id, jugadorId, carta.codigo()));
        p.ultimaRobada = null;
        p.indiceTurno = p.siguienteActivo(p.indiceTurno);
        p.numeroTurno++;
        p.fase = Fase.ESPERANDO_ROBO;
        anunciarTurno(p);
    }

    private void anunciarTurno(PartidaEnMemoria p) {
        Duration limite = Duration.ofSeconds(p.cfg.segundosPorTurno());
        int turno = p.numeroTurno;
        eventos.publicar(new EventoDominio.TurnoAsignado(p.id, p.asientoEnTurno().id(), turno,
                reloj.instant().plus(limite)));
        programador.programar(limite, () -> vencerTurno(p.id, turno));
    }

    private Carta quitarDeLaMano(PartidaEnMemoria p, Carta carta) {
        if (!p.asientoEnTurno().mano.remove(carta)) {
            throw new ComandoInvalidoException(MotivoComando.CARTA_NO_EN_MANO);
        }
        return carta;
    }

    private static Carta ultimaDeLaMano(Asiento a) {
        return a.mano.get(a.mano.size() - 1);
    }

    private static List<Carta> restoSinCarta(Asiento a, Carta descarte) {
        List<Carta> resto = new ArrayList<>(a.mano);
        if (!resto.remove(descarte)) {
            throw new ComandoInvalidoException(MotivoComando.CARTA_NO_EN_MANO);
        }
        return resto;
    }

    // ------------------------------------------------------------------ rondas

    private void abrirRonda(PartidaEnMemoria p) {
        p.numeroRonda++;
        p.indiceAbridor = p.indiceAbridor < 0 ? 0 : p.siguienteActivo(p.indiceAbridor);
        p.claveMazo = p.id + "-" + p.numeroRonda;
        List<Asiento> orden = p.ordenDeReparto();
        p.huella = mazo.abrirRonda(p.claveMazo, p.cfg, orden.size());
        try {
            p.rondaId = estadoPersistente.registrarInicioRonda(p.id, p.numeroRonda, p.huella,
                    p.asientos.get(p.indiceAbridor).id());
        } catch (RuntimeException e) {
            mazo.liberar(p.claveMazo);
            p.numeroRonda--;
            throw e;
        }
        repartirYAnunciar(p, orden);
    }

    private void repartirYAnunciar(PartidaEnMemoria p, List<Asiento> orden) {
        List<List<Carta>> manos = mazo.repartir(p.claveMazo, orden.size());
        p.jugadas.clear();
        p.asientos.forEach(a -> a.mano.clear());
        for (int i = 0; i < orden.size(); i++) {
            orden.get(i).mano.addAll(manos.get(i));
        }
        p.indiceTurno = p.indiceAbridor;
        p.numeroTurno++;
        p.fase = Fase.ESPERANDO_DESCARTE;
        String cima = mazo.cimaDescarte(p.claveMazo).map(Carta::codigo).orElse(null);
        eventos.publicar(new EventoDominio.RondaIniciada(p.id, p.numeroRonda, p.huella, cima,
                p.asientoEnTurno().id()));
        orden.forEach(a -> eventos.publicar(new EventoDominio.ManoEntregada(p.id, a.id(),
                a.mano.stream().map(Carta::codigo).toList())));
        anunciarTurno(p);
    }

    private void liquidarCierre(PartidaEnMemoria p, String cerrador, Carta descarte, List<Carta> resto,
                                ResultadoValidacion cierre) {
        Map<String, Agrupacion> agrupaciones = new LinkedHashMap<>();
        for (Asiento a : p.asientos) {
            if (a.activo && !a.id().equals(cerrador)) {
                agrupaciones.put(a.id(), evaluador.cartasSueltas(a.mano, p.cfg));
            }
        }
        ResultadoLiquidacion liq = liquidacion.liquidar(new SolicitudLiquidacion(p.numeroRonda, cerrador,
                cierre, agrupaciones, p.marcadorDeActivos(), p.cfg));
        RevelacionReparto revelacion = auditoria.revelar(p.claveMazo);
        p.registrar(cerrador, "CERRAR", descarte.codigo(), reloj.instant());
        LiquidacionRonda instantanea = InstantaneaLiquidacion.construir(p, cerrador, resto, cierre,
                agrupaciones, liq, revelacion.sal(), revelacion.orden());
        if (!persistir(instantanea)) {
            return;
        }
        aplicarEnMemoria(p, descarte, liq);
        eventos.publicar(new EventoDominio.RondaLiquidada(p.id, p.numeroRonda, cerrador, cierre.tipo().name(),
                liq.puntosRonda(), liq.marcador(), liq.eliminados(), revelacion));
        terminarRonda(p, liq);
    }

    /** Persiste en una transaccion; false si otro cierre ya liquido la ronda (idempotencia). */
    private boolean persistir(LiquidacionRonda instantanea) {
        try {
            estadoPersistente.guardarLiquidacion(instantanea);
            return true;
        } catch (LiquidacionDuplicadaException e) {
            return false;
        }
    }

    private void aplicarEnMemoria(PartidaEnMemoria p, Carta descarte, ResultadoLiquidacion liq) {
        p.asientoEnTurno().mano.remove(descarte);
        p.asientos.forEach(a -> {
            Integer total = liq.marcador().get(a.id());
            if (total != null) {
                a.marcador = total;
                a.activo = !liq.eliminados().contains(a.id());
            }
        });
        p.fase = Fase.ENTRE_RONDAS;
    }

    private void terminarRonda(PartidaEnMemoria p, ResultadoLiquidacion liq) {
        mazo.liberar(p.claveMazo);
        if (liq.finPartida()) {
            p.fase = Fase.FINALIZADA;
            eventos.publicar(new EventoDominio.PartidaFinalizada(p.id, liq.ganador().orElseThrow(),
                    liq.motivoFin().orElseThrow().name()));
            return;
        }
        abrirRonda(p);
    }

    private static ReglasPersistidas reglas(ConfiguracionReglas c) {
        return new ReglasPersistidas(c.modalidad(), c.umbralEliminacion(), c.residuoMaximo(),
                c.comodinesHabilitados(), c.cierreAPintas(), c.segundoMazo(), c.robarDelDescarte(),
                c.maximoRondas(), c.metaVictoria(), c.segundosPorTurno());
    }
}
