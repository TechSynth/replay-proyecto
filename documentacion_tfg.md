# documentación del proyecto replay - tfg

## día 21 de mayo
- desarrollo del reproductor de música interactivo con controles de tiempo y volumen.
- implementación de la búsqueda de canciones en tiempo real conectada al backend.
- creación de la lógica para listar canciones, artistas y álbumes desde la base de datos.
- ajustes en el diseño frontend para asegurar que sea responsive y moderno.
- implementación del sistema de autenticación local con registro, login y protección de rutas.

## día 22 de mayo
- integración de autenticación social con google usando google identity services.
- actualización de la base de datos mysql para permitir usuarios sociales (auth_provider y provider_id).
- desarrollo del sistema de streaming de audio mediante node.js usando streams y headers range.
- creación de un bucket en amazon s3 para el almacenamiento de archivos de música en la nube.
- configuración de políticas de acceso público y listas de control de acceso (acl) en s3.
- migración de la base de datos local a amazon rds (mysql) para despliegue profesional.
- actualización de la lógica del backend para permitir la reproducción de música desde urls externas (s3).
- configuración de seguridad en aws mediante security groups para el acceso a la base de datos (puerto 3306).
- despliegue completo del backend en una instancia aws ec2 con ubuntu 24.04 lts.
- configuración de reglas de entrada en ec2 para permitir tráfico ssh (22), http (80) y el puerto de la app (3000).
- configuración de un dns público de amazon para validar el origen en la consola de google cloud.
- gestión de variables de entorno (.env) para conectar el servidor de producción con rds y s3.
- limpieza final del código: eliminación de la lógica de apple para optimizar recursos y estandarización de comentarios en minúscula.

## día 23 de mayo
- reconfiguración del servidor para operar sobre el puerto estándar de internet (puerto 80) eliminando la necesidad de especificar puertos en la url.
- implementación de pm2 como gestor de procesos en producción para asegurar que el servicio de node.js se reinicie automáticamente ante fallos o reinicios de la máquina (startup configuration).
- desarrollo de un script de despliegue continuo (bash) para la automatización de la integración de código desde github.
- configuración de un cron job (crontab) en linux para ejecutar la sincronización automática de código cada 5 minutos, garantizando actualizaciones en vivo sin intervención manual.
- implementación de un sistema de subida de archivos (multer) para permitir a los usuarios cargar su propia música directamente desde la web.
- integración del sdk v3 de amazon s3 para el almacenamiento automatizado de archivos multimedia y carátulas personalizadas.
- desarrollo de una lógica de cuotas por usuario, limitando la subida a un máximo de 3 canciones y 10mb por archivo para optimizar recursos.
- creación de un sistema de renombrado inteligente (slugify) para asegurar nombres de archivos limpios y profesionales en la nube.
- actualización de la interfaz de usuario con un formulario de subida dinámico y renderizado condicional de carátulas (soporte para carátula propia o fondo negro por defecto).
