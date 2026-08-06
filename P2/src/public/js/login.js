const formLogin = document.getElementById("formLogin");
const mensaje = document.getElementById("mensaje");

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.textContent = "";
  mensaje.className = "";

  const correo = document.getElementById("correo").value;
  const password = document.getElementById("password").value;

  try {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ correo, password }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mensaje.textContent = datos.error || "Error al iniciar sesion";
      mensaje.className = "mensaje-error";
      return;
    }

    sessionStorage.setItem("nombreUsuario", datos.nombre);
    sessionStorage.setItem("rolUsuario", datos.rol);

    window.location.href = "confirmacion.html";
  } catch (error) {
    mensaje.textContent = "No se pudo conectar con el servidor";
    mensaje.className = "mensaje-error";
  }
});