package com.cinetix.pago.service;

import com.cinetix.pago.model.Pago;
import com.cinetix.pago.model.TransaccionPago;
import com.cinetix.pago.repository.PagoRepository;
import com.cinetix.pago.repository.TransaccionPagoRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class PagoService {

    private final PagoRepository pagoRepository;
    private final TransaccionPagoRepository transaccionPagoRepository;
    private final ProveedorPago proveedorPago;

    public PagoService(PagoRepository pagoRepository,
                        TransaccionPagoRepository transaccionPagoRepository,
                        ProveedorPago proveedorPago) {
        this.pagoRepository = pagoRepository;
        this.transaccionPagoRepository = transaccionPagoRepository;
        this.proveedorPago = proveedorPago;
    }

    public Pago crearPago(Integer reservaId, BigDecimal monto, String metodoPago) {
        Pago pago = pagoRepository.save(new Pago(reservaId, monto, metodoPago));

        String referencia = proveedorPago.procesar(pago.getId(), monto, metodoPago);

        pago.setEstado("aprobado");
        pagoRepository.save(pago);

        TransaccionPago transaccion = new TransaccionPago(pago, referencia, "exitoso");
        transaccionPagoRepository.save(transaccion);

        return pago;
    }

    public Optional<Pago> buscarPorId(Long id) {
        return pagoRepository.findById(id);
    }

    public List<Pago> listarPorReserva(Integer reservaId) {
        return pagoRepository.findByReservaId(reservaId);
    }
}
