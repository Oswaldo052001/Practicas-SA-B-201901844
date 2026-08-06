const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");

nombreUsuario.textContent = sessionStorage.getItem("nombreUsuario") || "Desconocido";
rolUsuario.textContent = sessionStorage.getItem("rolUsuario") || "Desconocido";

async function probarRuta(url, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.style.display = "block";
  contenedor.textContent = "Consultando...";

  try {
    const respuesta = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    const datos = await respuesta.json();
    contenedor.textContent = `Estado ${respuesta.status}: ${JSON.stringify(datos, null, 2)}`;
  } catch (error) {
    contenedor.textContent = "No se pudo conectar con el servidor";
  }
}

document.getElementById("btnProbarAdmin").addEventListener("click", () => {
  probarRuta("/api/admin/reporte", "resultadoAdmin");
});

document.getElementById("btnProbarGeneral").addEventListener("click", () => {
  probarRuta("/api/general/perfil", "resultadoGeneral");
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  sessionStorage.removeItem("nombreUsuario");
  sessionStorage.removeItem("rolUsuario");

  window.location.href = "login.html";
});