export const typeDefs = `#graphql
  type DetalleReserva {
    id: Int!
    asiento_funcion_id: Int!
    precio_unitario: Float!
  }

  type Reserva {
    id: Int!
    usuario_id: Int!
    funcion_id: Int!
    estado: String!
    creado_en: String!
    detalles: [DetalleReserva!]!
  }

  input AsientoInput {
    asiento_funcion_id: Int!
    precio_unitario: Float!
  }

  input CrearReservaInput {
    usuario_id: Int!
    funcion_id: Int!
    asientos: [AsientoInput!]!
  }

  type Query {
    reserva(id: Int!): Reserva
    reservasPorUsuario(usuario_id: Int!): [Reserva!]!
  }

  type Mutation {
    crearReserva(datos: CrearReservaInput!): Reserva!
    confirmarReserva(id: Int!): Reserva!
    cancelarReserva(id: Int!): Reserva!
  }
`;
