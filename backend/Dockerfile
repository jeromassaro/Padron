FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

WORKDIR /app

# Las dependencias se copian primero para aprovechar la caché de capas:
# solo se reinstalan cuando cambia requirements.txt.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# La app no necesita privilegios: corre con un usuario sin shell.
RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 5000

# Health check contra /health, usando la misma variable PORT que la app.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.getenv('PORT', '5000'), timeout=2)"

# gunicorn en lugar del servidor de desarrollo de Flask.
# WEB_CONCURRENCY permite ajustar la cantidad de workers sin reconstruir la imagen.
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers ${WEB_CONCURRENCY:-2} --access-logfile - app:app"]
