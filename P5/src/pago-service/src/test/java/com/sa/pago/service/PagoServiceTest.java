package com.sa.pago.service;

import com.sa.pago.model.Pago;
import com.sa.pago.repository.PagoRepository;
import io.nats.client.JetStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Practica 7: pruebas unitarias de PagoService, mockeando el repositorio,
// el proveedor de pago y el cliente JetStream para no depender de Postgres
// ni de un broker NATS real (pruebas de la base de la piramide).
@ExtendWith(MockitoExtension.class)
class PagoServiceTest {

    @Mock
    private PagoRepository repository;

    @Mock
    private ProveedorPago proveedorPago;

    @Mock
    private JetStream jetStream;

    private PagoService pagoService;

    @BeforeEach
    void setUp() {
        pagoService = new PagoService(repository, proveedorPago, jetStream);
        // subjectPagos se inyecta con @Value en produccion; en la prueba
        // unitaria (sin contexto de Spring) se fija a mano.
        ReflectionTestUtils.setField(pagoService, "subjectPagos", "eventos.pagos.confirmado");
    }

    @Test
    void guardaElPagoComoAprobadoYPublicaElEventoCuandoElCobroSeAprueba() throws Exception {
        Long reservaId = 10L;
        BigDecimal monto = new BigDecimal("150.00");
        when(proveedorPago.procesarCobro(reservaId, monto.doubleValue())).thenReturn(true);
        when(repository.save(any(Pago.class))).thenAnswer(inv -> inv.getArgument(0));

        Pago resultado = pagoService.procesarPago(reservaId, monto);

        assertEquals("aprobado", resultado.getEstado());
        verify(repository).save(any(Pago.class));
        // Flujo asincrono obligatorio: solo se publica el evento cuando el
        // cobro fue aprobado.
        verify(jetStream).publish(eq("eventos.pagos.confirmado"), any(byte[].class));
    }

    @Test
    void guardaElPagoComoRechazadoYNoPublicaEventoCuandoElCobroFalla() throws Exception {
        Long reservaId = 11L;
        BigDecimal monto = new BigDecimal("75.50");
        when(proveedorPago.procesarCobro(reservaId, monto.doubleValue())).thenReturn(false);
        when(repository.save(any(Pago.class))).thenAnswer(inv -> inv.getArgument(0));

        Pago resultado = pagoService.procesarPago(reservaId, monto);

        assertEquals("rechazado", resultado.getEstado());
        verify(repository).save(any(Pago.class));
        verify(jetStream, never()).publish(anyString(), any(byte[].class));
    }
}
