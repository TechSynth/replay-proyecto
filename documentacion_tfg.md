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

## día 28 de mayo
- rediseño y pulido completo de la interfaz de usuario, garantizando formato "tipo oración" (sentence case) en todos los textos visibles.
- implementación del sistema de creación de playlists con contador persistente en la base de datos aws rds.
- desarrollo de rutas y controladores para gestionar playlists completas (crear, obtener, actualizar título e imagen, borrar).
- integración interactiva de cambio de portada en playlists, subiendo las nuevas imágenes directamente a aws s3.
- desarrollo de interacciones avanzadas de usuario para las canciones: clic izquierdo para reproducir instantáneamente, clic derecho para desplegar el menú contextual.
- implementación de funcionalidad de arrastrar y soltar (drag and drop) para organizar canciones fácilmente hacia las playlists en la barra lateral.
- programación del reproductor musical para soportar salto de tiempo (seeking) interactuando directamente con la barra de progreso.
- creación de un sistema de "canciones recientes" persistente en el navegador mediante localstorage, mostrando siempre el historial de las últimas 10 reproducciones en la página principal.
- limpieza extensiva de código: estandarización de comentarios, eliminación de funciones no utilizadas, simplificación de mensajes y eliminación de lógicas redundantes para mejorar la mantenibilidad y humanidad del código.

## día 29 de mayo
- modernización estética completa del reproductor de música: transformación a un formato de "isla flotante" centrada con bordes redondeados y estilo neumorfista oscuro.
- rediseño del modo expandido (slide-up) para operar a pantalla completa, optimizando el espacio mediante una distribución en dos columnas: cola de reproducción a la izquierda e información de pista a la derecha.
- implementación de la animación "hero" (shared element transition) para el artwork, permitiendo que la carátula pequeña "vuele" y se expanda fluidamente hasta su posición gigante al abrir el reproductor, y regrese de forma simétrica al cerrarlo.
- sincronización milimétrica de las transiciones visuales (300ms) para garantizar una experiencia de usuario rápida, reactiva y sin retardos (lag).
- desarrollo de una lógica de transición lateral para el cambio de canciones en modo expandido, utilizando la técnica de clonación de nodos para evitar huecos vacíos o bloques grises entre carátulas.
- creación de un sistema integral de gestión de perfil de usuario mediante un menú desplegable en la barra superior.
- implementación de la funcionalidad de actualización de nombre de usuario con persistencia en rds y sincronización instantánea de la interfaz.
- desarrollo de un flujo de seguridad multi-paso para la eliminación de cuenta, requiriendo confirmación textual ("borrar") y ejecutando el borrado en cascada de datos y archivos en la nube.
- optimización de la coherencia visual: unificación del color verde corporativo (#1db954) en todos los controles interactivos y eliminación de iconos genéricos en favor de una imagen de fallback uniforme ("imagenplaylist.png").
- auditoría y limpieza profunda del código fuente: eliminación de variables de estado redundantes, rutas de api no utilizadas y comentarios auto-referenciales, mejorando la legibilidad y siguiendo el tono de "estudiante en aprendizaje" para el tfg.
- implementación de diseño responsivo completo: transformación del menú lateral en una barra de navegación inferior para dispositivos móviles, optimizando el espacio mediante el uso exclusivo de iconos.
- creación de un sistema de acceso rápido a playlists en móvil mediante un overlay interactivo, permitiendo gestionar y crear listas sin perder de vista el reproductor.
- optimización del reproductor expandido para pantallas pequeñas: simplificación de la interfaz ocultando la cola de reproducción para priorizar el arte y la información de la pista actual.
- ajuste dinámico del layout móvil: reposicionamiento del reproductor flotante por encima de la barra de navegación y ocultación de elementos secundarios en la barra superior para mejorar la usabilidad táctil.
- refinamiento extremo de la interfaz móvil: simplificación del reproductor eliminando botones de navegación secundaria y timestamps para priorizar una barra de progreso centrada al 60%.
- evolución del menú lateral a una barra inferior con diseño neumórfico avanzado (gradientes e iluminación interna) para una experiencia táctil premium.
- transformación del sistema de playlists en móvil: sustitución del overlay de pantalla completa por un menú de tipo "bottom sheet" más ágil, integrando un botón de creación (+) estilizado en verde.
- limpieza de la interfaz de escritorio: eliminación de botones de gestión redundantes en la barra lateral para mantener un diseño más minimalista y enfocado al contenido.
- rediseño integral de la interfaz móvil con enfoque en minimalismo y usabilidad táctil: implementación de una barra de navegación inferior neumórfica (solo iconos) para una navegación más intuitiva.
- evolución del reproductor musical a un formato centralizado y protagonista, tanto en escritorio como en móvil, optimizando el uso del ancho de pantalla (hasta el 95%) para los controles principales.
- simplificación estratégica del reproductor móvil: eliminación de controles secundarios y marcas de tiempo para priorizar una barra de progreso limpia y centrada al 60%.
- creación de un sistema de gestión de playlists para móvil mediante un menú de tipo "bottom sheet" (panel emergente inferior) que incluye un botón de creación (+) estilizado en verde corporativo.
- limpieza de la barra lateral en la versión de escritorio, eliminando botones de gestión redundantes para mantener una estética profesional y despejada acorde a los estándares del tfg.
- mejora del reproductor móvil: integración del arte de la canción (artwork) en el reproductor mini, habilitando la expansión mediante gesto de clic directo sobre la imagen.
- refinamiento del menú de playlists en móvil: adición de un botón de cierre (X) en la cabecera del panel para mejorar la navegación y coherencia visual con el resto de la aplicación.
- corrección de interactividad en móvil: reforzamiento de los controladores de eventos para los botones de creación y cierre de playlists, garantizando su funcionamiento en navegadores táctiles.
- ajustes de ergonomía visual: elevación de la posición del reproductor móvil y descenso equilibrado del arte de la canción para una mejor distribución del espacio en pantalla.
- restauración y elevación de la interfaz móvil: reposicionamiento del reproductor a una altura de 150px (bottom) para optimizar el flujo visual con la barra inferior y ajuste del artwork para un centrado perfecto.
- recuperación del botón de gestión de playlists en la versión web de escritorio, garantizando que la funcionalidad de creación sea accesible en todas las plataformas.
- corrección de interactividad táctil: depuración de los manejadores onclick para el cierre y creación de playlists en dispositivos móviles, eliminando conflictos de propagación de eventos.
- corrección crítica: restauración de la estructura html del menú de playlists en móvil (bottom sheet), asegurando que los identificadores de los botones coincidan con los manejadores de eventos en javascript para restablecer su funcionalidad.
