package com.cinetix.pago.service;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Implementacion simulada del proveedor de pago externo. En un entorno real
 * esta clase haria una llamada HTTPS al proveedor (por ejemplo una pasarela
 * bancaria) fuera del cluster de microservicios.
 */
@Component
public class ProveedorPagoSimulado implements ProveedorPago {

    @Override
    public String procesar(Long pagoId, BigDecimal monto, String metodoPago) {
        return "REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
