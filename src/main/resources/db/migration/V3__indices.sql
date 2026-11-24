-- V3: indices de consulta (historial RF13 y reconexion).
CREATE INDEX ix_participante_jugador ON participante (jugador_id);
CREATE INDEX ix_ronda_partida ON ronda (partida_id, estado);
CREATE INDEX ix_puntaje_participante ON puntaje_acumulado (participante_id, ronda_id);
CREATE INDEX ix_turno_ronda ON turno_jugada (ronda_id, numero_turno);
CREATE INDEX ix_mano_participante ON mano_jugador (participante_id);
