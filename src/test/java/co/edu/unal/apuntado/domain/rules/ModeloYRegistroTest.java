package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.evaluacion.BuscadorCombinaciones;
import co.edu.unal.apuntado.domain.rules.evaluacion.ReglaApuntado101;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.Pinta;
import co.edu.unal.apuntado.domain.rules.modelo.Valor;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ModeloYRegistroTest {

    @Test
    void cartaCodigoIdaYVuelta() {
        for (Pinta p : Pinta.values()) {
            for (Valor v : Valor.values()) {
                Carta c = new Carta(v, p);
                assertEquals(c, Carta.deCodigo(c.codigo()));
            }
        }
        assertTrue(Carta.deCodigo("*").esComodin());
        assertEquals("*", Carta.COMODIN.codigo());
        assertFalse(Carta.deCodigo("10D").esComodin());
    }

    @Test
    void cartaRechazaCodigosYEstadosInvalidos() {
        assertThrows(IllegalArgumentException.class, () -> Carta.deCodigo("X"));
        assertThrows(IllegalArgumentException.class, () -> Carta.deCodigo("10CX"));
        assertThrows(IllegalArgumentException.class, () -> Carta.deCodigo("7Z"));
        assertThrows(IllegalArgumentException.class, () -> Carta.deCodigo("1C"));
        assertThrows(IllegalArgumentException.class, () -> new Carta(Valor.AS, null));
        assertThrows(NullPointerException.class, () -> Carta.deCodigo(null));
    }

    @Test
    void configuracionValidaSusParametros() {
        ConfiguracionReglas base = ConfiguracionReglas.apuntado101();
        assertThrows(IllegalArgumentException.class, () -> base.conResiduoMaximo(5));
        assertThrows(IllegalArgumentException.class, () -> base.conResiduoMaximo(-1));
        assertThrows(IllegalArgumentException.class, () -> base.conUmbral(0));
        assertThrows(IllegalArgumentException.class, () -> base.conSegundosPorTurno(4));
        assertThrows(IllegalArgumentException.class, () -> base.conSegundosPorTurno(301));
        assertThrows(IllegalArgumentException.class, () -> new ConfiguracionReglas(null, 101, 4, false, false,
                false, false, 0, -51, 30));
        assertThrows(IllegalArgumentException.class, () -> new ConfiguracionReglas(" ", 101, 4, false, false,
                false, false, 0, -51, 30));
        assertThrows(IllegalArgumentException.class, () -> new ConfiguracionReglas("X", 101, 4, false, false,
                false, false, -1, -51, 30));
        assertThrows(IllegalArgumentException.class, () -> new ConfiguracionReglas("X", 101, 4, false, false,
                false, false, 0, 1, 30));
        assertEquals(150, base.conUmbral(150).umbralEliminacion());
        assertTrue(base.conRobarDelDescarte(true).robarDelDescarte());
        assertEquals(1, ConfiguracionReglas.clasica().maximoRondas());
    }

    @Test
    void registroCargaLasDosEstrategiasPorServiceLoader() {
        RegistroReglas registro = new RegistroReglas();
        assertEquals(Set.of("APUNTADO_101", "CLASICA_433"), registro.modalidades());
        assertTrue(registro.obtener("APUNTADO_101").isPresent());
        assertTrue(registro.obtener("NOPE").isEmpty());
    }

    @Test
    void registroRechazaModalidadesDuplicadas() {
        assertThrows(IllegalStateException.class,
                () -> new RegistroReglas(List.of(new ReglaApuntado101(), new ReglaApuntado101())));
    }

    @Test
    void configuracionDelJuegoPorModalidad() {
        GameConfigurationComponent gc = new GameConfigurationComponent();
        assertEquals(101, gc.predeterminada("APUNTADO_101").umbralEliminacion());
        assertEquals(1, gc.predeterminada("CLASICA_433").maximoRondas());
        assertThrows(IllegalArgumentException.class, () -> gc.predeterminada("X"));
        gc.validarMesa(ConfiguracionReglas.apuntado101(), 4);
        assertThrows(IllegalArgumentException.class, () -> gc.validarMesa(ConfiguracionReglas.apuntado101(), 6));
    }

    @Test
    void buscadorLimitaElTamanoYValidaTamanos() {
        List<Carta> doce = Manos.de("AC 2C 3C 4C 5C 6C 7C 8C 9C 10C JC QC");
        assertThrows(IllegalArgumentException.class, () -> new BuscadorCombinaciones(doce, false));
        BuscadorCombinaciones b = new BuscadorCombinaciones(Manos.de("5C 6C 7C"), false);
        assertTrue(b.particionExacta(2, 1).isEmpty());
        assertTrue(b.particionExacta(4).isEmpty());
        assertTrue(b.particionExacta(6).isEmpty(), "ninguna combinacion supera 5 cartas");
        assertTrue(b.particionExacta(3).isPresent());
        assertTrue(b.mejorParticionConSobrantes(2).isEmpty());
        assertTrue(b.mejorParticionConSobrantes(-1).isEmpty());
        assertEquals(1, b.totalCombinaciones());
    }

    @Test
    void conSobrantesConservaLaParticionDeMenorResiduo() {
        // 5C suelto (5) se halla antes que 8C suelto (8): la segunda no reemplaza a la primera
        BuscadorCombinaciones.ParticionConSobrantes p =
                new BuscadorCombinaciones(Manos.de("5C 6C 7C 8C"), false).mejorParticionConSobrantes(1).orElseThrow();
        assertEquals(5, p.puntos());
        assertEquals(Manos.de("5C"), p.sobrantes());
    }

    @Test
    void conSobrantesDescartaTernasQueReusanCartasYaUbicadas() {
        // Tras elegir 5C 6C 7C, la escalera 7C 8C 9C comparte el 7C y debe descartarse
        BuscadorCombinaciones.ParticionConSobrantes p = new BuscadorCombinaciones(
                Manos.de("5C 6C 8C 7C 9C 10C"), false).mejorParticionConSobrantes(2).orElseThrow();
        assertEquals(0, p.puntos());
        assertEquals(2, p.ternas().size());
        assertTrue(p.sobrantes().isEmpty());
    }
}
