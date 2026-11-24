package co.edu.unal.apuntado.config;

import co.edu.unal.apuntado.domain.gameplay.IEventosPartida;
import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.domain.gameplay.ProgramadorTurnos;
import co.edu.unal.apuntado.domain.gameplay.TurnOrchestratorComponent;
import co.edu.unal.apuntado.domain.gameplay.auditoria.DealAuditComponent;
import co.edu.unal.apuntado.domain.gameplay.auditoria.IAuditoriaReparto;
import co.edu.unal.apuntado.domain.gameplay.mazo.DeckManagementComponent;
import co.edu.unal.apuntado.domain.gameplay.mazo.IMazo;
import co.edu.unal.apuntado.domain.lobby.ILobby;
import co.edu.unal.apuntado.domain.lobby.LobbyPartyComponent;
import co.edu.unal.apuntado.domain.rules.GameConfigurationComponent;
import co.edu.unal.apuntado.domain.rules.HandEvaluatorComponent;
import co.edu.unal.apuntado.domain.rules.IConfiguracion;
import co.edu.unal.apuntado.domain.rules.IEvaluadorMano;
import co.edu.unal.apuntado.domain.rules.ILiquidacion;
import co.edu.unal.apuntado.domain.rules.RegistroReglas;
import co.edu.unal.apuntado.domain.rules.RoundScoringComponent;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.random.RandomGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Raiz de composicion: el dominio es Java puro y se cablea aqui, no con anotaciones de Spring. */
@Configuration
public class ComposicionRaiz {

    private static final Logger LOG = LoggerFactory.getLogger(ComposicionRaiz.class);

    @Bean
    RandomGenerator azarCriptografico() {
        return new SecureRandom();
    }

    @Bean
    Clock reloj() {
        return Clock.systemUTC();
    }

    @Bean
    IEvaluadorMano evaluadorMano() {
        return new HandEvaluatorComponent(new RegistroReglas());
    }

    @Bean
    ILiquidacion liquidacion() {
        return new RoundScoringComponent();
    }

    @Bean
    IConfiguracion configuracion() {
        return new GameConfigurationComponent();
    }

    @Bean
    IAuditoriaReparto auditoria(RandomGenerator azar) {
        return new DealAuditComponent(azar);
    }

    @Bean
    IMazo mazo(IAuditoriaReparto auditoria, RandomGenerator azar) {
        return new DeckManagementComponent(auditoria, azar);
    }

    @Bean(name = "planificadorTurnos")
    ThreadPoolTaskScheduler planificadorTurnos() {
        ThreadPoolTaskScheduler p = new ThreadPoolTaskScheduler();
        p.setPoolSize(4);
        p.setThreadNamePrefix("turnos-");
        return p;
    }

    @Bean(name = "planificadorLatidos")
    ThreadPoolTaskScheduler planificadorLatidos() {
        ThreadPoolTaskScheduler p = new ThreadPoolTaskScheduler();
        p.setPoolSize(2);
        p.setThreadNamePrefix("latidos-");
        return p;
    }

    @Bean
    ProgramadorTurnos programadorTurnos(@org.springframework.beans.factory.annotation.Qualifier("planificadorTurnos")
                                        TaskScheduler planificador, Clock reloj) {
        return (espera, accion) -> planificador.schedule(() -> ejecutar(accion), reloj.instant().plus(espera));
    }

    private static void ejecutar(Runnable accion) {
        try {
            accion.run();
        } catch (RuntimeException e) {
            LOG.warn("Vencimiento de turno sin efecto: {}", e.toString());
        }
    }

    @Bean
    ITurno turnos(IEvaluadorMano evaluador, ILiquidacion liquidacion, IConfiguracion configuracion, IMazo mazo,
                  IAuditoriaReparto auditoria, IMatchState estado, IEventosPartida eventos,
                  ProgramadorTurnos programador, Clock reloj) {
        return new TurnOrchestratorComponent(evaluador, liquidacion, configuracion, mazo, auditoria, estado,
                eventos, programador, reloj);
    }

    @Bean
    ILobby lobby(ITurno turnos, IConfiguracion configuracion, RandomGenerator azar) {
        return new LobbyPartyComponent(turnos, configuracion, azar);
    }
}
