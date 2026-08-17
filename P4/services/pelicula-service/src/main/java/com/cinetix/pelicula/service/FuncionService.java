package com.cinetix.pelicula.service;

import com.cinetix.pelicula.model.Asiento;
import com.cinetix.pelicula.model.AsientoFuncion;
import com.cinetix.pelicula.model.Funcion;
import com.cinetix.pelicula.repository.AsientoFuncionRepository;
import com.cinetix.pelicula.repository.AsientoRepository;
import com.cinetix.pelicula.repository.FuncionRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class FuncionService {

    private final FuncionRepository funcionRepository;
    private final AsientoFuncionRepository asientoFuncionRepository;
    private final AsientoRepository asientoRepository;

    public FuncionService(FuncionRepository funcionRepository,
                           AsientoFuncionRepository asientoFuncionRepository,
                           AsientoRepository asientoRepository) {
        this.funcionRepository = funcionRepository;
        this.asientoFuncionRepository = asientoFuncionRepository;
        this.asientoRepository = asientoRepository;
    }

    public List<Funcion> listarTodas() {
        return funcionRepository.findAll();
    }

    public Optional<Funcion> buscarPorId(Long id) {
        return funcionRepository.findById(id);
    }

    public Funcion crear(Funcion funcion) {
        return funcionRepository.save(funcion);
    }

    public List<AsientoFuncion> obtenerAsientosDisponibles(Long funcionId) {
        return asientoFuncionRepository.findByFuncionId(funcionId);
    }

    public void marcarAsientoComoReservado(Long asientoFuncionId) {
        AsientoFuncion asientoFuncion = asientoFuncionRepository.findById(asientoFuncionId)
                .orElseThrow(() -> new IllegalArgumentException("Asiento de funcion no encontrado"));
        asientoFuncion.setEstado("reservado");
        asientoFuncionRepository.save(asientoFuncion);
    }

    public List<AsientoFuncion> generarAsientosDeFuncion(Long funcionId) {
        Funcion funcion = funcionRepository.findById(funcionId)
                .orElseThrow(() -> new IllegalArgumentException("Funcion no encontrada"));

        List<Asiento> asientosDeLaSala = asientoRepository.findBySalaId(funcion.getSala().getId());
        List<AsientoFuncion> creados = new ArrayList<>();

        for (Asiento asiento : asientosDeLaSala) {
            creados.add(asientoFuncionRepository.save(new AsientoFuncion(funcion, asiento, "disponible")));
        }

        return creados;
    }
}