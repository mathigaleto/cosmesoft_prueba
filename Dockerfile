FROM nginx:alpine-slim
COPY index.html admin.html site-content.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 8080

