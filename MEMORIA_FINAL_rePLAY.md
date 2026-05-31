# Memoria Técnica: Proyecto rePLAY

**Autor:** Ayman Lemrabet
**Ciclo:** C.F.G.S Desarrollo de Aplicaciones Web (DAW II)
**Institución:** I.E.S. Pío Baroja
**Fecha:** Mayo 2026

---

## 1. De qué va el proyecto

rePLAY es una plataforma para escuchar música en streaming por internet. Empezó como la típica idea de hacer un reproductor web, pero se me fue yendo de las manos hasta acabar montando algo mucho más parecido a Spotify, donde no solo escuchas, sino que tienes tu propia cuenta, tus listas, y tú mismo puedes subir los MP3.

Al principio pensé en meter las canciones en la carpeta del proyecto o en la base de datos directamente. Menos mal que no lo hice. A la que subí tres canciones de prueba, me di cuenta de que el servidor se iba a ahogar. Así que replanteé la arquitectura entera: Node.js solo se encargaría de la lógica (usuarios, contraseñas, URLs), y los archivos pesados vivirían en Amazon S3. 

Lo más importante para mí era la experiencia de uso. Me pone enfermo cuando cambias de página en una web y la música se corta. Para evitarlo, construí todo como una Single Page Application (SPA). Solo hay un archivo `index.html`. Cuando haces clic en algo, JavaScript esconde una capa y enseña otra, pidiendo los datos al servidor en segundo plano usando `fetch`.

## 2. Herramientas y tecnologías que he usado

No he querido usar frameworks como React. Siento que a veces esconden demasiado cómo funcionan las cosas por debajo, y para el TFG quería demostrar que me sé manejar con el DOM a pelo.

*   **Para el Backend:** Node.js con Express. 
*   **Para el Frontend:** JavaScript (Vanilla), HTML y mucho CSS. Todo el diseño neumorfista (el rollo este oscuro con sombras que parece que los botones sobresalen) lo he hecho a mano, peleándome bastante con las variables CSS.
*   **Base de Datos:** MySQL.
*   **Los servidores (AWS):** 
    *   Una máquina EC2 con Ubuntu para correr mi código.
    *   Una base de datos gestionada en Amazon RDS.
    *   Amazon S3 para guardar los audios y las carátulas.

Además, he usado cosillas como `music-metadata` en el backend para no tener que picar a mano los títulos de las canciones. Subes el archivo y la librería saca la info del propio MP3. Para las contraseñas uso `bcryptjs`, y para mantener la sesión abierta sin usar cookies anticuadas, utilizo `jsonwebtoken`.

### Cómo está organizado el código

Lo he separado en dos bloques lógicos:
*   La carpeta `public` es todo lo que el navegador se descarga. Ahí está mi HTML, mi archivo de estilos (`styles.css`, que acabó teniendo más de 1800 líneas) y el `app.js`, que es el que gestiona el reproductor de audio de HTML5 y los clics.
*   La carpeta `src` es mi backend privado. Ahí tengo los controladores (`musicController.js`, `authController.js`), que son los que deciden qué pasa cuando alguien pide hacer login o subir un archivo.

## 3. Navegación por la plataforma

Cuando entras, la aplicación te pide hacer login. Tienes la opción clásica de correo y contraseña, o el botón de Google (que me dio guerra hasta que descubrí que Google no te deja usarlo si no tienes un dominio seguro con HTTPS).

Una vez dentro, el menú cambia dependiendo de si estás en el móvil o en el ordenador:
*   **En ordenador:** Tienes una barra lateral a la izquierda con tus playlists y las opciones de navegar. El reproductor es una barra ancha abajo del todo.
*   **En móvil:** Esa barra lateral desaparece. En su lugar, monté un menú inferior solo con iconos, mucho más natural para el dedo. El reproductor pasa a ser una pastilla flotante. 

Al darle a una canción, el reproductor de abajo muestra la foto pequeña. Si tocas esa foto, se abre el "Slide-up". Es un panel gigante que ocupa toda la pantalla con la carátula en grande y controles para pasar de canción. En el ordenador aquí también metí el control de volumen, pero en móvil lo quité porque la gente ya usa los botones de su teléfono para eso.

## 4. Usuarios y Base de Datos

En la base de datos (que diseñé usando MySQL) decidí guardar las urls que me devuelve Amazon S3, no los archivos físicos. 

El modelo de datos junta la tabla de `usuarios` con la de `canciones` (sabiendo quién sube qué). Las playlists funcionan con una tabla intermedia llamada `playlist_cancion` porque una misma canción puede estar en muchas listas, y una lista tiene muchas canciones. Además, esa tabla guarda una columna `orden` para que las listas no se mezclen.

**El borrado de cuenta**
Me lo tomé bastante en serio. Si un usuario le da a borrar cuenta, le obligo a teclear la palabra "Borrar" en un campo de texto para que no haya accidentes. Si lo hace, el backend no solo borra su fila en MySQL, sino que lanza un borrado en cascada que elimina sus canciones y sus playlists de la base de datos.

## 5. El dolor de cabeza del despliegue

Hacer que esto funcionara en mi ordenador fue relativamente fácil. Subirlo a internet para que el tribunal lo viera fue otra historia.

Registré el dominio `replays.studio` con el pack de estudiantes de GitHub. Le asigné una IP fija a mi máquina de Amazon (Elastic IP) y asocié el dominio. El problema es que Node.js estaba funcionando en el puerto 3000, así que la URL quedaba feísima: `http://replays.studio:3000`. 

Para quitar eso, instalé Nginx en el servidor Ubuntu. Nginx hace de "portero": escucha las peticiones normales de internet (puerto 80) y se las pasa internamente a mi Node. 

Luego me di cuenta de que no podía subir canciones de más de 1 mega. Resulta que Nginx las bloqueaba por seguridad. Tuve que meterme en el archivo de configuración y añadir `client_max_body_size 20M` para arreglarlo.

El paso final fue poner el candado verde de seguridad. Usé Certbot, que modificó el archivo de Nginx para usar el puerto 443 (HTTPS). Sin esto, no hubiese podido hacer funcionar el login con Google.

## 6. Problemas encontrados y futuro

El mayor problema durante el desarrollo fue el CSS en móviles. Yo tenía todo centrado y perfecto en la pantalla de mi ordenador, pero al probarlo en el móvil los botones se montaban unos encima de otros. Tuve que rehacer el reproductor móvil usando `display: grid` para forzar a que la carátula, el texto y el botón de play estuvieran en su sitio sin importar el tamaño de la pantalla.

De cara al futuro, me gustaría intentar tres cosas:
1.  **Soporte real para géneros**: Ahora mismo las canciones tienen género, pero no se puede filtrar la biblioteca por ellos. 
2.  **Modo sin conexión**: He estado leyendo sobre Service Workers para cachear algunas canciones en el móvil, pero se me iba de tiempo para esta entrega.
3.  **Búsqueda compartida**: Que si busco a un artista, no solo salgan mis canciones, sino las que haya subido otra gente, creando una biblioteca colaborativa.
