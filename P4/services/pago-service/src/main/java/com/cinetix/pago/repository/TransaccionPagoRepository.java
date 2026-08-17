package com.cinetix.pago.repository;

import com.cinetix.pago.model.TransaccionPago;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransaccionPagoRepository extends JpaRepository<TransaccionPago, Long> {
}
