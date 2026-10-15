import { ReservaService } from "../ReservaService";
import { ReservaRepository } from "../../repositories/ReservaRepository";

// Practica 7: pruebas unitarias de la logica de negocio de reservas,
// mockeando el repositorio para no depender de Postgres real.
jest.mock("../../repositories/ReservaRepository");

const RepoMock = ReservaRepository as jest.MockedClass<typeof ReservaRepository>;

describe("ReservaService", () => {
  beforeEach(() => {
    RepoMock.mockClear();
    RepoMock.prototype.crear.mockReset();
    RepoMock.prototype.buscarPorId.mockReset();
    RepoMock.prototype.actualizarEstado.mockReset();
  });

  describe("crearReserva", () => {
    it("rechaza una cantidad de asientos igual a cero", async () => {
      const service = new ReservaService();
      await expect(service.crearReserva(1, 10, 0)).rejects.toThrow(
        "La cantidad de asientos debe ser mayor a cero"
      );
      expect(RepoMock.prototype.crear).not.toHaveBeenCalled();
    });

    it("rechaza una cantidad de asientos negativa", async () => {
      const service = new ReservaService();
      await expect(service.crearReserva(1, 10, -3)).rejects.toThrow(
        "La cantidad de asientos debe ser mayor a cero"
      );
    });

    it("delega en el repositorio cuando la cantidad es valida", async () => {
      const reservaEsperada = { id: 1, usuario_id: 1, funcion_id: 10, asientos: 2, estado: "pendiente" };
      RepoMock.prototype.crear.mockResolvedValueOnce(reservaEsperada);

      const service = new ReservaService();
      const resultado = await service.crearReserva(1, 10, 2);

      expect(RepoMock.prototype.crear).toHaveBeenCalledWith(1, 10, 2);
      expect(resultado).toEqual(reservaEsperada);
    });
  });

  describe("confirmarPago", () => {
    it("lanza error si la reserva no existe", async () => {
      RepoMock.prototype.buscarPorId.mockResolvedValueOnce(null);
      const service = new ReservaService();

      await expect(service.confirmarPago(99)).rejects.toThrow("Reserva no encontrada");
      expect(RepoMock.prototype.actualizarEstado).not.toHaveBeenCalled();
    });

    it("actualiza el estado a 'pagada' cuando la reserva existe", async () => {
      RepoMock.prototype.buscarPorId.mockResolvedValueOnce({
        id: 7,
        usuario_id: 1,
        funcion_id: 10,
        asientos: 2,
        estado: "pendiente",
      });

      const service = new ReservaService();
      await service.confirmarPago(7);

      expect(RepoMock.prototype.actualizarEstado).toHaveBeenCalledWith(7, "pagada");
    });
  });
});
