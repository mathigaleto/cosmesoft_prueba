FROM nginx:alpine-slim
COPY index.html admin.html site-content.js client-cv.js /usr/share/nginx/html/
COPY default.conf /etc/nginx/conf.d/default.conf
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 8080

