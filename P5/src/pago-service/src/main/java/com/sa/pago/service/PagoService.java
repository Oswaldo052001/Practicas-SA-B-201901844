package com.sa.pago.service;

import com.sa.pago.config.RabbitMQConfig;
import com.sa.pago.model.Pago;
import com.sa.pago.repository.PagoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
public class PagoService {

    private final PagoRepository repository;
    private final ProveedorPago proveedorPago;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public PagoService(PagoRepository repository, ProveedorPago proveedorPago,
                        RabbitTemplate rabbitTemplate) {
        this.repository = repository;
        this.proveedorPago = proveedorPago;
        this.rabbitTemplate = rabbitTemplate;
    }

    // Flujo sincrono: valida y cobra con el proveedor externo, guarda el pago.
    // Flujo asincrono obligatorio: publica el evento en RabbitMQ y retorna de
    // inmediato, sin esperar a que notificacion-service lo procese.
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

            String mensaje = objectMapper.writeValueAsString(evento);

            // convertAndSend es asincrono: el productor publica el mensaje en
            // la cola durable y el metodo retorna de inmediato, sin esperar a
            // que notificacion-service lo consuma.
            rabbitTemplate.convertAndSend(RabbitMQConfig.QUEUE_PAGOS, mensaje);
            System.out.println("[pago-service] evento publicado en " + RabbitMQConfig.QUEUE_PAGOS + ": " + mensaje);
        } catch (Exception e) {
            System.err.println("[pago-service] error publicando evento de pago: " + e.getMessage());
        }
    }
}

