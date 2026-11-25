import com.sun.source.tree.*;
import com.sun.source.util.*;
import javax.tools.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;
import java.util.stream.*;

/**
 * Mide sobre el codigo REAL: complejidad ciclomatica por metodo (McCabe: 1 + if/for/while/do/case/catch/?:/&&/||)
 * y acoplamiento por paquete (Ca, Ce, I, A, D) a partir de los imports.
 * Uso: java herramientas/Metricas.java src/main/java [salida.csv]
 * Con salida.csv escribe Ca, Ce, I, A y D por paquete y por componente (dominio de ADR-01: los dos primeros segmentos
 * del paquete, p. ej. domain.rules agrupa domain.rules, domain.rules.evaluacion y domain.rules.modelo).
 * Complementa (no reemplaza) a PMD, JaCoCo y ArchUnit del pipeline.
 */
public class Metricas {
    static final String RAIZ = "co.edu.unal.apuntado.";

    public static void main(String[] args) throws Exception {
        Path src = Path.of(args.length > 0 ? args[0] : "src/main/java");
        List<Path> archivos;
        try (Stream<Path> s = Files.walk(src)) { archivos = s.filter(p -> p.toString().endsWith(".java")).sorted().toList(); }
        complejidad(archivos);
        acoplamiento(archivos, args.length > 1 ? Path.of(args[1]) : null);
    }

    // ---------------------------------------------------------------- complejidad
    static void complejidad(List<Path> archivos) throws Exception {
        JavaCompiler c = ToolProvider.getSystemJavaCompiler();
        StandardJavaFileManager fm = c.getStandardFileManager(null, null, null);
        JavacTask task = (JavacTask) c.getTask(null, fm, null, List.of(), null, fm.getJavaFileObjectsFromPaths(archivos));
        List<String[]> filas = new ArrayList<>();
        int[] totalMetodos = {0};
        for (CompilationUnitTree cu : task.parse()) {
            String archivo = Path.of(cu.getSourceFile().toUri()).getFileName().toString().replace(".java", "");
            String nombrePaquete = cu.getPackageName() == null ? "" : cu.getPackageName().toString();
            String paquete = nombrePaquete.startsWith(RAIZ) ? nombrePaquete.substring(RAIZ.length()) : "(raiz)";
            new TreeScanner<Void, String>() {
                @Override public Void visitMethod(MethodTree m, String clase) {
                    if (m.getBody() != null) {
                        int cc = cc(m.getBody());
                        totalMetodos[0]++;
                        filas.add(new String[]{archivo + "." + m.getName(), String.valueOf(cc), paquete});
                    }
                    return super.visitMethod(m, clase);
                }
            }.scan(cu, archivo);
        }
        filas.sort((a, b) -> Integer.parseInt(b[1]) - Integer.parseInt(a[1]));
        int max = Integer.parseInt(filas.get(0)[1]);
        long sobre = filas.stream().filter(f -> Integer.parseInt(f[1]) > 10).count();
        double media = filas.stream().mapToInt(f -> Integer.parseInt(f[1])).average().orElse(0);
        System.out.println("## COMPLEJIDAD");
        System.out.printf(Locale.ROOT, "metodos=%d  CC_max=%d  CC_media=%.2f  metodos_con_CC>10=%d%n", totalMetodos[0], max, media, sobre);
        filas.stream().limit(10).forEach(f -> System.out.println("  " + f[1] + "  " + f[0]));
        System.out.println("\n## COMPLEJIDAD POR PAQUETE");
        System.out.println("paquete,metodos,CC_max,CC_media,metodo_max");
        Map<String, List<String[]>> porPaquete = new TreeMap<>();
        filas.forEach(f -> porPaquete.computeIfAbsent(f[2], k -> new ArrayList<>()).add(f));
        porPaquete.forEach((paq, l) -> System.out.printf(Locale.ROOT, "%s,%d,%s,%.2f,%s%n", paq, l.size(), l.get(0)[1],
                l.stream().mapToInt(f -> Integer.parseInt(f[1])).average().orElse(0), l.get(0)[0]));
    }

