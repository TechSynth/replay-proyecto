# Memoria Técnica: Proyecto rePLAY

**Ciclo:** C.F.G.S Desarrollo de Aplicaciones Web (DAW II)
**Fecha:** Mayo 2026

---

## 1. Explicación del proyecto

rePLAY es una plataforma de música en streaming. La idea era montar una aplicación tipo Single Page Application donde los usuarios pudieran escuchar música, subir sus propios archivos y organizarlos en listas de reproducción. 

Hay alternativas evidentes como Spotify o Apple Music, pero quería ver si era capaz de montar una infraestructura similar desde cero. La diferencia principal de mi enfoque es cómo manejo los archivos. No guardo los MP3 ni las imágenes en la base de datos local porque saturaría el servidor en seguida. En su lugar, uso un servidor de Node.js solo para la lógica y dejo que Amazon S3 se encargue del almacenamiento pesado de la música.

**Tecnologías y equipos**
Para hacer esto funcionar, he necesitado salir del entorno de desarrollo local y montar infraestructura real en la nube:
*   **Frontend:** HTML, CSS y JavaScript a pelo (Vanilla JS), sin frameworks pesados, para controlar exactamente cómo interactúa el reproductor con el DOM.
*   **Backend:** Node.js con Express para montar una API REST.
*   **Base de datos:** MySQL. Todo corre en una instancia de Amazon RDS.
*   **Almacenamiento:** Amazon S3 para los MP3 y carátulas.
*   **Servidor web:** Una máquina virtual EC2 con Ubuntu en AWS, usando Nginx como proxy inverso para que la aplicación responda por el puerto 80 y 443 con certificado SSL.

**Modelo de datos**
El esquema relacional gira en torno a los usuarios y sus canciones. Tengo una tabla principal de `usuarios` conectada a `canciones` (para saber quién subió qué). Las `playlists` pertenecen a un usuario, y la tabla `playlist_cancion` me sirve de puente para guardar el orden específico de las pistas dentro de cada lista. También hay tablas para artistas y álbumes preparadas para futuras ampliaciones de la biblioteca.

## 2. Usuarios

El sistema está pensado para un tipo de usuario estándar. Cuando te registras, puedes:
*   Subir canciones a la plataforma (le puse un límite temporal de 3 canciones por usuario para no saturar mi bucket de S3 durante las pruebas).
*   Crear listas de reproducción.
*   Añadir canciones a esas listas mediante un menú contextual o arrastrando y soltando en la interfaz de escritorio.
*   Modificar el nombre de perfil o eliminar la cuenta.

Si un usuario decide borrar su cuenta, el backend se encarga de borrar también sus registros de canciones en la base de datos para no dejar datos huérfanos.

## 3. Planificación de tareas

No incluyo el diagrama de Gantt visual aquí, pero el desarrollo lo dividí en cuatro bloques principales a lo largo de los últimos meses:
1.  **Diseño de datos y API:** Empecé definiendo qué datos iba a necesitar y montando los endpoints básicos en Express con datos de prueba estáticos.
2.  **Lógica del reproductor:** Me costó bastante sincronizar el objeto `Audio` de JavaScript con la barra de progreso visual de la interfaz. 
3.  **Integración Cloud:** Esta fue la fase de cambiar los archivos locales por el SDK de AWS para subir todo a S3 y conectar la base de datos a RDS.
4.  **Diseño responsivo:** Las últimas semanas las dediqué a ajustar CSS. Tuve que cambiar la forma en la que funcionaba el reproductor para que en el móvil no fuera un desastre, implementando una barra inferior específica y un menú desplegable para las playlists.

## 4. Explicación de cómo he realizado el proyecto

El proyecto funciona separando completamente la vista de los datos. El servidor de Node.js no escupe HTML; solo devuelve JSON. 

El frontend tiene un archivo `app.js` que hace peticiones `fetch` a la API. Cuando pido la lista de canciones, Node hace una query a MySQL (usando el paquete `mysql2/promise`), formatea los resultados y se los devuelve al cliente. Luego, JavaScript lee ese JSON y crea dinámicamente los elementos en el DOM con `document.createElement`.

**Conexión a la base de datos**
Uso un pool de conexiones para no abrir y cerrar la base de datos en cada petición. Las credenciales las tengo aisladas en un archivo `.env` para que no se suban a GitHub.

**Control de sesiones y seguridad**
No uso cookies de sesión tradicionales. Implementé JWT (JSON Web Tokens). Cuando haces login, Node comprueba la contraseña (encriptada con bcrypt) y te devuelve un token. El frontend guarda ese token en `localStorage` y lo adjunta en los headers de cada petición privada. 
Además, he configurado Nginx en el servidor de producción para forzar el uso de HTTPS, usando un certificado gratuito de Let's Encrypt.

## 5. Problemas encontrados y soluciones

El despliegue en AWS fue lo que más problemas me dio. 
Al principio, intenté arrancar la aplicación de Node directamente en el puerto 80 para no tener que escribir `:3000` en la URL. Esto me generó conflictos de permisos y bloqueaba Nginx cuando intentaba instalar el certificado SSL. 
Lo solucioné configurando Nginx como proxy inverso. Ahora Nginx escucha en el puerto 80/443, maneja los certificados y redirige el tráfico internamente al puerto 3000 donde corre Node a través de PM2.

Otro problema fue la interfaz en móviles. El diseño de escritorio usa una barra lateral izquierda que era inmanejable en pantallas pequeñas. La solución fue escribir media queries que ocultan esa barra y la transforman en un "bottom sheet" (un menú que sube desde abajo) exclusivamente para la versión móvil, simplificando los controles del reproductor a solo play/pausa para ahorrar espacio.

## 6. Mejoras futuras

El código está preparado para soportar más funciones. Lo primero que me gustaría añadir es un plan "Premium" real en la tabla de usuarios que levante las restricciones de subida. 
También dejé preparadas las tablas de artistas y álbumes, pero actualmente la interfaz de subida usa campos de texto simples. La idea es implementar un autocompletado que busque artistas existentes en la base de datos en lugar de crear registros nuevos cada vez.