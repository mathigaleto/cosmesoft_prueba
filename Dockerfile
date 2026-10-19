FROM nginx:alpine-slim
COPY index.html admin.html site-content.js /usr/share/nginx/html/
EXPOSE 8080