    static int cc(Tree cuerpo) {
        int[] n = {1};
        new TreeScanner<Void, Void>() {
            @Override public Void visitIf(IfTree t, Void v) { n[0]++; return super.visitIf(t, v); }
            @Override public Void visitForLoop(ForLoopTree t, Void v) { n[0]++; return super.visitForLoop(t, v); }
            @Override public Void visitEnhancedForLoop(EnhancedForLoopTree t, Void v) { n[0]++; return super.visitEnhancedForLoop(t, v); }
            @Override public Void visitWhileLoop(WhileLoopTree t, Void v) { n[0]++; return super.visitWhileLoop(t, v); }
            @Override public Void visitDoWhileLoop(DoWhileLoopTree t, Void v) { n[0]++; return super.visitDoWhileLoop(t, v); }
            @Override public Void visitCase(CaseTree t, Void v) { if (!t.getExpressions().isEmpty()) n[0]++; return super.visitCase(t, v); }
            @Override public Void visitCatch(CatchTree t, Void v) { n[0]++; return super.visitCatch(t, v); }
            @Override public Void visitConditionalExpression(ConditionalExpressionTree t, Void v) { n[0]++; return super.visitConditionalExpression(t, v); }
            @Override public Void visitBinary(BinaryTree t, Void v) {
                if (t.getKind() == Tree.Kind.CONDITIONAL_AND || t.getKind() == Tree.Kind.CONDITIONAL_OR) n[0]++;
                return super.visitBinary(t, v);
            }
        }.scan(cuerpo, null);
        return n[0];
    }

    // ---------------------------------------------------------------- acoplamiento
    record Tipo(String paquete, String nombre, boolean abstracto) {}

