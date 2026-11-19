"""API de usuarios - DiploDevOps (versión 1: sin base de datos).

Los datos viven en memoria y se pierden al reiniciar el proceso.
La clase UsuariosEnMemoria concentra todo el acceso a datos: cuando llegue
PostgreSQL con docker-compose solo hay que reemplazarla por una versión que
hable con la base, sin tocar las rutas.
"""
import os
from threading import Lock

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGINS", "*").split(","))


class EmailDuplicado(Exception):
    pass


class UsuariosEnMemoria:
    def __init__(self):
        self._datos = {}
        self._siguiente_id = 1
        self._lock = Lock()

    def listar(self, nombre=None):
        with self._lock:
            usuarios = [dict(u) for u in self._datos.values()]
        if nombre:
            termino = nombre.lower()
            usuarios = [u for u in usuarios if termino in u["nombre"].lower()]
        return sorted(usuarios, key=lambda u: u["nombre"].lower())

    def obtener(self, usuario_id):
        with self._lock:
            usuario = self._datos.get(usuario_id)
            return dict(usuario) if usuario else None

    def crear(self, datos):
        with self._lock:
            self._validar_email_unico(datos["email"])
            usuario = {"id": self._siguiente_id, **datos}
            self._datos[usuario["id"]] = usuario
            self._siguiente_id += 1
            return dict(usuario)

    def actualizar(self, usuario_id, datos):
        with self._lock:
            if usuario_id not in self._datos:
                return None
            self._validar_email_unico(datos["email"], excepto_id=usuario_id)
            self._datos[usuario_id] = {"id": usuario_id, **datos}
            return dict(self._datos[usuario_id])

    def eliminar(self, usuario_id):
        with self._lock:
            return self._datos.pop(usuario_id, None) is not None

    def _validar_email_unico(self, email, excepto_id=None):
        for u in self._datos.values():
            if u["email"] == email and u["id"] != excepto_id:
                raise EmailDuplicado()


store = UsuariosEnMemoria()

# Datos de ejemplo para ver la página con contenido desde el primer arranque.
for _u in [
    {"nombre": "Ana Beltrán", "email": "ana.beltran@ejemplo.com", "rol": "Administrador"},
    {"nombre": "Martín Quiroga", "email": "martin.quiroga@ejemplo.com", "rol": "Editor"},
    {"nombre": "Lucía Ferreyra", "email": "lucia.ferreyra@ejemplo.com", "rol": "Lector"},
]:
    store.crear(_u)


def validar(datos):
    """Devuelve (datos_limpios, errores_por_campo)."""
    if not isinstance(datos, dict):
        datos = {}
    nombre = str(datos.get("nombre") or "").strip()
    email = str(datos.get("email") or "").strip().lower()
    rol = str(datos.get("rol") or "").strip() or "Lector"

    errores = {}
    if not nombre:
        errores["nombre"] = "Ingresá un nombre."
    elif len(nombre) > 100:
        errores["nombre"] = "El nombre no puede superar los 100 caracteres."
    if not email or "@" not in email or len(email) > 120:
        errores["email"] = "Ingresá un email válido."
    if len(rol) > 50:
        errores["rol"] = "El rol no puede superar los 50 caracteres."

    return {"nombre": nombre, "email": email, "rol": rol}, errores


def error_validacion(errores):
    return jsonify({"error": "Revisá los datos ingresados.", "campos": errores}), 400


def error_email():
    return jsonify({
        "error": "Ya existe un usuario con ese email.",
        "campos": {"email": "Ya existe un usuario con ese email."},
    }), 409


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/usuarios")
def listar_usuarios():
    nombre = request.args.get("nombre", "").strip()
    return jsonify(store.listar(nombre or None))


@app.get("/api/usuarios/<int:usuario_id>")
def obtener_usuario(usuario_id):
    usuario = store.obtener(usuario_id)
    if usuario is None:
        return jsonify({"error": "Usuario no encontrado."}), 404
    return jsonify(usuario)


@app.post("/api/usuarios")
def crear_usuario():
    datos, errores = validar(request.get_json(silent=True))
    if errores:
        return error_validacion(errores)
    try:
        usuario = store.crear(datos)
    except EmailDuplicado:
        return error_email()
    return jsonify(usuario), 201


@app.put("/api/usuarios/<int:usuario_id>")
def actualizar_usuario(usuario_id):
    datos, errores = validar(request.get_json(silent=True))
    if errores:
        return error_validacion(errores)
    try:
        usuario = store.actualizar(usuario_id, datos)
    except EmailDuplicado:
        return error_email()
    if usuario is None:
        return jsonify({"error": "Usuario no encontrado."}), 404
    return jsonify(usuario)


@app.delete("/api/usuarios/<int:usuario_id>")
def eliminar_usuario(usuario_id):
    if not store.eliminar(usuario_id):
        return jsonify({"error": "Usuario no encontrado."}), 404
    return "", 204


@app.errorhandler(404)
def no_encontrado(_):
    return jsonify({"error": "Ruta no encontrada."}), 404


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
