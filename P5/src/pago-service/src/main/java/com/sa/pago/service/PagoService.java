package com.sa.pago.service;

import com.sa.pago.model.Pago;
import com.sa.pago.repository.PagoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.nats.client.JetStream;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
public class PagoService {

    private final PagoRepository repository;
    private final ProveedorPago proveedorPago;
    private final JetStream jetStream;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${nats.subject.pagos}")
    private String subjectPagos;

    @Autowired
    public PagoService(PagoRepository repository, ProveedorPago proveedorPago, JetStream jetStream) {
        this.repository = repository;
        this.proveedorPago = proveedorPago;
        this.jetStream = jetStream;
    }

    // Flujo sincrono: valida y cobra con el proveedor externo, guarda el pago.
    // Flujo asincrono obligatorio: publica el evento en NATS JetStream y
    // retorna de inmediato, sin esperar a que notificacion-service lo procese.
    public Pago procesarPago(Long reservaId, BigDecimal monto) {
        boolean aprobado = proveedorPago.procesarCobro(reservaId, monto.doubleValue());
        String estado = aprobado ? "aprobado" : "rechazado";

        Pago pago = repository.save(new Pago(reservaId, monto, estado));

        if (aprobado) {
            publicarEventoPago(pago);
        }

        return pago;
    }

    private void publicarEventoPago(Pago pago) {
        try {
            Map<String, Object> evento = new HashMap<>();
            evento.put("reservaId", pago.getReservaId());
            evento.put("monto", pago.getMonto());
            evento.put("pagoId", pago.getId());

            byte[] mensaje = objectMapper.writeValueAsBytes(evento);

            // jetStream.publish() confirma que el broker persistio el
            // mensaje en el stream antes de continuar: publicacion
            // asincrona respecto al consumidor (no espera a que
            // notificacion-service lo procese), pero con confirmacion de
            // durabilidad, equivalente al "persistent: true" que se usaba
            // con RabbitMQ.
            jetStream.publish(subjectPagos, mensaje);
            System.out.println("[pago-service] evento publicado en " + subjectPagos + ": " + new String(mensaje, StandardCharsets.UTF_8));
        } catch (Exception e) {
            System.err.println("[pago-service] error publicando evento de pago: " + e.getMessage());
        }
    }
}
