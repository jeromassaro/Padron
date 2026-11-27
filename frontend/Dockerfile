FROM nginx:1.27-alpine

# Se copian solo los archivos que forman parte del sitio.
COPY index.html styles.css app.js /usr/share/nginx/html/

EXPOSE 80

# La imagen de nginx ya trae wget (busybox) para el health check.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1/ || exit 1
