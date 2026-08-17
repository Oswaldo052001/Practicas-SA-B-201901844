package com.cinetix.pago.service;

/**
 * Abstraccion del proveedor de pago externo. Aplica el principio de inversion
 * de dependencias: PagoService depende de esta interfaz, no de una
 * implementacion concreta del proveedor externo.
 */
public interface ProveedorPago {
    String procesar(Long pagoId, java.math.BigDecimal monto, String metodoPago);
}
