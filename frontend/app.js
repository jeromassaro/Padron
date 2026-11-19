"use strict";

// URL del backend. Cuando la app corra detrás de un proxy (nginx, Ingress)
// se puede cambiar por una ruta relativa, por ejemplo "/api/usuarios".
const API_URL = "http://localhost:5000/api/usuarios";

const $ = (selector) => document.querySelector(selector);

const el = {
  lista: $("#lista"),
  mensaje: $("#mensaje"),
  conteo: $("#conteo"),
  buscador: $("#buscador"),
  btnNuevo: $("#btn-nuevo"),
  toast: $("#toast"),
  dlgForm: $("#dlg-form"),
  form: $("#form"),
  tituloForm: $("#titulo-form"),
  inNombre: $("#in-nombre"),
  inEmail: $("#in-email"),
  inRol: $("#in-rol"),
  btnGuardar: $("#btn-guardar"),
  errGeneral: $("#err-general"),
  dlgEliminar: $("#dlg-eliminar"),
  textoEliminar: $("#texto-eliminar"),
  errEliminar: $("#err-eliminar"),
  btnConfirmarEliminar: $("#btn-confirmar-eliminar"),
};

const estado = {
  usuarios: [],
  error: null,
  editandoId: null,
  eliminandoId: null,
};

let ultimaPeticion = 0;
let temporizadorBusqueda = null;
let temporizadorToast = null;

/* ---------- Comunicación con el backend ---------- */

async function pedir(url, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opciones,
    });
  } catch {
    const e = new Error("No se pudo conectar con el backend.");
    e.sinConexion = true;
    throw e;
  }

  if (respuesta.status === 204) return null;

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const e = new Error(datos.error || "Ocurrió un error inesperado.");
    e.campos = datos.campos || {};
    throw e;
  }
  return datos;
}

async function cargar() {
  const termino = el.buscador.value.trim();
  const url = termino ? `${API_URL}?nombre=${encodeURIComponent(termino)}` : API_URL;
  const numero = ++ultimaPeticion;

  try {
    const usuarios = await pedir(url);
    if (numero !== ultimaPeticion) return; // llegó una búsqueda más nueva
    estado.usuarios = usuarios;
    estado.error = null;
  } catch (e) {
    if (numero !== ultimaPeticion) return;
    estado.usuarios = [];
    estado.error = e;
  }
  render();
}

/* ---------- Render ---------- */

function iniciales(nombre) {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p.charAt(0).toUpperCase()).join("");
}

function crear(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function filaUsuario(usuario) {
  const fila = crear("li", "fila");

  fila.append(crear("div", `avatar av-${usuario.id % 5}`, iniciales(usuario.nombre)));

  const datos = crear("div", "datos");
  datos.append(crear("p", "nombre", usuario.nombre), crear("p", "email", usuario.email));
  fila.append(datos);

  fila.append(crear("span", "rol", usuario.rol));

  const acciones = crear("div", "acciones");

  const editar = crear("button", "btn btn-texto", "Editar");
  editar.type = "button";
  editar.setAttribute("aria-label", `Editar a ${usuario.nombre}`);
  editar.addEventListener("click", () => abrirFormulario(usuario));

  const borrar = crear("button", "btn btn-texto btn-borrar", "Eliminar");
  borrar.type = "button";
  borrar.setAttribute("aria-label", `Eliminar a ${usuario.nombre}`);
  borrar.addEventListener("click", () => abrirEliminar(usuario));

  acciones.append(editar, borrar);
  fila.append(acciones);

  return fila;
}

function mostrarMensaje(titulo, detalle, esError = false) {
  el.mensaje.replaceChildren();
  el.mensaje.className = esError ? "mensaje es-error" : "mensaje";
  el.mensaje.append(crear("strong", "", titulo));
  if (typeof detalle === "string") {
    el.mensaje.append(document.createTextNode(detalle));
  } else if (detalle) {
    el.mensaje.append(detalle);
  }
  el.mensaje.hidden = false;
}

function render() {
  const termino = el.buscador.value.trim();
  el.lista.replaceChildren();
  el.mensaje.hidden = true;

  if (estado.error) {
    el.conteo.textContent = "";
    if (estado.error.sinConexion) {
      const detalle = document.createElement("span");
      detalle.append("Verificá que esté corriendo en ");
      detalle.append(crear("code", "", API_URL));
      detalle.append(".");
      mostrarMensaje("No se pudo conectar con el backend", detalle, true);
    } else {
      mostrarMensaje("No se pudieron cargar los usuarios", estado.error.message, true);
    }
    return;
  }

  const total = estado.usuarios.length;

  if (termino) {
    el.conteo.textContent = `${total} ${total === 1 ? "resultado" : "resultados"} para “${termino}”`;
  } else {
    el.conteo.textContent = `${total} ${total === 1 ? "usuario registrado" : "usuarios registrados"}`;
  }

  if (total === 0) {
    if (termino) {
      mostrarMensaje("Sin resultados", `Ningún nombre coincide con “${termino}”.`);
    } else {
      mostrarMensaje("Todavía no hay usuarios", "Agregá el primero con el botón Nuevo usuario.");
    }
    return;
  }

  el.lista.append(...estado.usuarios.map(filaUsuario));
}

/* ---------- Aviso ---------- */

function avisar(texto) {
  el.toast.textContent = texto;
  el.toast.classList.add("visible");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => el.toast.classList.remove("visible"), 2800);
}

