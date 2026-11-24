package co.edu.unal.apuntado.domain.rules;

import java.util.Map;
import java.util.Optional;
import java.util.ServiceLoader;
import java.util.Set;
import java.util.TreeMap;

/** Registro de estrategias alimentado por {@link ServiceLoader} (META-INF/services). */
public final class RegistroReglas {

    private final Map<String, ReglaJuego> reglas = new TreeMap<>();

    public RegistroReglas() {
        this(ServiceLoader.load(ReglaJuego.class));
    }

    public RegistroReglas(Iterable<ReglaJuego> origen) {
        for (ReglaJuego regla : origen) {
            if (reglas.putIfAbsent(regla.modalidad(), regla) != null) {
                throw new IllegalStateException("Modalidad duplicada: " + regla.modalidad());
            }
        }
    }

    public Optional<ReglaJuego> obtener(String modalidad) {
        return Optional.ofNullable(reglas.get(modalidad));
    }

    public Set<String> modalidades() {
        return Set.copyOf(reglas.keySet());
    }
}
