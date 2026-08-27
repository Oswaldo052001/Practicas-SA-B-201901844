package com.sa.pago.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String QUEUE_PAGOS = "pagos-procesados";

    @Bean
    public Queue colaPagosProcesados() {
        // durable=true: la cola sobrevive a un reinicio del broker, requisito
        // obligatorio del enunciado.
        return QueueBuilder.durable(QUEUE_PAGOS).build();
    }
}
