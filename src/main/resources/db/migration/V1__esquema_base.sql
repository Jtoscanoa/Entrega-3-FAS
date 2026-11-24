-- V1: 13 tablas en 3FN (ADR-05). Restricciones adicionales en V2, indices en V3.
CREATE TABLE jugador (
    id           BIGSERIAL PRIMARY KEY,
    sub_oidc     VARCHAR(255) NOT NULL UNIQUE,
    alias        VARCHAR(40)  NOT NULL,
    saldo_fichas INTEGER      NOT NULL DEFAULT 0,
    creado_en    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE TABLE sala (
    codigo       CHAR(6) PRIMARY KEY,
    anfitrion_id BIGINT      NOT NULL REFERENCES jugador (id),
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE partida (
    id            BIGSERIAL PRIMARY KEY,
    sala_codigo   CHAR(6)     NOT NULL REFERENCES sala (codigo),
    estado        VARCHAR(12) NOT NULL,
    pozo          INTEGER     NOT NULL DEFAULT 0,
    version       INTEGER     NOT NULL DEFAULT 0,
    iniciada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalizada_en TIMESTAMPTZ
);
CREATE TABLE configuracion_reglas (
    partida_id            BIGINT PRIMARY KEY REFERENCES partida (id),
    modalidad             VARCHAR(30) NOT NULL,
    umbral_eliminacion    SMALLINT    NOT NULL,
    residuo_maximo        SMALLINT    NOT NULL,
    comodines_habilitados BOOLEAN     NOT NULL,
    cierre_a_pintas       BOOLEAN     NOT NULL,
    segundo_mazo          BOOLEAN     NOT NULL,
    robar_del_descarte    BOOLEAN     NOT NULL,
    maximo_rondas         SMALLINT    NOT NULL,
    meta_victoria         SMALLINT    NOT NULL,
    segundos_por_turno    SMALLINT    NOT NULL
);
CREATE TABLE participante (
    id         BIGSERIAL PRIMARY KEY,
    partida_id BIGINT      NOT NULL REFERENCES partida (id),
    jugador_id BIGINT      REFERENCES jugador (id),
    alias_bot  VARCHAR(30),
    asiento    SMALLINT    NOT NULL,
    estado     VARCHAR(10) NOT NULL DEFAULT 'ACTIVO',
    reingresos SMALLINT    NOT NULL DEFAULT 0,
    es_ganador BOOLEAN     NOT NULL DEFAULT FALSE,
    UNIQUE (partida_id, asiento)
);
CREATE TABLE ronda (
    id                       BIGSERIAL PRIMARY KEY,
    partida_id               BIGINT      NOT NULL REFERENCES partida (id),
    numero                   SMALLINT    NOT NULL,
    abridor_participante_id  BIGINT      NOT NULL REFERENCES participante (id),
    cerrador_participante_id BIGINT      REFERENCES participante (id),
    tipo_cierre              VARCHAR(15),
    estado                   VARCHAR(10) NOT NULL,
    iniciada_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    liquidada_en             TIMESTAMPTZ,
    UNIQUE (partida_id, numero)
);
CREATE TABLE sello_reparto (
    ronda_id       BIGINT PRIMARY KEY REFERENCES ronda (id),
    secuencia      SMALLINT    NOT NULL DEFAULT 1,
    huella_sha256  CHAR(64)    NOT NULL,
    sal            CHAR(32),
    orden_revelado TEXT,
    publicado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    revelado_en    TIMESTAMPTZ
);
CREATE TABLE carta (
    codigo     VARCHAR(3) PRIMARY KEY,
    rango      SMALLINT,
    pinta      CHAR(1),
    es_comodin BOOLEAN NOT NULL
);
CREATE TABLE mano_jugador (
    id              BIGSERIAL PRIMARY KEY,
    ronda_id        BIGINT   NOT NULL REFERENCES ronda (id),
    participante_id BIGINT   NOT NULL REFERENCES participante (id),
    puntos_ronda    SMALLINT NOT NULL,
    es_quien_cierra BOOLEAN  NOT NULL DEFAULT FALSE,
    UNIQUE (ronda_id, participante_id)
);
CREATE TABLE carta_mano (
    mano_id      BIGINT     NOT NULL REFERENCES mano_jugador (id),
    posicion     SMALLINT   NOT NULL,
    carta_codigo VARCHAR(3) NOT NULL REFERENCES carta (codigo),
    combinacion  SMALLINT,
    PRIMARY KEY (mano_id, posicion)
);
CREATE TABLE turno_jugada (
    id              BIGSERIAL PRIMARY KEY,
    ronda_id        BIGINT      NOT NULL REFERENCES ronda (id),
    numero_turno    INTEGER     NOT NULL,
    secuencia       SMALLINT    NOT NULL,
    participante_id BIGINT      NOT NULL REFERENCES participante (id),
    accion          VARCHAR(15) NOT NULL,
    carta_codigo    VARCHAR(3)  REFERENCES carta (codigo),
    ocurrida_en     TIMESTAMPTZ NOT NULL,
    UNIQUE (ronda_id, secuencia)
);
CREATE TABLE puntaje_acumulado (
    ronda_id        BIGINT      NOT NULL REFERENCES ronda (id),
    participante_id BIGINT      NOT NULL REFERENCES participante (id),
    evento          VARCHAR(15) NOT NULL,
    puntos_ronda    SMALLINT    NOT NULL,
    total           SMALLINT    NOT NULL,
    PRIMARY KEY (ronda_id, participante_id, evento)
);
CREATE TABLE movimiento_fichas (
    id            BIGSERIAL PRIMARY KEY,
    jugador_id    BIGINT      NOT NULL REFERENCES jugador (id),
    partida_id    BIGINT      REFERENCES partida (id),
    tipo          VARCHAR(15) NOT NULL,
    monto         INTEGER     NOT NULL,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
