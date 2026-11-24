package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;

/** FF-17: dos cierres simultaneos de la misma partida producen una sola liquidacion. */
class ConcurrenciaCierreTest {

    @Test
    void dosCierresSimultaneosLiquidanUnaSolaVez() throws Exception {
        for (int repeticion = 0; repeticion < 50; repeticion++) {
            Escenario e = new Escenario(new MazoFalso(Escenario.MANO_CLASICA_GANADORA, Escenario.MANO_RIVAL));
            long id = e.iniciar(ConfiguracionReglas.clasica(), 2);
            int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
            int exitos = cerrarEnParalelo(e, id, turno, 8);
            assertEquals(1, exitos, "solo un cierre se acepta");
            assertEquals(1, e.estado.liquidaciones.get(), "una unica liquidacion persistida");
            assertEquals(1, e.eventosDe(EventoDominio.RondaLiquidada.class).size());
            assertEquals(1, e.eventosDe(EventoDominio.PartidaFinalizada.class).size());
        }
    }

    @Test
    void elReintentoTrasLaLiquidacionSeRechazaSinEfectos() {
        Escenario e = new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        assertTrue(e.orquestador.cerrar(id, "sub-a", "AD", turno).valido());
        ComandoInvalidoException ex = assertThrows(ComandoInvalidoException.class,
                () -> e.orquestador.cerrar(id, "sub-a", "AD", turno));
        assertEquals(MotivoComando.TURNO_OBSOLETO, ex.motivo());
        assertEquals(1, e.estado.liquidaciones.get());
        assertEquals(2, e.eventosDe(EventoDominio.RondaIniciada.class).size(), "arranca la ronda 2");
    }

    private static int cerrarEnParalelo(Escenario e, long id, int turno, int hilos) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Boolean>> resultados = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            Callable<Boolean> tarea = () -> {
                salida.await();
                try {
                    return e.orquestador.cerrar(id, "sub-a", "5D", turno).valido();
                } catch (ComandoInvalidoException ex) {
                    return false;
                }
            };
            resultados.add(pool.submit(tarea));
        }
        salida.countDown();
        int exitos = 0;
        for (Future<Boolean> f : resultados) {
            exitos += f.get() ? 1 : 0;
        }
        pool.shutdown();
        return exitos;
    }
}
