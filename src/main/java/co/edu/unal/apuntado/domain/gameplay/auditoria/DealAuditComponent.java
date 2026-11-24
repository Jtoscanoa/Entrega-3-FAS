package co.edu.unal.apuntado.domain.gameplay.auditoria;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.random.RandomGenerator;

/** Protocolo commit-reveal (ADR-03): SHA-256 sobre el orden y una sal aleatoria de 128 bits. */
public final class DealAuditComponent implements IAuditoriaReparto {

    private static final int BYTES_SAL = 16;

    private record Sello(String huella, String sal, String orden) {
    }

    private final Map<String, Sello> sellos = new ConcurrentHashMap<>();
    private final RandomGenerator azar;

    public DealAuditComponent(RandomGenerator azar) {
        this.azar = azar;
    }

    @Override
    public String sellar(String clave, OrdenMazo orden) {
        byte[] bytes = new byte[BYTES_SAL];
        azar.nextBytes(bytes);
        String sal = HexFormat.of().formatHex(bytes);
        String huella = huella(orden.serializar(), sal);
        if (sellos.putIfAbsent(clave, new Sello(huella, sal, orden.serializar())) != null) {
            throw new IllegalStateException("Ya existe un sello para " + clave);
        }
        return huella;
    }

    @Override
    public RevelacionReparto revelar(String clave) {
        Sello s = sellos.get(clave);
        if (s == null) {
            throw new IllegalStateException("No hay sello para " + clave);
        }
        return new RevelacionReparto(clave, s.huella(), s.sal(), s.orden());
    }

    @Override
    public boolean verificar(RevelacionReparto r) {
        return huella(r.orden(), r.sal()).equals(r.huella());
    }

    @Override
    public void olvidar(String clave) {
        sellos.keySet().removeIf(k -> k.equals(clave) || k.startsWith(clave + "#"));
    }

    static String huella(String orden, String sal) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest((orden + "|" + sal).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible en la JVM", e);
        }
    }
}
