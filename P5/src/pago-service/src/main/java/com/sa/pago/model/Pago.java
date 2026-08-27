package com.sa.pago.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pagos")
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reserva_id", nullable = false)
    private Long reservaId;

    @Column(nullable = false)
    private BigDecimal monto;

    @Column(nullable = false)
    private String estado;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Pago() {}

    public Pago(Long reservaId, BigDecimal monto, String estado) {
        this.reservaId = reservaId;
        this.monto = monto;
        this.estado = estado;
    }

    public Long getId() { return id; }
    public Long getReservaId() { return reservaId; }
    public BigDecimal getMonto() { return monto; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
