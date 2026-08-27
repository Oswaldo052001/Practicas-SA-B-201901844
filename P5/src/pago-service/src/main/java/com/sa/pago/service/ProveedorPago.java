package com.sa.pago.service;

public interface ProveedorPago {
    boolean procesarCobro(Long reservaId, double monto);
}
