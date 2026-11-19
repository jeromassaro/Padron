# Padrón

Aplicación de gestión de usuarios, simple a propósito. Es el proyecto con el que repaso lo aprendido en la DiploDevOps: Docker, Kubernetes, AWS, observabilidad, monitoreo e ingeniería de software. Primero se arma la app y después se construye la infraestructura alrededor, versión por versión.

**Versión actual: [`v0.1.0`](#v010--app-base-sin-base-de-datos)**

## Versiones

Cada versión corresponde a un tag de Git. Desplegá la que quieras para ver su descripción.

<details open>
<summary><strong>v0.1.0</strong> · App base sin base de datos · <em>actual</em></summary>

<br>

**Objetivo:** tener la aplicación funcionando de punta a punta, antes de tocar infraestructura.

**Incluye:**
- Backend en Flask con CRUD de usuarios.
- Frontend en HTML, CSS y JavaScript puro, con buscador por nombre.
- Datos en memoria, con tres usuarios de ejemplo al arrancar.
- Endpoint `/health`.

**No incluye:** base de datos, contenedores ni infraestructura.

**Cómo correrla:** ver [Cómo correrlo](#cómo-correrlo).

</details>

<details>
<summary><strong>v0.2.0</strong> · Contenedores con Docker · <em>planificada</em></summary>

<br>

**Objetivo:** empaquetar la aplicación en imágenes.

**Previsto:**
- Dockerfile del backend, con gunicorn en lugar del servidor de desarrollo.
- Dockerfile del frontend, con nginx.

</details>

<details>
<summary><strong>v0.3.0</strong> · Docker Compose y PostgreSQL · <em>planificada</em></summary>

<br>

**Objetivo:** sumar la base de datos real.

**Previsto:**
- `docker-compose.yml` con backend, frontend y PostgreSQL.
- Reemplazo de `UsuariosEnMemoria` por una implementación que use la base.

</details>

<details>
<summary><strong>v0.4.0</strong> · Kubernetes · <em>planificada</em></summary>

<br>

**Objetivo:** desplegar la aplicación en un clúster.

</details>

<details>
<summary><strong>v0.5.0</strong> · AWS · <em>planificada</em></summary>

<br>

**Objetivo:** llevar la aplicación a la nube.

</details>

<details>
<summary><strong>v0.6.0</strong> · Observabilidad y monitoreo · <em>planificada</em></summary>

<br>

**Objetivo:** poder ver cómo se comporta la aplicación en funcionamiento.

</details>

### Ver el código de una versión

Una vez que el repositorio esté en GitHub, el selector de ramas y tags (arriba a la izquierda) permite elegir un tag y ver el código y este mismo README tal como estaban en esa versión. Desde la terminal:

```bash
git checkout v0.1.0
```

## Estructura

```
padron/
├── backend/
│   ├── app.py              # API Flask
│   └── requirements.txt    # Dependencias de Python
└── frontend/
    ├── index.html          # Página y diálogos
    ├── styles.css          # Estilos
    └── app.js              # Lógica y llamadas a la API
```

## Cómo correrlo

Requisitos: Python 3.10 o superior.

**1. Backend** (puerto 5000)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**2. Frontend** (en otra terminal)

```bash
cd frontend
python -m http.server 8080
```

Abrir <http://localhost:8080> en el navegador.

## Funcionalidades del frontend

- Listado de usuarios con nombre, email y rol.
- Buscador por nombre, que consulta al backend mientras se escribe.
- Alta y edición de usuarios desde un diálogo con validación.
- Baja de usuarios con confirmación previa.
- Avisos de éxito, estado vacío y mensaje claro cuando el backend no responde.

## API

URL base: `http://localhost:5000`

| Método | Ruta                 | Descripción                                   |
|--------|----------------------|-----------------------------------------------|
| GET    | `/health`            | Estado del servicio                           |
| GET    | `/api/usuarios`      | Lista usuarios. Filtro opcional `?nombre=ana` |
| GET    | `/api/usuarios/<id>` | Obtiene un usuario                            |
| POST   | `/api/usuarios`      | Crea un usuario                               |
| PUT    | `/api/usuarios/<id>` | Reemplaza los datos de un usuario             |
| DELETE | `/api/usuarios/<id>` | Elimina un usuario                            |

### Modelo de usuario

```json
{
  "id": 1,
  "nombre": "Ana Beltrán",
  "email": "ana.beltran@ejemplo.com",
  "rol": "Administrador"
}
```

- `nombre`: obligatorio, hasta 100 caracteres.
- `email`: obligatorio, debe contener `@`, hasta 120 caracteres y único entre usuarios.
- `rol`: opcional (por defecto `Lector`), hasta 50 caracteres. El frontend ofrece Administrador, Editor y Lector.

### Respuestas de error

Los errores devuelven JSON con un mensaje y, cuando corresponde, el detalle por campo:

```json
{
  "error": "Revisá los datos ingresados.",
  "campos": { "nombre": "Ingresá un nombre." }
}
```

| Código | Cuándo ocurre                      |
|--------|------------------------------------|
| 400    | Datos inválidos                    |
| 404    | Usuario o ruta inexistente         |
| 409    | Ya existe un usuario con ese email |

### Ejemplos con curl

```bash
# Listar
curl http://localhost:5000/api/usuarios

# Buscar por nombre
curl "http://localhost:5000/api/usuarios?nombre=ana"

# Crear
curl -X POST http://localhost:5000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Sofía Paz", "email": "sofia.paz@ejemplo.com", "rol": "Editor"}'

# Editar
curl -X PUT http://localhost:5000/api/usuarios/4 \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Sofía Paz", "email": "sofia.paz@ejemplo.com", "rol": "Administrador"}'

# Eliminar
curl -X DELETE http://localhost:5000/api/usuarios/4
```

## Configuración

El backend lee estas variables de entorno, todas opcionales:

| Variable       | Por defecto | Descripción                             |
|----------------|-------------|-----------------------------------------|
| `PORT`         | `5000`      | Puerto en el que escucha el backend     |
| `FLASK_DEBUG`  | `0`         | Poner en `1` para activar el modo debug |
| `CORS_ORIGINS` | `*`         | Orígenes permitidos, separados por coma |

En el frontend, la URL del backend es la constante `API_URL` al inicio de `frontend/app.js`.

## Decisiones de diseño

- **Acceso a datos aislado.** Toda la lectura y escritura pasa por la clase `UsuariosEnMemoria`. Al incorporar PostgreSQL alcanza con reemplazarla por una implementación que use la base, sin cambiar las rutas.
- **Endpoint `/health`.** Pensado para los health checks de Docker y los probes de Kubernetes.
- **Configuración por variables de entorno.** Permite usar la misma imagen en distintos entornos.
- **Frontend sin dependencias.** Se sirve como archivos estáticos, lo que facilita ponerlo detrás de nginx más adelante.

## Cómo se versiona

Se usa [versionado semántico](https://semver.org/lang/es/) y cada etapa cierra con un tag anotado:

```bash
git tag -a v0.1.0 -m "App base sin base de datos"
git push origin v0.1.0
```

Al terminar una etapa: actualizar la sección **Versiones** de este README (marcar la nueva como actual) y crear el tag.
