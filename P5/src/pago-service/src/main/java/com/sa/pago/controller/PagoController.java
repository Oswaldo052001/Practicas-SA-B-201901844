package com.sa.pago.controller;

import com.sa.pago.model.Pago;
import com.sa.pago.service.PagoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
public class PagoController {

    private final PagoService pagoService;

    @Autowired
    public PagoController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    @PostMapping("/pagos")
    public Pago crearPago(@RequestBody Map<String, Object> body) {
        Long reservaId = Long.valueOf(body.get("reservaId").toString());
        BigDecimal monto = new BigDecimal(body.get("monto").toString());
        return pagoService.procesarPago(reservaId, monto);
    }
}
