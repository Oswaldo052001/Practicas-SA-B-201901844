package com.sa.pago.config;

import io.nats.client.Connection;
import io.nats.client.JetStream;
import io.nats.client.JetStreamApiException;
import io.nats.client.JetStreamManagement;
import io.nats.client.Nats;
import io.nats.client.Options;
import io.nats.client.api.StreamConfiguration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

// Practica 6: NATS JetStream reemplaza a RabbitMQ como broker de
// mensajeria, siguiendo la recomendacion del auxiliar (en la Practica 5 se
// uso RabbitMQ como alternativa a Kafka por consumo de memoria, sin seguir
// la recomendacion original de usar NATS).
@Configuration
public class NatsConfig {

    @Value("${nats.url}")
    private String natsUrl;

    @Value("${nats.user}")
    private String natsUser;

    @Value("${nats.password}")
    private String natsPassword;

    @Value("${nats.stream.pagos}")
    private String streamPagos;

    @Value("${nats.subject.pagos}")
    private String subjectPagos;

    @Bean(destroyMethod = "close")
    public Connection natsConnection() throws IOException, InterruptedException {
        Options options = new Options.Builder()
                .server(natsUrl)
                .userInfo(natsUser, natsPassword)
                .connectionTimeout(Duration.ofSeconds(5))
                .maxReconnects(-1)
                .build();

        // Reintentos al arrancar: NATS puede tardar unos segundos mas en
        // estar listo que el propio proceso de Spring Boot.
        IOException ultimoError = null;
        for (int intento = 1; intento <= 15; intento++) {
            try {
                return Nats.connect(options);
            } catch (IOException e) {
                ultimoError = e;
                System.out.println("[pago-service] NATS no disponible aun (intento " + intento + "/15), reintentando...");
                TimeUnit.SECONDS.sleep(3);
            }
        }
        throw ultimoError != null ? ultimoError : new IOException("No se pudo conectar a NATS");
    }

    @Bean
    public JetStream jetStream(Connection natsConnection) throws IOException, JetStreamApiException {
        asegurarStream(natsConnection);
        return natsConnection.jetStream();
    }

    // Crea el stream si todavia no existe (primer arranque de la
    // plataforma), equivalente al QueueBuilder.durable(...) que se usaba
    // con RabbitMQ.
    private void asegurarStream(Connection nc) throws IOException, JetStreamApiException {
        JetStreamManagement jsm = nc.jetStreamManagement();
        try {
            jsm.getStreamInfo(streamPagos);
        } catch (JetStreamApiException e) {
            StreamConfiguration streamConfig = StreamConfiguration.builder()
                    .name(streamPagos)
                    .subjects(subjectPagos)
                    .build();
            jsm.addStream(streamConfig);
            System.out.println("[pago-service] stream JetStream \"" + streamPagos + "\" creado (subject \"" + subjectPagos + "\")");
        }
    }
}
