package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.auditoria.DealAuditComponent;
import co.edu.unal.apuntado.domain.gameplay.auditoria.RevelacionReparto;
import co.edu.unal.apuntado.domain.gameplay.mazo.DeckManagementComponent;
import co.edu.unal.apuntado.domain.gameplay.mazo.MazoAgotadoException;
import co.edu.unal.apuntado.domain.gameplay.mazo.Robo;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import java.security.SecureRandom;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** FF-11: commit-reveal sobre 1.000 mazos y reparto coherente con el orden revelado. */
class MazoYAuditoriaTest {

    private final DealAuditComponent auditoria = new DealAuditComponent(new SecureRandom());
    private final DeckManagementComponent mazo = new DeckManagementComponent(auditoria, new SecureRandom());
    private final ConfiguracionReglas cfg = ConfiguracionReglas.apuntado101();

    @Test
    void milMazosSellanYRevelanConCoincidenciaTotal() {
        for (int i = 0; i < 1000; i++) {
            String clave = "r" + i;
            String huella = mazo.abrirRonda(clave, cfg, 4);
            RevelacionReparto r = auditoria.revelar(clave);
            assertEquals(huella, r.huella());
            assertTrue(auditoria.verificar(r), "ronda " + i);
            mazo.liberar(clave);
        }
    }

    @Test
    void unOrdenAlteradoOUnaSalDistintaSeDetectan() {
        mazo.abrirRonda("x", cfg, 2);
        RevelacionReparto r = auditoria.revelar("x");
        String[] c = r.orden().split(",");
        String t = c[0];
        c[0] = c[1];
        c[1] = t;
        assertFalse(auditoria.verificar(new RevelacionReparto("x", r.huella(), r.sal(), String.join(",", c))));
        assertFalse(auditoria.verificar(new RevelacionReparto("x", r.huella(), "0".repeat(32), r.orden())));
    }

    @Test
    void lasManosSonLosPrimerosCodigosDelOrdenRevelado() {
        mazo.abrirRonda("m", cfg, 3);
        List<List<Carta>> manos = mazo.repartir("m", 3);
        List<String> orden = List.of(auditoria.revelar("m").orden().split(","));
        assertEquals(11, manos.get(0).size());
        assertEquals(10, manos.get(1).size());
        assertEquals(orden.subList(0, 11), manos.get(0).stream().map(Carta::codigo).toList());
        assertEquals(orden.subList(11, 21), manos.get(1).stream().map(Carta::codigo).toList());
        assertEquals(orden.subList(21, 31), manos.get(2).stream().map(Carta::codigo).toList());
        assertEquals(orden.get(31), mazo.cimaDescarte("m").orElseThrow().codigo());
    }

    @Test
    void elMazoTiene52CartasUnicasYSegundoMazoConComodinesTiene108() {
        mazo.abrirRonda("a", cfg, 2);
        Set<String> unicas = new HashSet<>(List.of(auditoria.revelar("a").orden().split(",")));
        assertEquals(52, unicas.size());
        mazo.abrirRonda("b", cfg.conSegundoMazo(true).conComodines(true), 6);
        assertEquals(108, auditoria.revelar("b").orden().split(",").length);
    }

    @Test
    void mesaDeSeisSinSegundoMazoNoSeAbre() {
        assertThrows(IllegalArgumentException.class, () -> mazo.abrirRonda("z", cfg, 6));
    }

    @Test
    void alAgotarseElMazoSeReponeYSeSellaDeNuevo() {
        mazo.abrirRonda("p", cfg, 2);
        mazo.repartir("p", 2);
        for (int i = 0; i < 52 - 22; i++) {
            mazo.descartar("p", mazo.robarDelMazo("p").carta());
        }
        Robo conReposicion = mazo.robarDelMazo("p");
        assertTrue(conReposicion.huellaReposicion().isPresent());
        assertEquals(64, conReposicion.huellaReposicion().get().length());
    }

    @Test
    void sinCartasParaReponerSeFallaConUnaExcepcionTipada() {
        mazo.abrirRonda("q", cfg, 2);
        mazo.repartir("q", 2);
        for (int i = 0; i < 30; i++) {
            mazo.robarDelMazo("q");
        }
        assertThrows(MazoAgotadoException.class, () -> mazo.robarDelMazo("q"));
    }

    @Test
    void sellarOAbrirDosVecesLaMismaClaveFalla() {
        mazo.abrirRonda("dup", cfg, 2);
        assertThrows(IllegalStateException.class, () -> mazo.abrirRonda("dup", cfg, 2));
        assertThrows(IllegalStateException.class, () -> auditoria.revelar("nunca"));
        mazo.liberar("dup");
        assertThrows(IllegalStateException.class, () -> auditoria.revelar("dup"));
    }
}
