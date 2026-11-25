package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.auditoria.DealAuditComponent;
import co.edu.unal.apuntado.domain.gameplay.auditoria.RevelacionReparto;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * RF18: la SPA recalcula la huella con Web Crypto (frontend/src/estado/verificarReparto.ts) como
 * SHA-256(orden + "|" + sal) en hexadecimal en minusculas. El valor esperado se obtuvo con crypto.subtle.digest en
 * Node 20 sobre el mismo texto; si el formato de DealAuditComponent cambia, esta prueba lo avisa.
 */
class HuellaNavegadorTest {

    private static final String ORDEN = "AC,2D,10T,KP,*";
    private static final String SAL = "00112233445566778899aabbccddeeff";
    private static final String HUELLA_WEB_CRYPTO = "b208ba3294ec5484ffa4012d599e52f834df1a7c1ee9ac54a990742694f229ac";

    private final DealAuditComponent auditoria = new DealAuditComponent(new Random(1));

    @Test
    void elServidorYElNavegadorCalculanLaMismaHuella() {
        assertTrue(auditoria.verificar(new RevelacionReparto("p-1", HUELLA_WEB_CRYPTO, SAL, ORDEN)));
    }

    @Test
    void otraSalUOtroOrdenNoCoinciden() {
        assertFalse(auditoria.verificar(new RevelacionReparto("p-1", HUELLA_WEB_CRYPTO, "0".repeat(32), ORDEN)));
        assertFalse(auditoria.verificar(new RevelacionReparto("p-1", HUELLA_WEB_CRYPTO, SAL, "2D,AC,10T,KP,*")));
    }
}