/* ---------- Alta y edición ---------- */

function limpiarErrores() {
  el.errGeneral.textContent = "";
  for (const campo of ["nombre", "email"]) {
    $(`#err-${campo}`).textContent = "";
    $(`#in-${campo}`).removeAttribute("aria-invalid");
  }
}

function abrirFormulario(usuario = null) {
  estado.editandoId = usuario ? usuario.id : null;
  el.tituloForm.textContent = usuario ? "Editar usuario" : "Nuevo usuario";
  el.inNombre.value = usuario ? usuario.nombre : "";
  el.inEmail.value = usuario ? usuario.email : "";
  el.inRol.value = usuario ? usuario.rol : "Lector";
  limpiarErrores();
  el.dlgForm.showModal();
  el.inNombre.focus();
}

async function guardar(evento) {
  evento.preventDefault();
  limpiarErrores();

  const cuerpo = {
    nombre: el.inNombre.value,
    email: el.inEmail.value,
    rol: el.inRol.value,
  };
  const editando = estado.editandoId !== null;

  el.btnGuardar.disabled = true;
  try {
    await pedir(editando ? `${API_URL}/${estado.editandoId}` : API_URL, {
      method: editando ? "PUT" : "POST",
      body: JSON.stringify(cuerpo),
    });
    el.dlgForm.close();
    avisar(editando ? "Usuario actualizado" : "Usuario creado");
    await cargar();
  } catch (e) {
    const campos = e.campos || {};
    for (const campo of ["nombre", "email"]) {
      if (campos[campo]) {
        $(`#err-${campo}`).textContent = campos[campo];
        $(`#in-${campo}`).setAttribute("aria-invalid", "true");
      }
    }
    if (!campos.nombre && !campos.email) {
      el.errGeneral.textContent = e.sinConexion
        ? "No se pudo conectar con el backend. Intentá de nuevo en unos segundos."
        : e.message;
    }
  } finally {
    el.btnGuardar.disabled = false;
  }
}

/* ---------- Baja ---------- */

function abrirEliminar(usuario) {
  estado.eliminandoId = usuario.id;
  el.textoEliminar.textContent = `Vas a eliminar a ${usuario.nombre}. Esta acción no se puede deshacer.`;
  el.errEliminar.textContent = "";
  el.dlgEliminar.showModal();
}

async function confirmarEliminar() {
  el.btnConfirmarEliminar.disabled = true;
  try {
    await pedir(`${API_URL}/${estado.eliminandoId}`, { method: "DELETE" });
    el.dlgEliminar.close();
    avisar("Usuario eliminado");
    await cargar();
  } catch (e) {
    el.errEliminar.textContent = e.sinConexion
      ? "No se pudo conectar con el backend. Intentá de nuevo en unos segundos."
      : e.message;
  } finally {
    el.btnConfirmarEliminar.disabled = false;
  }
}

/* ---------- Eventos ---------- */

el.btnNuevo.addEventListener("click", () => abrirFormulario());
el.form.addEventListener("submit", guardar);
el.btnConfirmarEliminar.addEventListener("click", confirmarEliminar);

el.buscador.addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(cargar, 250);
});

for (const dialogo of [el.dlgForm, el.dlgEliminar]) {
  dialogo.addEventListener("click", (e) => {
    if (e.target === dialogo) dialogo.close(); // clic fuera del contenido
  });
  dialogo.querySelectorAll("[data-cerrar]").forEach((boton) =>
    boton.addEventListener("click", () => dialogo.close())
  );
}

cargar();