    static void acoplamiento(List<Path> archivos, Path csv) throws Exception {
        Map<String, Tipo> tipos = new TreeMap<>();
        Map<String, Set<String>> imports = new HashMap<>();
        Pattern pkg = Pattern.compile("^package\\s+([\\w.]+);", Pattern.MULTILINE);
        Pattern imp = Pattern.compile("^import\\s+(?:static\\s+)?([\\w.]+?)(?:\\.\\*)?;", Pattern.MULTILINE);
        Pattern decl = Pattern.compile("^(?:public\\s+)?(?:sealed\\s+|final\\s+)?(?:abstract\\s+)?(interface|class|enum|record)\\s+(\\w+)", Pattern.MULTILINE);
        for (Path p : archivos) {
            String s = Files.readString(p);
            Matcher mp = pkg.matcher(s); mp.find();
            String paquete = mp.group(1).replace(RAIZ, "");
            if (paquete.equals(mp.group(1))) paquete = "(raiz)";
            Matcher md = decl.matcher(s); md.find();
            boolean abs = md.group(1).equals("interface") || s.contains("abstract class");
            String nombre = md.group(2);
            tipos.put(mp.group(1) + "." + nombre, new Tipo(paquete, nombre, abs));
            Set<String> destinos = new TreeSet<>();
            Matcher mi = imp.matcher(s);
            while (mi.find()) if (mi.group(1).startsWith(RAIZ)) destinos.add(mi.group(1));
            imports.put(mp.group(1) + "." + nombre, destinos);
        }
        // un import de un tipo anidado (A.B) apunta al tipo contenedor A
        Function<String, String> aTipo = f -> { String x = f; while (!tipos.containsKey(x) && x.contains(".")) x = x.substring(0, x.lastIndexOf('.')); return tipos.containsKey(x) ? x : null; };
        Map<String, Set<String>> ce = new TreeMap<>();
        Map<String, Set<String>> ceClases = new TreeMap<>();
        tipos.values().forEach(t -> ce.computeIfAbsent(t.paquete(), k -> new TreeSet<>()));
        imports.forEach((origen, dests) -> {
            String po = tipos.get(origen).paquete();
            for (String d : dests) {
                String t = aTipo.apply(d);
                if (t == null) continue;
                String pd = tipos.get(t).paquete();
                if (!pd.equals(po)) ce.get(po).add(pd);
                ceClases.computeIfAbsent(origen, k -> new TreeSet<>()).add(t);
            }
        });
        System.out.println("\n## ACOPLAMIENTO POR PAQUETE (Martin, 2003)");
        System.out.println("paquete,tipos,Ca,Ce,I,A,D");
        for (String p : ce.keySet()) {
            long ca = ce.entrySet().stream().filter(e -> e.getValue().contains(p)).count();
            int cef = ce.get(p).size();
            long total = tipos.values().stream().filter(t -> t.paquete().equals(p)).count();
            long abs = tipos.values().stream().filter(t -> t.paquete().equals(p) && t.abstracto()).count();
            double i = ca + cef == 0 ? 0 : (double) cef / (ca + cef);
            double a = total == 0 ? 0 : (double) abs / total;
            System.out.printf(Locale.ROOT, "%s,%d,%d,%d,%.2f,%.2f,%.2f%n", p, total, ca, cef, i, a, Math.abs(a + i - 1));
        }
        if (csv != null) {
            escribirCsv(csv, ce, tipos);
        }
        System.out.println("\n## DEPENDENCIAS ENTRE PAQUETES");
        ce.forEach((p, d) -> System.out.println(p + " -> " + d));
        // ciclos (DFS)
        System.out.println("\n## CICLOS ENTRE PAQUETES");
        List<String> ciclos = new ArrayList<>();
        for (String p : ce.keySet()) buscarCiclos(p, p, ce, new ArrayDeque<>(List.of(p)), ciclos);
        System.out.println(ciclos.isEmpty() ? "ninguno" : String.join("\n", new TreeSet<>(ciclos)));
        // Ce del orquestador a nivel de tipo
        System.out.println("\n## Ce(TurnOrchestratorComponent) a nivel de tipo");
        String to = RAIZ + "domain.gameplay.TurnOrchestratorComponent";
        Set<String> dest = ceClases.get(to);
        System.out.println(dest.size() + " tipos: " + dest.stream().map(x -> tipos.get(x).nombre()).collect(Collectors.toList()));
        Set<String> componentes = dest.stream().map(x -> tipos.get(x).nombre()).filter(n -> n.startsWith("I")).collect(Collectors.toSet());
        // reglas estaticas verificadas sobre imports (equivalentes a FF-01/05/06/07/08b)
        System.out.println("\n## VERIFICACION DE REGLAS SOBRE IMPORTS");
        regla("FF-01 domain.rules sin infraestructura/gameplay/lobby/spring", imports, tipos, "domain.rules", List.of("infrastructure", "domain.gameplay", "domain.lobby", "config"), List.of("org.springframework", "jakarta", "java.sql"), archivos);
        regla("FF-05 OrdenMazo solo en mazo/auditoria", imports, tipos, null, List.of(), List.of(), archivos);
        regla("FF-06 gateway sin evaluacion/modelo", imports, tipos, "infrastructure.realtime", List.of("domain.rules.evaluacion", "domain.rules.modelo"), List.of(), archivos);
        regla("FF-07 realtime sin persistence", imports, tipos, "infrastructure.realtime", List.of("infrastructure.persistence"), List.of(), archivos);
        regla("FF-08b persistence sin dominio", imports, tipos, "infrastructure.persistence", List.of("domain"), List.of(), archivos);
        regla("FF-01b modelo sin evaluacion/gameplay/infra", imports, tipos, "domain.rules.modelo", List.of("domain.rules.evaluacion", "domain.gameplay", "infrastructure"), List.of(), archivos);
    }

    interface Function<A, B> extends java.util.function.Function<A, B> {}

    /** Componente = dominio de ADR-01: los dos primeros segmentos del paquete (config y (raiz) quedan solos). */
    static String componente(String paquete) {
        String[] partes = paquete.split("\\.");
        return partes.length <= 2 ? paquete : partes[0] + "." + partes[1];
    }

    static String fila(String nivel, String nombre, long total, long abs, long ca, long ce) {
        double i = ca + ce == 0 ? 0 : (double) ce / (ca + ce);
        double a = total == 0 ? 0 : (double) abs / total;
        return String.format(Locale.ROOT, "%s,%s,%d,%d,%d,%d,%.2f,%.2f,%.2f", nivel, nombre, total, abs, ca, ce, i, a,
                Math.abs(a + i - 1));
    }

