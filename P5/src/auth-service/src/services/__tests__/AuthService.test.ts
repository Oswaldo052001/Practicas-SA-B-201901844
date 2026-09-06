import bcrypt from "bcrypt";
import { AuthService } from "../AuthService";
import { UsuarioRepository } from "../../repositories/UsuarioRepository";

// Practica 7: pruebas unitarias del auth-service. Se mockea el repositorio
// (capa de acceso a datos) para probar solo la logica de negocio de
// AuthService de forma aislada, rapida y sin depender de Postgres real,
// siguiendo la base de la piramide de pruebas (unitarias, aisladas, rapidas).
jest.mock("../../repositories/UsuarioRepository");

const RepoMock = UsuarioRepository as jest.MockedClass<typeof UsuarioRepository>;

describe("AuthService", () => {
  beforeEach(() => {
    RepoMock.mockClear();
    RepoMock.prototype.buscarPorCorreo.mockReset();
    RepoMock.prototype.crear.mockReset();
  });

  describe("registrar", () => {
    it("lanza error si el correo ya esta registrado", async () => {
      RepoMock.prototype.buscarPorCorreo.mockResolvedValueOnce({
        id: 1,
        correo: "ana@cinetix.com",
        password_hash: "hash-existente",
        rol: "cliente",
      });

      const service = new AuthService();

      await expect(service.registrar("ana@cinetix.com", "clave123")).rejects.toThrow(
        "El correo ya esta registrado"
      );
      expect(RepoMock.prototype.crear).not.toHaveBeenCalled();
    });

    it("crea el usuario con la contrasena encriptada cuando el correo es nuevo", async () => {
      RepoMock.prototype.buscarPorCorreo.mockResolvedValueOnce(null);
      RepoMock.prototype.crear.mockImplementationOnce(async (correo, passwordHash, rol) => ({
        id: 5,
        correo,
        password_hash: passwordHash,
        rol,
      }));

      const service = new AuthService();
      const usuario = await service.registrar("nuevo@cinetix.com", "clave123", "cajero");

      expect(usuario).toEqual({ id: 5, correo: "nuevo@cinetix.com", rol: "cajero" });
      const [, passwordHashGuardado] = RepoMock.prototype.crear.mock.calls[0];
      // Nunca se debe guardar la contrasena en texto plano.
      expect(passwordHashGuardado).not.toBe("clave123");
      expect(await bcrypt.compare("clave123", passwordHashGuardado)).toBe(true);
    });
  });

  describe("login", () => {
    it("lanza 'Credenciales invalidas' si el correo no existe", async () => {
      RepoMock.prototype.buscarPorCorreo.mockResolvedValueOnce(null);
      const service = new AuthService();

      await expect(service.login("nadie@cinetix.com", "clave123")).rejects.toThrow(
        "Credenciales invalidas"
      );
    });

    it("lanza 'Credenciales invalidas' si la contrasena no coincide", async () => {
      RepoMock.prototype.buscarPorCorreo.mockResolvedValueOnce({
        id: 2,
        correo: "ana@cinetix.com",
        password_hash: await bcrypt.hash("otraClave", 4),
        rol: "cliente",
      });
      const service = new AuthService();

      await expect(service.login("ana@cinetix.com", "clave123")).rejects.toThrow(
        "Credenciales invalidas"
      );
    });

    it("retorna un JWT valido cuando las credenciales son correctas", async () => {
      RepoMock.prototype.buscarPorCorreo.mockResolvedValueOnce({
        id: 3,
        correo: "ana@cinetix.com",
        password_hash: await bcrypt.hash("clave123", 4),
        rol: "cliente",
      });
      const service = new AuthService();

      const token = await service.login("ana@cinetix.com", "clave123");

      expect(typeof token).toBe("string");
      const payload = service.verificarToken(token) as { id: number; correo: string; rol: string };
      expect(payload.id).toBe(3);
      expect(payload.correo).toBe("ana@cinetix.com");
      expect(payload.rol).toBe("cliente");
    });
  });
});
