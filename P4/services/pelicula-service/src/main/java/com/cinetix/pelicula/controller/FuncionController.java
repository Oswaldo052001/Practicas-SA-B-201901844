package com.cinetix.pelicula.controller;

import com.cinetix.pelicula.model.AsientoFuncion;
import com.cinetix.pelicula.model.Funcion;
import com.cinetix.pelicula.service.FuncionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/funciones")
public class FuncionController {

    private final FuncionService funcionService;

    public FuncionController(FuncionService funcionService) {
        this.funcionService = funcionService;
    }

    @GetMapping
    public List<Funcion> listar() {
        return funcionService.listarTodas();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Funcion> obtener(@PathVariable Long id) {
        return funcionService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Funcion> crear(@RequestBody Funcion funcion) {
        return ResponseEntity.status(201).body(funcionService.crear(funcion));
    }

    @GetMapping("/{id}/asientos")
    public List<AsientoFuncion> asientosDisponibles(@PathVariable Long id) {
        return funcionService.obtenerAsientosDisponibles(id);
    }

    @PostMapping("/{id}/generar-asientos")
    public List<AsientoFuncion> generarAsientos(@PathVariable Long id) {
        return funcionService.generarAsientosDeFuncion(id);
    }

    @PatchMapping("/asientos/{asientoFuncionId}/reservar")
    public ResponseEntity<Void> reservarAsiento(@PathVariable Long asientoFuncionId) {
        funcionService.marcarAsientoComoReservado(asientoFuncionId);
        return ResponseEntity.noContent().build();
    }
}
