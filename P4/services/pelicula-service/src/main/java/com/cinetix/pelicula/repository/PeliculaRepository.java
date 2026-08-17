package com.cinetix.pelicula.repository;

import com.cinetix.pelicula.model.Pelicula;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PeliculaRepository extends JpaRepository<Pelicula, Long> {
}
