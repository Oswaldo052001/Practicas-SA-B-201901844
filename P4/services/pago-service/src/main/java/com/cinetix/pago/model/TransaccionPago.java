package com.cinetix.pago.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transacciones_pago")
public class TransaccionPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pago_id")
    private Pago pago;

    private String referenciaProveedor;
    private String resultado;
    private LocalDateTime procesadoEn;

    public TransaccionPago() {
    }

    public TransaccionPago(Pago pago, String referenciaProveedor, String resultado) {
        this.pago = pago;
        this.referenciaProveedor = referenciaProveedor;
        this.resultado = resultado;
        this.procesadoEn = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Pago getPago() {
        return pago;
    }

    public void setPago(Pago pago) {
        this.pago = pago;
    }

    public String getReferenciaProveedor() {
        return referenciaProveedor;
    }

    public void setReferenciaProveedor(String referenciaProveedor) {
        this.referenciaProveedor = referenciaProveedor;
    }

    public String getResultado() {
        return resultado;
    }

    public void setResultado(String resultado) {
        this.resultado = resultado;
    }

    public LocalDateTime getProcesadoEn() {
        return procesadoEn;
    }
}
