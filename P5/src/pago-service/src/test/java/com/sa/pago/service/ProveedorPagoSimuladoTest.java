package com.sa.pago.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

// Practica 7: documenta con una prueba unitaria el comportamiento actual
// del proveedor simulado (siempre aprueba), a diferencia de un proveedor
// real que podria rechazar o fallar.
class ProveedorPagoSimuladoTest {

    @Test
    void siempreApruebaElCobroSimulado() {
        ProveedorPagoSimulado proveedor = new ProveedorPagoSimulado();

        assertTrue(proveedor.procesarCobro(1L, 100.0));
        assertTrue(proveedor.procesarCobro(2L, 0.0));
    }
}
