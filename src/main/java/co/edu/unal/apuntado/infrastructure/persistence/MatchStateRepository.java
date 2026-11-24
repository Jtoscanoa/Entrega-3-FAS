package co.edu.unal.apuntado.infrastructure.persistence;

import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Unico acceso a PostgreSQL (ADR-05). El estado vivo esta en memoria: se escribe al iniciar y al liquidar. */
@Repository
public class MatchStateRepository implements IMatchState {

    private static final String SOLO_EN_CURSO = """
            UPDATE ronda SET estado = 'LIQUIDADA', tipo_cierre = ?, liquidada_en = now(),
                   cerrador_participante_id = ?
             WHERE id = ? AND estado = 'EN_CURSO'""";

    private final JdbcTemplate jdbc;

    public MatchStateRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public long guardarPartida(NuevaPartida p) {
        for (JugadorPersistido j : p.jugadores()) {
            jdbc.update("""
                    INSERT INTO jugador (sub_oidc, alias) VALUES (?, ?)
                    ON CONFLICT (sub_oidc) DO UPDATE SET alias = EXCLUDED.alias""", j.sub(), j.alias());
        }
        jdbc.update("""
                INSERT INTO sala (codigo, anfitrion_id)
                SELECT ?, id FROM jugador WHERE sub_oidc = ? ON CONFLICT (codigo) DO NOTHING""",
                p.codigoSala(), p.jugadores().get(0).sub());
        Long id = jdbc.queryForObject(
                "INSERT INTO partida (sala_codigo, estado) VALUES (?, 'EN_CURSO') RETURNING id",
                Long.class, p.codigoSala());
        insertarConfiguracion(id, p.reglas());
        int asiento = 1;
        for (JugadorPersistido j : p.jugadores()) {
            jdbc.update("""
                    INSERT INTO participante (partida_id, jugador_id, asiento)
                    SELECT ?, id, ? FROM jugador WHERE sub_oidc = ?""", id, asiento++, j.sub());
        }
        return id;
    }

