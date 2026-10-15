import { ReservaService } from "../services/ReservaService";

const service = new ReservaService();

export const typeDefs = `#graphql
  type Reserva {
    id: ID!
    usuario_id: Int!
    funcion_id: Int!
    asientos: Int!
    estado: String!
  }

  type Query {
    reservasPorUsuario(usuarioId: Int!): [Reserva!]!
  }

  type Mutation {
    crearReserva(usuarioId: Int!, funcionId: Int!, asientos: Int!): Reserva!
  }
`;

export const resolvers = {
  Query: {
    reservasPorUsuario: (_: unknown, args: { usuarioId: number }) =>
      service.listarReservas(args.usuarioId),
  },
  Mutation: {
    crearReserva: (
      _: unknown,
      args: { usuarioId: number; funcionId: number; asientos: number }
    ) => service.crearReserva(args.usuarioId, args.funcionId, args.asientos),
  },
};
