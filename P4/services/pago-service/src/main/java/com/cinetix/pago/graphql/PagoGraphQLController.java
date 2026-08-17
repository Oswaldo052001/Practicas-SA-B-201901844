package com.cinetix.pago.graphql;

import com.cinetix.pago.model.Pago;
import com.cinetix.pago.service.PagoService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Controller
public class PagoGraphQLController {

    private final PagoService pagoService;

    public PagoGraphQLController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    @QueryMapping
    public Pago pago(@Argument String id) {
        return pagoService.buscarPorId(Long.valueOf(id)).orElse(null);
    }

    @QueryMapping
    public List<Pago> pagosPorReserva(@Argument Integer reservaId) {
        return pagoService.listarPorReserva(reservaId);
    }

    @MutationMapping
    public Pago crearPago(@Argument Map<String, Object> datos) {
        Integer reservaId = (Integer) datos.get("reservaId");
        BigDecimal monto = BigDecimal.valueOf(((Number) datos.get("monto")).doubleValue());
        String metodoPago = (String) datos.get("metodoPago");
        return pagoService.crearPago(reservaId, monto, metodoPago);
    }
}
