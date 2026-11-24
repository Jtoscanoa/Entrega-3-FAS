-- V4: recuperacion tras una caida (retro E2 2.3). El estado vivo de la mesa esta en memoria (ADR-05): al arrancar,
-- las rondas que quedaron EN_CURSO pasan a ANULADA y sus partidas a INTERRUMPIDA. Las rondas ya LIQUIDADAS y sus
-- puntajes no se tocan.
ALTER TABLE ronda ADD COLUMN anulada_en TIMESTAMPTZ;
ALTER TABLE ronda DROP CONSTRAINT ck_ronda_estado;
ALTER TABLE ronda ADD CONSTRAINT ck_ronda_estado CHECK (estado IN ('EN_CURSO', 'LIQUIDADA', 'ANULADA'));
ALTER TABLE ronda ADD CONSTRAINT ck_anulada_coherente CHECK ((estado = 'ANULADA') = (anulada_en IS NOT NULL));
ALTER TABLE partida DROP CONSTRAINT ck_partida_estado;
ALTER TABLE partida ADD CONSTRAINT ck_partida_estado CHECK (estado IN ('EN_CURSO', 'FINALIZADA', 'INTERRUMPIDA'));
