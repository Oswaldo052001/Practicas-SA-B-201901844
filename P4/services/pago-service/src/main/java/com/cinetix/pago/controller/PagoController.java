package com.cinetix.pago.controller;

import com.cinetix.pago.model.Pago;
import com.cinetix.pago.service.PagoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pagos")
public class PagoController {

    private final PagoService pagoService;

    public PagoController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    @PostMapping
    public ResponseEntity<Pago> crear(@RequestBody Map<String, Object> body) {
        Integer reservaId = (Integer) body.get("reservaId");
        BigDecimal monto = new BigDecimal(body.get("monto").toString());
        String metodoPago = (String) body.get("metodoPago");

        Pago pago = pagoService.crearPago(reservaId, monto, metodoPago);
        return ResponseEntity.status(201).body(pago);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pago> obtener(@PathVariable Long id) {
        return pagoService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reserva/{reservaId}")
    public List<Pago> listarPorReserva(@PathVariable Integer reservaId) {
        return pagoService.listarPorReserva(reservaId);
    }
}
