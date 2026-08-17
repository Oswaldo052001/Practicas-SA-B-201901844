import { reservaService } from "../routes/reservaRoutes";

export const resolvers = {
  Query: {
    reserva: async (_: unknown, args: { id: number }) => {
      return reservaService.obtenerReserva(args.id);
    },
    reservasPorUsuario: async (_: unknown, args: { usuario_id: number }) => {
      return reservaService.listarReservasDeUsuario(args.usuario_id);
    }
  },
  Mutation: {
    crearReserva: async (_: unknown, args: { datos: any }) => {
      return reservaService.crearReserva(args.datos);
    },
    confirmarReserva: async (_: unknown, args: { id: number }) => {
      return reservaService.confirmarReserva(args.id);
    },
    cancelarReserva: async (_: unknown, args: { id: number }) => {
      return reservaService.cancelarReserva(args.id);
    }
  }
};
