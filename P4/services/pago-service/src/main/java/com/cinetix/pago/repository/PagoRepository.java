package com.cinetix.pago.repository;

import com.cinetix.pago.model.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PagoRepository extends JpaRepository<Pago, Long> {
    List<Pago> findByReservaId(Integer reservaId);
}
