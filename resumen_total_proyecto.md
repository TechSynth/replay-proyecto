# resumen total del proyecto replay

este documento resume el estado actual y el trabajo realizado de forma integral en el proyecto "replay", enfocado como un tfg de desarrollo de aplicaciones web.

## arquitectura del sistema
la aplicación ha evolucionado de un entorno local a una infraestructura profesional en la nube (cloud computing) utilizando amazon web services (aws):
- **backend:** servidor node.js con express desplegado en una instancia amazon ec2 (ubuntu 24.04).
- **base de datos:** motor mysql gestionado a través de amazon rds, garantizando persistencia y escalabilidad.
- **almacenamiento:** uso de amazon s3 para servir los archivos de audio (.mp3) de forma eficiente.
- **frontend:** interfaz moderna (html/css/js) que consume la api rest del backend.

## funcionalidades implementadas
1. **gestión de usuarios:**
   - sistema de registro y login local con contraseñas cifradas (bcrypt).
   - integración de autenticación social con google (oauth 2.0).
   - gestión de sesiones segura mediante json web tokens (jwt).
2. **reproductor de música:**
   - reproducción fluida mediante streaming (headers range y audio api).
   - buscador de canciones y artistas en tiempo real.
   - control de volumen, progreso y navegación entre pistas.
3. **lógica de negocio:**
   - sistema de favoritos y creación de listas de reproducción (playlists).
   - base de datos relacional normalizada para gestionar canciones, artistas y álbumes.

## logros técnicos destacados
- despliegue completo en la nube con configuración de grupos de seguridad y dns públicos.
- integración de múltiples servicios cloud para separar la lógica, los datos y el almacenamiento.
- optimización de la entrega de contenido multimedia mediante redirección directa a s3.
- código limpio, modular y documentado siguiendo estándares académicos para un tfg.