    static void escribirCsv(Path csv, Map<String, Set<String>> ce, Map<String, Tipo> tipos) throws IOException {
        List<String> lineas = new ArrayList<>(List.of("nivel,nombre,tipos,abstractos,Ca,Ce,I,A,D"));
        for (String p : ce.keySet()) {
            long ca = ce.entrySet().stream().filter(e -> e.getValue().contains(p)).count();
            long total = tipos.values().stream().filter(t -> t.paquete().equals(p)).count();
            long abs = tipos.values().stream().filter(t -> t.paquete().equals(p) && t.abstracto()).count();
            lineas.add(fila("paquete", p, total, abs, ca, ce.get(p).size()));
        }
        Map<String, Set<String>> ceComp = new TreeMap<>();
        ce.forEach((p, ds) -> {
            Set<String> d = ceComp.computeIfAbsent(componente(p), k -> new TreeSet<>());
            ds.stream().map(Metricas::componente).filter(c -> !c.equals(componente(p))).forEach(d::add);
        });
        for (String c : ceComp.keySet()) {
            long ca = ceComp.entrySet().stream().filter(e -> e.getValue().contains(c)).count();
            long total = tipos.values().stream().filter(t -> componente(t.paquete()).equals(c)).count();
            long abs = tipos.values().stream().filter(t -> componente(t.paquete()).equals(c) && t.abstracto()).count();
            lineas.add(fila("componente", c, total, abs, ca, ceComp.get(c).size()));
        }
        Files.write(csv, lineas);
        System.out.println("(CSV escrito en " + csv + ")");
    }

    static void regla(String nombre, Map<String, Set<String>> imports, Map<String, Tipo> tipos, String origen,
                      List<String> prohibidos, List<String> externosProhibidos, List<Path> archivos) throws IOException {
        List<String> violaciones = new ArrayList<>();
        if (origen == null) { // FF-05
            for (Path p : archivos) {
                String s = Files.readString(p);
                String ruta = p.toString().replace(File.separatorChar, '/');
                if (s.contains("OrdenMazo") && !ruta.contains("gameplay/mazo") && !ruta.contains("gameplay/auditoria"))
                    violaciones.add(ruta);
            }
        } else {
            for (Path p : archivos) {
                String s = Files.readString(p);
                Matcher mp = Pattern.compile("^package\\s+([\\w.]+);", Pattern.MULTILINE).matcher(s); mp.find();
                String paquete = mp.group(1).replace(RAIZ, "");
                if (!(paquete.equals(origen) || paquete.startsWith(origen + "."))) continue;
                Matcher mi = Pattern.compile("^import\\s+(?:static\\s+)?([\\w.]+?)(?:\\.\\*)?;", Pattern.MULTILINE).matcher(s);
                while (mi.find()) {
                    String i = mi.group(1);
                    String rel = i.replace(RAIZ, "");
                    boolean malo = prohibidos.stream().anyMatch(x -> i.startsWith(RAIZ) && (rel.equals(x) || rel.startsWith(x + ".")))
                            || externosProhibidos.stream().anyMatch(i::startsWith);
                    if (malo) violaciones.add(p.getFileName() + " importa " + i);
                }
            }
        }
        System.out.println((violaciones.isEmpty() ? "OK     " : "FALLA  ") + nombre + (violaciones.isEmpty() ? "" : " -> " + violaciones));
    }

    static void buscarCiclos(String inicio, String actual, Map<String, Set<String>> g, Deque<String> camino, List<String> out) {
        for (String sig : g.getOrDefault(actual, Set.of())) {
            if (sig.equals(inicio)) { List<String> c = new ArrayList<>(camino); out.add(String.join(" -> ", c) + " -> " + inicio); }
            else if (!camino.contains(sig)) { camino.addLast(sig); buscarCiclos(inicio, sig, g, camino, out); camino.removeLast(); }
        }
    }
}
