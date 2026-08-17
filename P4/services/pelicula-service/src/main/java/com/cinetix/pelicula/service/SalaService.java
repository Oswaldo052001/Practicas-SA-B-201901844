package com.cinetix.pelicula.service;

import com.cinetix.pelicula.model.Asiento;
import com.cinetix.pelicula.model.Sala;
import com.cinetix.pelicula.repository.AsientoRepository;
import com.cinetix.pelicula.repository.SalaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SalaService {

    private final SalaRepository salaRepository;
    private final AsientoRepository asientoRepository;

    public SalaService(SalaRepository salaRepository, AsientoRepository asientoRepository) {
        this.salaRepository = salaRepository;
        this.asientoRepository = asientoRepository;
    }

    public List<Sala> listarTodas() {
        return salaRepository.findAll();
    }

    public Optional<Sala> buscarPorId(Long id) {
        return salaRepository.findById(id);
    }

    public Sala crear(Sala sala) {
        return salaRepository.save(sala);
    }

    public Asiento crearAsiento(Long salaId, String fila, Integer numero) {
        Sala sala = salaRepository.findById(salaId)
                .orElseThrow(() -> new IllegalArgumentException("Sala no encontrada"));
        return asientoRepository.save(new Asiento(sala, fila, numero));
    }

    public List<Asiento> listarAsientosDeSala(Long salaId) {
        return asientoRepository.findBySalaId(salaId);
    }
}
