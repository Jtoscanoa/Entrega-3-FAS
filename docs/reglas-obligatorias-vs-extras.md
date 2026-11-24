# Reglas obligatorias del caso de estudio frente a variantes extra (retroalimentación E2, 2.1)

| Regla | Tipo | Activa por defecto | Prueba que la cubre |
|---|---|---|---|
| Clásica: 1 cuarta + 2 ternas + 1 descarte, sin sobrantes | Obligatoria | Sí | `CierresTest.clasicaAceptaCuartaYDosTernas`, `clasicaRechazaDosEscalerasDeCinco` |
| Clásica: partida de una sola ronda | Obligatoria | Sí (`maximoRondas = 1`) | `LiquidacionTest` |
| Apuntado: 3 ternas y sobrante **< 5** (residuo 4 sí, 5 no) | Obligatoria | Sí (`residuoMaximo = 4`) | `apuntadoResiduoCuatroEsAceptado`, `apuntadoResiduoExactoDeCincoEsDenegado` |
| Apuntado: mano sin 3 ternas es inválida | Obligatoria | Sí | `apuntadoRechazaManoSinTresTernas` |
| Apuntado: acumulación y eliminación al llegar a 101 (100 no elimina) | Obligatoria | Sí (`umbral = 101`) | `LiquidacionTest.deteccionAtomicaExactaEnElUmbralDe101` |
| Robar del pozo | Opción de mesa | Lo activa la SPA al crear la partida | `TurnosTest` |
| Cierre completo (−10) | Extra | Lo evalúa el motor; ver `apuntadoAceptaDosEscalerasDeCincoComoCompleto` | `CierresTest` |
| Cierre a pintas (−25) | Extra | No | `cierreAPintasSoloSiSeHabilita` |
| Comodines | Extra | No | `comodinDeshabilitadoPorDefecto` |
| Segundo mazo (5–6 jugadores) | Extra | No (obligatorio solo con 5 o 6) | `mesaDeCincoOSeisExigeSegundoMazo` |
| Reingreso | Extra | No implementado (Fase 2) | — |
| Meta de victoria (−51) | Extra | Configurada en el motor | `LiquidacionTest` |
