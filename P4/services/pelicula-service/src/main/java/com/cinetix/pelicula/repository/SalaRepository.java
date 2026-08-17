package com.cinetix.pelicula.repository;

import com.cinetix.pelicula.model.Sala;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalaRepository extends JpaRepository<Sala, Long> {
}
