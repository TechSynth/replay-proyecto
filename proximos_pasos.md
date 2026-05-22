# próximos pasos del proyecto - tfg

este documento detalla las tareas pendientes para llevar el proyecto al nivel de excelencia para la entrega final del tfg.

## 1. sistema de gestión de contenidos (panel admin)
- crear un formulario de subida de canciones que permita:
  - seleccionar archivos .mp3 y enviarlos automáticamente a amazon s3.
  - registrar el título, artista y género en la base de datos rds.
  - subir imágenes de portada asociadas a cada canción.

## 2. interfaz de biblioteca y personalización
- desarrollar la vista de "mi biblioteca" para que el usuario pueda ver sus canciones favoritas.
- implementar la interfaz visual para crear y editar playlists directamente desde el navegador.
- añadir una sección de "reproducidos recientemente" usando la tabla de historial.

## 3. seguridad y optimización
- implementar certificados ssl (https) usando certbot y let's encrypt para asegurar la comunicación.
- optimizar el tiempo de carga del reproductor mediante el uso de caché en el navegador.
- añadir validaciones de seguridad adicionales en los formularios de subida de archivos.

## 4. finalización de la memoria técnica
- redactar el capítulo de arquitectura detallando el uso de servicios cloud (ec2, rds, s3).
- realizar pruebas de carga básicas para comprobar la respuesta del servidor con múltiples usuarios.
- preparar el manual de instalación y despliegue para los evaluadores del tfg.
