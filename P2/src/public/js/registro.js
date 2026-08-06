const formRegistro = document.getElementById("formRegistro");
const mensaje = document.getElementById("mensaje");

formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.textContent = "";
  mensaje.className = "";

  const nombre = document.getElementById("nombre").value;
  const correo = document.getElementById("correo").value;
  const password = document.getElementById("password").value;
  const rol = document.getElementById("rol").value;

  try {
    const respuesta = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, correo, password, rol }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mensaje.textContent = datos.error || "Error al registrar usuario";
      mensaje.className = "mensaje-error";
      return;
    }

    mensaje.textContent = "Cuenta creada correctamente. Redirigiendo al login...";
    mensaje.className = "mensaje-exito";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  } catch (error) {
    mensaje.textContent = "No se pudo conectar con el servidor";
    mensaje.className = "mensaje-error";
  }
});