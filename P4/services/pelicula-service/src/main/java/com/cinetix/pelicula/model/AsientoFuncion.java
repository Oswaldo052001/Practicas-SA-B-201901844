package com.cinetix.pelicula.model;

import jakarta.persistence.*;

@Entity
@Table(name = "asientos_funcion")
public class AsientoFuncion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "funcion_id")
    private Funcion funcion;

    @ManyToOne
    @JoinColumn(name = "asiento_id")
    private Asiento asiento;

    private String estado;

    public AsientoFuncion() {
    }

    public AsientoFuncion(Funcion funcion, Asiento asiento, String estado) {
        this.funcion = funcion;
        this.asiento = asiento;
        this.estado = estado;
    }

    public Long getId() {
        return id;
    }

    public Funcion getFuncion() {
        return funcion;
    }

    public void setFuncion(Funcion funcion) {
        this.funcion = funcion;
    }

    public Asiento getAsiento() {
        return asiento;
    }

    public void setAsiento(Asiento asiento) {
        this.asiento = asiento;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}
