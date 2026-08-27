package com.sa.pago.service;

import org.springframework.stereotype.Component;

// Simula un proveedor de pago externo (ej. Stripe). Este componente solo se
// comunica con PagoService, nunca con pago_db directamente, respetando la
// regla senalada por el auxiliar sobre integridad y encapsulamiento de datos.
@Component
public class ProveedorPagoSimulado implements ProveedorPago {

    @Override
    public boolean procesarCobro(Long reservaId, double monto) {
        System.out.printf(
            "[proveedor-pago-simulado] cobrando Q%.2f para la reserva %d... aprobado%n",
            monto, reservaId
        );
        return true;
    }
}
