package com.cinetix.pelicula.repository;

import com.cinetix.pelicula.model.Funcion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FuncionRepository extends JpaRepository<Funcion, Long> {
    List<Funcion> findByPeliculaId(Long peliculaId);
}
