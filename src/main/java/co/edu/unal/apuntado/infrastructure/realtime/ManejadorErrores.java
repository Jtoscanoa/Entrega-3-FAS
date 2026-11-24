package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.lobby.LobbyException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ManejadorErrores {

    @ExceptionHandler(LobbyException.class)
    public ResponseEntity<Map<String, String>> lobby(LobbyException e) {
        HttpStatus estado = e.motivo() == LobbyException.Motivo.SALA_INEXISTENTE
                ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT;
        return ResponseEntity.status(estado).body(Map.of("motivo", e.motivo().name()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> argumento(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("motivo", e.getMessage()));
    }
}
