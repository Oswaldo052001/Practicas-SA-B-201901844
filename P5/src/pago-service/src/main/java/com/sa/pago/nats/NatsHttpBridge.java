package com.sa.pago.nats;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.nats.client.Connection;
import io.nats.client.Dispatcher;
import io.nats.client.Message;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Practica 6: el api-gateway ya no le habla por HTTP directo a este
// servicio (asi funcionaba en la Practica 5 con http-proxy-middleware).
// Este bridge se suscribe al subject de NATS y reenvia, por loopback, al
// mismo servidor embebido de Spring (Tomcat) que ya escucha en localhost.
// PagoController no cambia: solo cambia el transporte entre el gateway y
// este servicio, que ahora esta mediado por el broker.
@Component
public class NatsHttpBridge {

    private static final String SERVICE_NAME = "pago-service";
    private static final List<String> HEADERS_A_OMITIR = List.of("host", "content-length", "connection", "transfer-encoding");

    private final Connection natsConnection;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${server.port}")
    private int localPort;

    public NatsHttpBridge(Connection natsConnection) {
        this.natsConnection = natsConnection;
    }

    @PostConstruct
    public void iniciar() {
        String subject = "svc." + SERVICE_NAME + ".http";
        Dispatcher dispatcher = natsConnection.createDispatcher(this::manejarMensaje);
        // queue group: si hay varias replicas del pod, NATS reparte cada
        // peticion entre una sola instancia (balanceo de carga del broker).
        dispatcher.subscribe(subject, SERVICE_NAME + "-workers");
        System.out.println("[pago-service] conectado a NATS, escuchando subject \"" + subject + "\"");
    }

    @SuppressWarnings("unchecked")
    private void manejarMensaje(Message msg) {
        try {
            Map<String, Object> peticion = objectMapper.readValue(msg.getData(), Map.class);
            String method = (String) peticion.get("method");
            String path = (String) peticion.get("path");
            Map<String, String> headers = (Map<String, String>) peticion.getOrDefault("headers", new HashMap<>());
            String body = (String) peticion.get("body");

            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create("http://127.0.0.1:" + localPort + path))
                    .timeout(Duration.ofSeconds(10));

            for (Map.Entry<String, String> header : headers.entrySet()) {
                if (HEADERS_A_OMITIR.contains(header.getKey().toLowerCase())) {
                    continue;
                }
                try {
                    builder.header(header.getKey(), header.getValue());
                } catch (IllegalArgumentException ignored) {
                    // header restringido por el cliente HTTP de Java, se omite
                }
            }

            HttpRequest.BodyPublisher publicadorCuerpo = (body == null || body.isEmpty())
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8);
            builder.method(method, publicadorCuerpo);

            HttpResponse<String> respuesta = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            responder(msg, respuesta.statusCode(), respuesta.headers().map(), respuesta.body());
        } catch (Exception e) {
            try {
                Map<String, Object> sobre = new HashMap<>();
                sobre.put("status", 500);
                sobre.put("headers", new HashMap<>());
                sobre.put("body", "{\"error\":\"" + e.getMessage() + "\"}");
                natsConnection.publish(msg.getReplyTo(), objectMapper.writeValueAsBytes(sobre));
            } catch (Exception ignored) {
                // si ni siquiera se puede responder el error, el gateway
                // agotara el timeout de la peticion NATS.
            }
        }
    }

    private void responder(Message msg, int status, Map<String, List<String>> headers, String body) throws Exception {
        Map<String, Object> sobre = new HashMap<>();
        sobre.put("status", status);
        Map<String, String> headersRespuesta = new HashMap<>();
        for (Map.Entry<String, List<String>> h : headers.entrySet()) {
            if (!h.getValue().isEmpty()) {
                headersRespuesta.put(h.getKey(), h.getValue().get(0));
            }
        }
        sobre.put("headers", headersRespuesta);
        sobre.put("body", body);
        natsConnection.publish(msg.getReplyTo(), objectMapper.writeValueAsBytes(sobre));
    }
}
