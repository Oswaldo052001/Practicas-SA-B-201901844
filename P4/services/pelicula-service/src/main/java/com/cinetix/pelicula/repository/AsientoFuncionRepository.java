package com.cinetix.pelicula.repository;

import com.cinetix.pelicula.model.AsientoFuncion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AsientoFuncionRepository extends JpaRepository<AsientoFuncion, Long> {
    List<AsientoFuncion> findByFuncionId(Long funcionId);
}