    private void insertarConfiguracion(long partidaId, ReglasPersistidas r) {
        jdbc.update("""
                INSERT INTO configuracion_reglas (partida_id, modalidad, umbral_eliminacion, residuo_maximo,
                  comodines_habilitados, cierre_a_pintas, segundo_mazo, robar_del_descarte, maximo_rondas,
                  meta_victoria, segundos_por_turno) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                partidaId, r.modalidad(), r.umbralEliminacion(), r.residuoMaximo(), r.comodinesHabilitados(),
                r.cierreAPintas(), r.segundoMazo(), r.robarDelDescarte(), r.maximoRondas(), r.metaVictoria(),
                r.segundosPorTurno());
    }

    @Override
    @Transactional
    public long registrarInicioRonda(long partidaId, int numero, String huella, String abridorSub) {
        Long rondaId = jdbc.queryForObject("""
                INSERT INTO ronda (partida_id, numero, abridor_participante_id, estado)
                VALUES (?, ?, (SELECT p.id FROM participante p JOIN jugador j ON j.id = p.jugador_id
                                WHERE p.partida_id = ? AND j.sub_oidc = ?), 'EN_CURSO') RETURNING id""",
                Long.class, partidaId, numero, partidaId, abridorSub);
        jdbc.update("INSERT INTO sello_reparto (ronda_id, huella_sha256) VALUES (?, ?)", rondaId, huella);
        return rondaId;
    }

    /** Una transaccion ACID (READ COMMITTED): si algo falla, no se escribe nada. */
    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public void guardarLiquidacion(LiquidacionRonda l) {
        Map<String, Long> participantes = participantesPorSub(l.partidaId());
        int filas = jdbc.update(SOLO_EN_CURSO, l.tipoCierre(), participantes.get(l.cerradorSub()), l.rondaId());
        if (filas != 1) {
            throw new LiquidacionDuplicadaException(l.rondaId());
        }
        for (ManoLiquidada mano : l.manos()) {
            insertarMano(l.rondaId(), participantes.get(mano.sub()), mano);
        }
        insertarJugadas(l, participantes);
        insertarPuntajes(l, participantes);
        actualizarParticipantes(l, participantes);
        jdbc.update("""
                UPDATE sello_reparto SET sal = ?, orden_revelado = ?, revelado_en = now() WHERE ronda_id = ?""",
                l.sal(), l.ordenRevelado(), l.rondaId());
        jdbc.update("""
                UPDATE partida SET version = version + 1,
                       estado = CASE WHEN ? THEN 'FINALIZADA' ELSE estado END,
                       finalizada_en = CASE WHEN ? THEN now() ELSE finalizada_en END WHERE id = ?""",
                l.finPartida(), l.finPartida(), l.partidaId());
    }

    private Map<String, Long> participantesPorSub(long partidaId) {
        Map<String, Long> r = new HashMap<>();
        jdbc.query("""
                SELECT p.id, j.sub_oidc FROM participante p JOIN jugador j ON j.id = p.jugador_id
                 WHERE p.partida_id = ?""", rs -> {
            r.put(rs.getString("sub_oidc"), rs.getLong("id"));
        }, partidaId);
        return r;
    }

    private void insertarMano(long rondaId, long participanteId, ManoLiquidada mano) {
        Long manoId = jdbc.queryForObject("""
                INSERT INTO mano_jugador (ronda_id, participante_id, puntos_ronda, es_quien_cierra)
                VALUES (?, ?, ?, ?) RETURNING id""", Long.class, rondaId, participanteId, mano.puntosRonda(),
                mano.cierra());
        List<CartaEnMano> cartas = mano.cartas();
        jdbc.batchUpdate("INSERT INTO carta_mano (mano_id, posicion, carta_codigo, combinacion) VALUES (?,?,?,?)",
                cartas, cartas.size(), (ps, c) -> {
                    ps.setLong(1, manoId);
                    ps.setInt(2, c.posicion());
                    ps.setString(3, c.codigo());
                    ps.setObject(4, c.combinacion());
                });
    }

    private void insertarJugadas(LiquidacionRonda l, Map<String, Long> participantes) {
        jdbc.batchUpdate("""
                INSERT INTO turno_jugada (ronda_id, numero_turno, secuencia, participante_id, accion, carta_codigo,
                  ocurrida_en) VALUES (?,?,?,?,?,?,?)""", l.jugadas(), l.jugadas().size(), (ps, j) -> {
            ps.setLong(1, l.rondaId());
            ps.setInt(2, j.numeroTurno());
            ps.setInt(3, j.secuencia());
            ps.setLong(4, participantes.get(j.sub()));
            ps.setString(5, j.accion());
            ps.setString(6, j.carta());
            ps.setTimestamp(7, Timestamp.from(j.ocurridaEn()));
        });
    }

    private void insertarPuntajes(LiquidacionRonda l, Map<String, Long> participantes) {
        jdbc.batchUpdate("""
                INSERT INTO puntaje_acumulado (ronda_id, participante_id, evento, puntos_ronda, total)
                VALUES (?,?,?,?,?)""", l.puntajes(), l.puntajes().size(), (ps, p) -> {
            ps.setLong(1, l.rondaId());
            ps.setLong(2, participantes.get(p.sub()));
            ps.setString(3, p.evento());
            ps.setInt(4, p.puntosRonda());
            ps.setInt(5, p.total());
        });
    }

    private void actualizarParticipantes(LiquidacionRonda l, Map<String, Long> participantes) {
        for (String sub : l.eliminadosSub()) {
            jdbc.update("UPDATE participante SET estado = 'ELIMINADO' WHERE id = ?", participantes.get(sub));
        }
        if (l.ganadorSub() != null) {
            jdbc.update("UPDATE participante SET es_ganador = TRUE WHERE id = ?", participantes.get(l.ganadorSub()));
        }
    }
}
