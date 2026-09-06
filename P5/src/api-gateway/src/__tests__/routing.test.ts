import { encontrarRuta } from "../routing";

// Practica 7: pruebas unitarias de la tabla de enrutamiento del
// api-gateway. Son las pruebas "base" de la piramide: rapidas, aisladas,
// sin red ni NATS, cubriendo cada regla de reescritura y el caso 404.
describe("encontrarRuta", () => {
  it("enruta /api/auth/login al auth-service quitando el prefijo", () => {
    const ruta = encontrarRuta("/api/auth/login");
    expect(ruta?.servicio).toBe("auth-service");
    expect(ruta?.reescribirPath("/api/auth/login")).toBe("/login");
  });

  it("enruta /api/auth (raiz) a '/' en vez de string vacio", () => {
    const ruta = encontrarRuta("/api/auth");
    expect(ruta?.reescribirPath("/api/auth")).toBe("/");
  });

  it("enruta /api/graphql-reservas al reserva-service reescribiendo a /graphql", () => {
    const ruta = encontrarRuta("/api/graphql-reservas");
    expect(ruta?.servicio).toBe("reserva-service");
    expect(ruta?.reescribirPath("/api/graphql-reservas")).toBe("/graphql");
  });

  it("enruta /api/reservas/5 al reserva-service preservando el subpath", () => {
    const ruta = encontrarRuta("/api/reservas/5");
    expect(ruta?.servicio).toBe("reserva-service");
    expect(ruta?.reescribirPath("/api/reservas/5")).toBe("/reservas/5");
  });

  it("enruta /api/pagos al pago-service", () => {
    const ruta = encontrarRuta("/api/pagos/confirmar");
    expect(ruta?.servicio).toBe("pago-service");
    expect(ruta?.reescribirPath("/api/pagos/confirmar")).toBe("/confirmar");
  });

  it("enruta /api/notificaciones al notificacion-service", () => {
    const ruta = encontrarRuta("/api/notificaciones");
    expect(ruta?.servicio).toBe("notificacion-service");
    expect(ruta?.reescribirPath("/api/notificaciones")).toBe("/");
  });

  it("retorna undefined para una ruta no reconocida (el llamador responde 404)", () => {
    expect(encontrarRuta("/api/no-existe")).toBeUndefined();
    expect(encontrarRuta("/")).toBeUndefined();
  });
});
