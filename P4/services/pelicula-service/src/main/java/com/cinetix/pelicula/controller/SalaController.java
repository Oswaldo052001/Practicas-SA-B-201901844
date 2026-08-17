package com.cinetix.pelicula.controller;

import com.cinetix.pelicula.model.Asiento;
import com.cinetix.pelicula.model.Sala;
import com.cinetix.pelicula.service.SalaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/salas")
public class SalaController {

    private final SalaService salaService;

    public SalaController(SalaService salaService) {
        this.salaService = salaService;
    }

    @GetMapping
    public List<Sala> listar() {
        return salaService.listarTodas();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sala> obtener(@PathVariable Long id) {
        return salaService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Sala> crear(@RequestBody Sala sala) {
        return ResponseEntity.status(201).body(salaService.crear(sala));
    }

    @PostMapping("/{id}/asientos")
    public ResponseEntity<Asiento> crearAsiento(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String fila = (String) body.get("fila");
        Integer numero = (Integer) body.get("numero");
        Asiento asiento = salaService.crearAsiento(id, fila, numero);
        return ResponseEntity.status(201).body(asiento);
    }

    @GetMapping("/{id}/asientos")
    public List<Asiento> listarAsientos(@PathVariable Long id) {
        return salaService.listarAsientosDeSala(id);
    }
}
