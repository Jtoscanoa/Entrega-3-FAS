-- V2: integridad declarativa (CHECK, UNIQUE parcial) y catalogo de cartas.
ALTER TABLE jugador ADD CONSTRAINT ck_saldo CHECK (saldo_fichas >= 0);
ALTER TABLE partida ADD CONSTRAINT ck_partida_estado CHECK (estado IN ('EN_CURSO', 'FINALIZADA'));
ALTER TABLE partida ADD CONSTRAINT ck_pozo CHECK (pozo >= 0);
ALTER TABLE configuracion_reglas
    ADD CONSTRAINT ck_umbral CHECK (umbral_eliminacion > 0),
    ADD CONSTRAINT ck_residuo CHECK (residuo_maximo BETWEEN 0 AND 4),
    ADD CONSTRAINT ck_rondas CHECK (maximo_rondas >= 0),
    ADD CONSTRAINT ck_meta CHECK (meta_victoria <= 0),
    ADD CONSTRAINT ck_turno CHECK (segundos_por_turno BETWEEN 5 AND 300);
ALTER TABLE participante
    ADD CONSTRAINT ck_participante_estado CHECK (estado IN ('ACTIVO', 'ELIMINADO')),
    ADD CONSTRAINT ck_humano_o_bot CHECK ((jugador_id IS NOT NULL) <> (alias_bot IS NOT NULL));
CREATE UNIQUE INDEX ux_un_ganador ON participante (partida_id) WHERE es_ganador;
ALTER TABLE ronda
    ADD CONSTRAINT ck_ronda_estado CHECK (estado IN ('EN_CURSO', 'LIQUIDADA')),
    ADD CONSTRAINT ck_tipo_cierre CHECK (tipo_cierre IS NULL OR tipo_cierre IN ('CLASICO_433', 'A_PINTAS', 'COMPLETO', 'APUNTADO')),
    ADD CONSTRAINT ck_liquidada_coherente CHECK ((estado = 'LIQUIDADA') = (cerrador_participante_id IS NOT NULL));
ALTER TABLE sello_reparto ADD CONSTRAINT ck_revelacion CHECK ((sal IS NULL) = (orden_revelado IS NULL));
ALTER TABLE turno_jugada ADD CONSTRAINT ck_accion
    CHECK (accion IN ('ROBAR_MAZO', 'ROBAR_POZO', 'DESCARTAR', 'CERRAR'));
ALTER TABLE movimiento_fichas ADD CONSTRAINT ck_tipo_mov CHECK (tipo IN ('APUESTA', 'PREMIO', 'AJUSTE'));
INSERT INTO carta (codigo, rango, pinta, es_comodin) VALUES
 ('AC', 1, 'C', FALSE),
 ('2C', 2, 'C', FALSE),
 ('3C', 3, 'C', FALSE),
 ('4C', 4, 'C', FALSE),
 ('5C', 5, 'C', FALSE),
 ('6C', 6, 'C', FALSE),
 ('7C', 7, 'C', FALSE),
 ('8C', 8, 'C', FALSE),
 ('9C', 9, 'C', FALSE),
 ('10C', 10, 'C', FALSE),
 ('JC', 11, 'C', FALSE),
 ('QC', 12, 'C', FALSE),
 ('KC', 13, 'C', FALSE),
 ('AD', 1, 'D', FALSE),
 ('2D', 2, 'D', FALSE),
 ('3D', 3, 'D', FALSE),
 ('4D', 4, 'D', FALSE),
 ('5D', 5, 'D', FALSE),
 ('6D', 6, 'D', FALSE),
 ('7D', 7, 'D', FALSE),
 ('8D', 8, 'D', FALSE),
 ('9D', 9, 'D', FALSE),
 ('10D', 10, 'D', FALSE),
 ('JD', 11, 'D', FALSE),
 ('QD', 12, 'D', FALSE),
 ('KD', 13, 'D', FALSE),
 ('AT', 1, 'T', FALSE),
 ('2T', 2, 'T', FALSE),
 ('3T', 3, 'T', FALSE),
 ('4T', 4, 'T', FALSE),
 ('5T', 5, 'T', FALSE),
 ('6T', 6, 'T', FALSE),
 ('7T', 7, 'T', FALSE),
 ('8T', 8, 'T', FALSE),
 ('9T', 9, 'T', FALSE),
 ('10T', 10, 'T', FALSE),
 ('JT', 11, 'T', FALSE),
 ('QT', 12, 'T', FALSE),
 ('KT', 13, 'T', FALSE),
 ('AP', 1, 'P', FALSE),
 ('2P', 2, 'P', FALSE),
 ('3P', 3, 'P', FALSE),
 ('4P', 4, 'P', FALSE),
 ('5P', 5, 'P', FALSE),
 ('6P', 6, 'P', FALSE),
 ('7P', 7, 'P', FALSE),
 ('8P', 8, 'P', FALSE),
 ('9P', 9, 'P', FALSE),
 ('10P', 10, 'P', FALSE),
 ('JP', 11, 'P', FALSE),
 ('QP', 12, 'P', FALSE),
 ('KP', 13, 'P', FALSE),
 ('*', NULL, NULL, TRUE);
