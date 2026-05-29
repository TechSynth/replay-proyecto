// guarda las cosas de la app mientras se usa
const appState = {
    currentSong: null,

    currentTime: 0,
    duration: 0,
    volume: 0.7,
    songs: [],
    librarySongs: [],
    playlists: [],
    user: null,
    viewMode: "grid" // grid o list
};

// manda el token en las peticiones
function getAuthHeaders() {
    const token = auth.getToken();
    const headers = {
        "Content-Type": "application/json"
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

// elementos de la página para manipular
const elements = {
    songsGrid: document.getElementById("songs-grid"),
    searchInput: document.getElementById("search-input"),
    searchBtn: document.getElementById("search-btn"),
    searchResults: document.getElementById("search-results"),
    playBtn: document.getElementById("play-btn"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),

    currentSongTitle: document.getElementById("current-song-title"),
    currentSongArtist: document.getElementById("current-song-artist"),
    currentTime: document.getElementById("current-time"),
    totalTime: document.getElementById("total-time"),
    progressFilled: document.getElementById("progress-filled"),
    volumeSlider: document.getElementById("volume-slider"),
    playlistList: document.getElementById("playlist-list"),
    homeView: document.getElementById("home-view"),
    searchView: document.getElementById("search-view"),
    libraryView: document.getElementById("library-view"),
    uploadView: document.getElementById("upload-view"),
    uploadForm: document.getElementById("upload-form"),
    uploadStatus: document.getElementById("upload-status"),
    libraryGrid: document.getElementById("library-grid"),
    libraryList: document.getElementById("library-list"),
    libraryListItems: document.getElementById("library-list-items"),
    gridViewBtn: document.getElementById("grid-view-btn"),
    listViewBtn: document.getElementById("list-view-btn"),
    playlistDetailView: document.getElementById("playlist-detail-view"),
    playlistSongsList: document.getElementById("playlist-songs-list"),
    playlistName: document.getElementById("playlist-name"),
    playlistCover: document.getElementById("playlist-cover"),
    progressContainer: document.getElementById("progress-container"),
    recentSongsGrid: document.getElementById("recent-songs-grid"),
    // cosas del reproductor cuando se hace grande
    mainPlayer: document.getElementById("main-player"),
    playerExpandedView: document.getElementById("player-expanded-view"),
    expandTrigger: document.getElementById("expand-player-trigger"),
    closeExpanded: document.getElementById("close-expanded-btn"),
    queueList: document.getElementById("queue-list"),
    expandedCoverImg: document.getElementById("expanded-cover-img"),
    expandedTitle: document.getElementById("expanded-title"),
    expandedArtist: document.getElementById("expanded-artist"),
    expandedCoverContainer: document.getElementById("expanded-cover-container")
};

// llamadas al servidor

async function analyzeFile(file) {
    const status = elements.uploadStatus;
    const metadataFields = document.getElementById("metadata-fields");
    const suggestion = document.getElementById("metadata-suggestion");

    status.textContent = "analizando metadatos del archivo...";
    status.className = "upload-status loading";
    status.style.display = "block";
    metadataFields.style.display = "none";

    const formData = new FormData();
    formData.append("audio", file);

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${auth.getToken()}`
            },
            body: formData
        });

        // maneja errores para evitar fallos 404/500 antes de intentar parsear json
        if (!response.ok) {
            const errorText = await response.text();
            console.error("error del servidor:", errorText);
            throw new Error(`error ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            status.style.display = "none";
            metadataFields.style.display = "block";

            document.getElementById("upload-title").value = data.data.titulo || "";
            document.getElementById("upload-artist").value = data.data.artista || "";
            document.getElementById("upload-album").value = data.data.album || "";

            if (data.data.genero) {
                const genreSelect = document.getElementById("upload-genre");
                const genreLower = data.data.genero.toLowerCase();
                for (let option of genreSelect.options) {
                    if (genreLower.includes(option.value) && option.value !== "") {
                        genreSelect.value = option.value;
                        break;
                    }
                }
            }

            const imageHint = document.getElementById("image-hint");
            if (data.data.has_picture) {
                imageHint.innerHTML = `<i class="fas fa-check"></i> el archivo ya incluye carátula, se usará automáticamente.`;
                imageHint.style.color = "#1DB954";
            } else {
                imageHint.innerHTML = `<i class="fas fa-info-circle"></i> el archivo no tiene carátula, puedes subir una manualmente.`;
                imageHint.style.color = "#b3b3b3";
            }

            suggestion.innerHTML = `<p><i class="fas fa-magic"></i> ¡archivo analizado! revisa los datos y completa el género.</p>`;
            suggestion.className = "upload-status success";

        } else {
            status.textContent = `error al analizar: ${data.error}`;
            status.className = "upload-status error";
        }
    } catch (error) {
        console.error("error en análisis:", error);
        status.textContent = "error al conectar con el analizador (404/500)";
        status.className = "upload-status error";
    }
}

async function uploadSong(formData) {
    const status = elements.uploadStatus;
    const submitBtn = document.getElementById("upload-submit-btn");

    status.textContent = "subiendo canción...";
    status.className = "upload-status loading";
    status.style.display = "block";
    submitBtn.disabled = true;

    try {
        const response = await fetch("/api/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${auth.getToken()}`
            },
            body: formData
        });

        if (!response.ok) throw new Error(`error ${response.status}`);

        const data = await response.json();

        if (data.success) {
            status.textContent = `¡canción subida con éxito!`;
            status.className = "upload-status success";
            setTimeout(() => {
                elements.uploadForm.reset();
                document.getElementById("metadata-fields").style.display = "none";
                status.style.display = "none";
            }, 3000);

            await fetchSongs();
            if (elements.libraryView.style.display !== "none") await fetchLibrary();
        } else {
            status.textContent = `error: ${data.error}`;
            status.className = "upload-status error";
        }
    } catch (error) {
        console.error("error en subida:", error);
        status.textContent = "error de red al subir";
        status.className = "upload-status error";
    } finally {
        submitBtn.disabled = false;
    }
}

async function fetchSongs() {
    try {
        const response = await fetch("/api/canciones", {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(`${response.status}`);
        const data = await response.json();

        if (data.success) {
            appState.songs = data.data;
            renderSongs(data.data);
        }
    } catch (error) {
        console.error("error cargando canciones:", error);
    }
}

async function fetchLibrary() {
    try {
        console.log("cargando biblioteca...");
        const response = await fetch("/api/library", {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.error("error en fetch library:", response.status);
            return;
        }

        const data = await response.json();

        if (data.success) {
            appState.librarySongs = data.data;
            renderLibrary(data.data);
        }
    } catch (error) {
        console.error("error cargando biblioteca:", error);
    }
}

async function searchSongs(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                renderSearchResults(data.data);
            }
        }
    } catch (error) {
        console.error("error en búsqueda:", error);
    }
}

// dibuja las canciones en la cuadrícula

function renderSongs(songs) {
    elements.songsGrid.innerHTML = ``;
    if (songs.length === 0) {
        elements.songsGrid.innerHTML = `<p>no hay canciones disponibles</p>`;
        return;
    }
    songs.forEach(song => {
        elements.songsGrid.appendChild(createSongCard(song));
    });
}

function renderLibrary(songs) {
    elements.libraryGrid.innerHTML = ``;
    elements.libraryListItems.innerHTML = ``;

    if (songs.length === 0) {
        const msg = `<p style="padding: 20px; color: #b3b3b3;">no has subido ninguna canción todavía.</p>`;
        elements.libraryGrid.innerHTML = msg;
        elements.libraryListItems.innerHTML = msg;
        return;
    }

    songs.forEach((song, index) => {
        elements.libraryGrid.appendChild(createSongCard(song));
        elements.libraryListItems.appendChild(createListItem(song, index + 1));
    });
}

function createSongCard(song) {
    const card = document.createElement("div");
    card.className = "song-card";
    card.draggable = true;
    card.onclick = () => playSong(song);
    card.oncontextmenu = (e) => {
        e.preventDefault();
        showContextMenu(e, song.id, song);
    };
    card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("songId", song.id);
        e.dataTransfer.effectAllowed = "copy";
    });

    const imageUrl = song.imagen_url || "img/imagenPlaylist.png";

    card.innerHTML = `<div class="song-card-image">
        <img src="${imageUrl}" alt="${song.titulo}">
        </div>
        <div class="song-card-title">${song.titulo}</div>
        <div class="song-card-artist">${song.artista_nombre || "artista desconocido"}</div>`;

    return card;
}

function createListItem(song, index, showDate = true) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.draggable = true;
    item.onclick = () => playSong(song);
    item.oncontextmenu = (e) => { e.preventDefault(); showContextMenu(e, song.id, song); };

    // detecta cuando el usuario arrastra la canción
    item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("songId", song.id);
        e.dataTransfer.effectAllowed = "copy";
    });

    const date = new Date(song.fecha_subida).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    const imageUrl = song.imagen_url || "img/imagenPlaylist.png";
    const dateHtml = showDate ? `<div class="col-date">${date}</div>` : "";
    
    item.innerHTML = `<div class="col-cover"><div class="item-cover"><img src="${imageUrl}" alt="${song.titulo}"></div></div><div class="item-info"><span class="item-title">${song.titulo}</span><span class="item-artist">${song.artista_nombre || "artista desconocido"}</span></div><div class="item-album">${song.album_nombre || "sin álbum"}</div>${dateHtml}`;

    return item;
}

function renderSearchResults(results) {
    elements.searchResults.innerHTML = ``;
    if (results.length === 0) {
        elements.searchResults.innerHTML = `<p>no se encontraron resultados</p>`;
        return;
    }
    results.forEach(song => {
        elements.searchResults.appendChild(createSongCard(song));
    });
}

// la lógica para que suene la música
const audioPlayer = new Audio();

function updateArtworkDOM(song) {
    const imageUrl = song.imagen_url || "img/imagenPlaylist.png";
    elements.expandTrigger.innerHTML = `<img src="${imageUrl}" alt="cover">`;
    elements.expandedCoverImg.src = imageUrl;
    elements.expandedTitle.textContent = song.titulo;
    elements.expandedArtist.textContent = song.artista_nombre || "artista desconocido";
}

function animateArtworkChange(newSong, direction) {
    const container = elements.expandedCoverContainer;
    const oldContent = container.querySelector("img");

    if (oldContent && elements.mainPlayer.classList.contains("expanded")) {
        const clone = oldContent.cloneNode(true);
        clone.classList.add("clone-artwork");
        container.appendChild(clone);

        updateArtworkDOM(newSong);
        const newContent = container.querySelector("img:not(.clone-artwork)");

        const inClass = direction === "next" ? "slide-in-right" : "slide-in-left";
        const outClass = direction === "next" ? "slide-out-left" : "slide-out-right";

        newContent.classList.add(inClass);
        clone.classList.add(outClass);

        setTimeout(() => {
            newContent.classList.remove(inClass);
            if (clone.parentNode) container.removeChild(clone);
        }, 600);
    } else {
        updateArtworkDOM(newSong);
    }
}

function playSong(song, direction = null) {
    if (appState.currentSong?.id === song.id) {
        togglePlay();
        return;
    }

    if (direction) {
        animateArtworkChange(song, direction);
    } else {
        updateArtworkDOM(song);
    }

    appState.currentSong = song;

    saveRecentSong(song);

    audioPlayer.src = "/api/music/stream/" + song.id;
    audioPlayer.volume = appState.volume;
    audioPlayer.play().catch(err => console.error("error al reproducir:", err));

    elements.currentSongTitle.textContent = song.titulo;
    elements.currentSongArtist.textContent = song.artista_nombre || "artista desconocido";

    document.querySelector("#play-btn i").className = "fas fa-pause";

    audioPlayer.ontimeupdate = () => {
        appState.currentTime = audioPlayer.currentTime;
        appState.duration = audioPlayer.duration || song.duracion || 0;
        updateProgress();
    };
    audioPlayer.onended = () => nextSong();

    if (elements.mainPlayer.classList.contains("expanded")) {
        renderQueue();
    }
}

function saveRecentSong(song) {
    if (!appState.user) return;
    const key = `recent_songs_${appState.user.id}`;
    let recent = JSON.parse(localStorage.getItem(key) || "[]");
    recent = recent.filter(s => s.id !== song.id);
    recent.unshift(song);
    if (recent.length > 10) recent.pop();
    localStorage.setItem(key, JSON.stringify(recent));
    renderRecentSongs();
}

function renderRecentSongs() {
    if (!elements.recentSongsGrid || !appState.user) return;
    const key = `recent_songs_${appState.user.id}`;
    const recent = JSON.parse(localStorage.getItem(key) || "[]");
    elements.recentSongsGrid.innerHTML = ``;
    if (recent.length === 0) {
        elements.recentSongsGrid.innerHTML = `<p style="color:#666; padding: 20px;">no has escuchado canciones recientemente</p>`;
        return;
    }
    recent.forEach(song => {
        elements.recentSongsGrid.appendChild(createSongCard(song));
    });
}

function togglePlay() {
    if (!appState.currentSong) return;
    if (audioPlayer.paused) {
        audioPlayer.play();

        document.querySelector("#play-btn i").className = "fas fa-pause";
    } else {
        audioPlayer.pause();

        document.querySelector("#play-btn i").className = "fas fa-play";
    }
}

function updateProgress() {
    const percentage = (appState.currentTime / appState.duration) * 100 || 0;
    elements.progressFilled.style.width = `${percentage}%`;
    elements.currentTime.textContent = formatTime(appState.currentTime);
    elements.totalTime.textContent = formatTime(appState.duration);
}

function updateVolume(value) {
    appState.volume = value / 100;
    audioPlayer.volume = appState.volume;
}

function nextSong() {
    const list = appState.viewMode === "list" && elements.libraryView.style.display !== "none" ? appState.librarySongs : appState.songs;
    if (!appState.currentSong || list.length === 0) return;
    const currentIndex = list.findIndex(s => s.id === appState.currentSong.id);
    const nextIndex = (currentIndex + 1) % list.length;
    playSong(list[nextIndex], "next");
}

function prevSong() {
    const list = appState.viewMode === "list" && elements.libraryView.style.display !== "none" ? appState.librarySongs : appState.songs;
    if (!appState.currentSong || list.length === 0) return;
    const currentIndex = list.findIndex(s => s.id === appState.currentSong.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    playSong(list[prevIndex], "prev");
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// para movernos entre las secciones de la web

function switchView(viewName) {
    if (elements.mainPlayer.classList.contains("expanded")) {
        togglePlayerExpansion();
    }
    elements.homeView.style.display = "none";
    elements.searchView.style.display = "none";
    elements.libraryView.style.display = "none";
    elements.uploadView.style.display = "none";
    elements.playlistDetailView.style.display = "none";

    const view = document.getElementById(`${viewName}-view`);
    if (view) view.style.display = "block";

    document.querySelectorAll(".main-nav li, .playlist-item").forEach(el => {
        el.classList.remove("active");
    });

    const navLink = document.querySelector(`[data-view="${viewName}"]`);
    if (navLink) {
        if (navLink.parentElement.tagName === "LI") {
            navLink.parentElement.classList.add("active");
        }
    }

    if (viewName === "library") fetchLibrary();
}

function toggleLibraryView(mode) {
    appState.viewMode = mode;
    if (mode === "grid") {
        elements.libraryGrid.style.display = "grid";
        elements.libraryList.style.display = "none";
        elements.gridViewBtn.classList.add("active");
        elements.listViewBtn.classList.remove("active");
    } else {
        elements.libraryGrid.style.display = "none";
        elements.libraryList.style.display = "block";
        elements.gridViewBtn.classList.remove("active");
        elements.listViewBtn.classList.add("active");
    }
}

// gestión de mis listas de canciones

async function fetchPlaylists(userId) {
    try {
        const response = await fetch(`/api/usuarios/${userId}/playlists`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            appState.playlists = result.data;
            renderPlaylists();
        }
    } catch (err) {
        console.error("error cargando playlists:", err);
    }
}

function renderPlaylists() {
    elements.playlistList.innerHTML = ``;
    appState.playlists.forEach(playlist => {
        const li = document.createElement("li");
        li.className = "playlist-item";
        li.innerHTML = `<a href="#" data-playlist-id="${playlist.id}"><span>${playlist.nombre}</span></a>`;

        const link = li.querySelector("a");
        link.addEventListener("click", (e) => {
            e.preventDefault();
            showPlaylistDetail(playlist.id);
        });

        // detecta arrastre sobre la playlist
        li.addEventListener("dragover", (e) => {
            e.preventDefault();
            li.classList.add("drag-over");
        });

        li.addEventListener("dragleave", () => {
            li.classList.remove("drag-over");
        });

        li.addEventListener("drop", async (e) => {
            e.preventDefault();
            li.classList.remove("drag-over");
            const songId = e.dataTransfer.getData("songId");
            if (songId) {
                await addSongToPlaylist(playlist.id, songId);
            }
        });

        elements.playlistList.appendChild(li);
    });
}

async function createNewPlaylist() {
    try {
        const response = await fetch("/api/playlists", {
            method: "POST",
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            appState.playlists.unshift(result.data);
            renderPlaylists();
            showPlaylistDetail(result.data.id);
        }
    } catch (err) {
        console.error("error creando playlist:", err);
    }
}

// detecta arrastre desde el reproductor
const playerSongInfo = document.querySelector(".player-left .song-info");
if (playerSongInfo) {
    playerSongInfo.draggable = true;
    playerSongInfo.addEventListener("dragstart", (e) => {
        if (appState.currentSong) {
            e.dataTransfer.setData("songId", appState.currentSong.id);
            e.dataTransfer.effectAllowed = "copy";
        } else {
            e.preventDefault();
        }
    });

    // menú contextual para el reproductor también
    playerSongInfo.addEventListener("contextmenu", (e) => {
        if (appState.currentSong) {
            e.preventDefault();
            showContextMenu(e, appState.currentSong.id);
        }
    });
}

async function addSongToPlaylist(playlistId, songId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/canciones`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ cancion_id: songId })
        });
        const result = await response.json();
        if (result.success) {
            console.log("canción añadida correctamente");
            if (appState.currentPlaylist && appState.currentPlaylist.id == playlistId) {
                showPlaylistDetail(playlistId);
            }
        } else {
            alert(result.error || "error al añadir canción");
        }
    } catch (err) {
        console.error("error añadiendo a playlist:", err);
    }
}

function showContextMenu(e, songId, song = null) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("song-context-menu");
    const playlistsList = document.getElementById("context-menu-playlists");
    playlistsList.innerHTML = ``;
    if (appState.playlists.length === 0) {
        const noPl = document.createElement("div");
        noPl.className = "context-menu-item";
        noPl.style.color = "#666";
        noPl.textContent = "no tienes playlists todavía";
        playlistsList.appendChild(noPl);
    } else {
        appState.playlists.forEach(playlist => {
            const item = document.createElement("div");
            item.className = "context-menu-item";
            item.textContent = playlist.nombre;
            item.onclick = () => {
                addSongToPlaylist(playlist.id, songId);
                menu.style.display = "none";
            };
            playlistsList.appendChild(item);
        });
    }
    menu.style.display = "block";
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 200;
    const menuHeight = 150;
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    const closeMenu = (event) => {
        if (!menu.contains(event.target)) {
            menu.style.display = "none";
            document.removeEventListener("mousedown", closeMenu);
        }
    };
    setTimeout(() => document.addEventListener("mousedown", closeMenu), 0);
}

async function showPlaylistDetail(id) {
    try {
        const response = await fetch(`/api/playlists/${id}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            const playlist = result.data;
            appState.currentPlaylist = playlist;

            switchView("playlist-detail");

            elements.playlistName.textContent = playlist.nombre;
            elements.playlistName.dataset.id = playlist.id;
            elements.playlistCover.src = playlist.imagen_url || "img/imagenPlaylist.png";

            // resaltar en el menú lateral
            document.querySelectorAll(".playlist-item").forEach(li => {
                if (li.querySelector("a").dataset.playlistId == id) {
                    li.classList.add("active");
                }
            });

            renderPlaylistSongs(playlist.canciones);
            document.getElementById("play-playlist-btn").onclick = () => {
                if (playlist.canciones.length > 0) {
                    appState.songs = playlist.canciones;
                    playSong(playlist.canciones[0]);
                }
            };
        }
    } catch (err) {
        console.error("error cargando detalle:", err);
    }
}

function renderPlaylistSongs(songs) {
    elements.playlistSongsList.innerHTML = ``;
    const header = document.getElementById("playlist-list-header");
    if (header) {
        header.style.display = songs.length === 0 ? "none" : "grid";
    }
    if (songs.length === 0) {
        elements.playlistSongsList.innerHTML = `<div class="no-results">esta playlist está vacía, arrastra algo aquí</div>`;
        return;
    }
    songs.forEach((song, index) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.draggable = true;
        div.innerHTML = `<div class="col-cover"></div><div class="col-title"><div class="item-info"><div class="item-name">${song.titulo}</div></div></div><div class="col-album">${song.artista_nombre || "artista desconocido"}</div><div class="col-date">${formatTime(song.duracion)}</div>`;
        div.onclick = () => playSong(song);
        div.oncontextmenu = (e) => {
            e.preventDefault();
            showContextMenu(e, song.id, song);
        };
        div.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("songId", song.id);
            e.dataTransfer.effectAllowed = "copy";
        });
        elements.playlistSongsList.appendChild(div);
    });
}

async function updatePlaylistTitle(id, newName) {
    // tengo que usar formdata por culpa del sistema de subida de imágenes
    const formData = new FormData();
    formData.append("nombre", newName);

    try {
        const response = await fetch(`/api/playlists/${id}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${auth.getToken()}`
            },
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            elements.playlistName.textContent = result.data.nombre;
            // actualizo en el menú lateral
            const playlist = appState.playlists.find(p => p.id == id);
            if (playlist) playlist.nombre = result.data.nombre;
            renderPlaylists();
        }
    } catch (err) {
        console.error("error actualizando título:", err);
    }
}

async function deletePlaylist(id) {
    if (!confirm("¿estás seguro de que quieres borrar esta lista?")) return;
    try {
        const response = await fetch(`/api/playlists/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            appState.playlists = appState.playlists.filter(p => p.id != id);
            renderPlaylists();
            switchView("home");
        }
    } catch (err) {
        console.error("error borrando playlist:", err);
    }
}

async function updatePlaylistImage(id, file) {
    const formData = new FormData();
    formData.append("imagen", file);

    try {
        const response = await fetch(`/api/playlists/${id}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${auth.getToken()}`
            },
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            const newImageUrl = result.data.imagen_url || "img/imagenPlaylist.png";
            elements.playlistCover.src = newImageUrl;
            // guardo la nueva imagen en mi lista local
            const playlist = appState.playlists.find(p => p.id == id);
            if (playlist) playlist.imagen_url = result.data.imagen_url;
            if (appState.currentPlaylist && appState.currentPlaylist.id == id) {
                appState.currentPlaylist.imagen_url = result.data.imagen_url;
            }
        }
    } catch (err) {
        console.error("error subiendo imagen:", err);
    }
}

// intentando que las animaciones queden chulas
function togglePlayerExpansion() {
    const isExpanding = !elements.mainPlayer.classList.contains("expanded");

    if (isExpanding) {
        // --- apertura (mismo funcionamiento exitoso) ---
        const miniRect = elements.expandTrigger.getBoundingClientRect();
        elements.mainPlayer.classList.add("expanded");
        renderQueue();

        const largeRect = elements.expandedCoverContainer.getBoundingClientRect();
        const dx = (miniRect.left + miniRect.width / 2) - (largeRect.left + largeRect.width / 2);
        const dy = (miniRect.top + miniRect.height / 2) - (largeRect.top + largeRect.height / 2);
        const scale = miniRect.width / largeRect.width;

        elements.expandedCoverContainer.style.transition = "none";
        elements.expandedCoverContainer.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

        void elements.expandedCoverContainer.offsetWidth;

        elements.expandedCoverContainer.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease";
        elements.expandedCoverContainer.style.transform = "none";
        elements.expandedCoverContainer.style.opacity = "1";

        elements.expandTrigger.style.opacity = "0";
    } else {
        // --- cierre simétrico (snap-and-animate) ---
        // 1. capturo la posición de la carátula grande ahora mismo
        const largeRectGlobal = elements.expandedCoverContainer.getBoundingClientRect();

        // 2. quito el modo grande de golpe para saber dónde está el reproductor pequeño
        elements.mainPlayer.style.transition = "none";
        elements.mainPlayer.classList.remove("expanded");
        void elements.mainPlayer.offsetWidth;

        const miniRectGlobal = elements.expandTrigger.getBoundingClientRect();
        const largeContainerRectFloating = elements.expandedCoverContainer.getBoundingClientRect();

        // 3. hago que la carátula "salte" visualmente a donde estaba antes de quitar el modo grande
        const snapDx = (largeRectGlobal.left + largeRectGlobal.width / 2) - (largeContainerRectFloating.left + largeContainerRectFloating.width / 2);
        const snapDy = (largeRectGlobal.top + largeRectGlobal.height / 2) - (largeContainerRectFloating.top + largeContainerRectFloating.height / 2);
        const snapScale = largeRectGlobal.width / largeContainerRectFloating.width;

        elements.expandedCoverContainer.style.transition = "none";
        elements.expandedCoverContainer.style.transform = `translate(${snapDx}px, ${snapDy}px) scale(${snapScale})`;
        void elements.expandedCoverContainer.offsetWidth;

        // 4. preparo el viaje hacia el mini artwork del reproductor flotante
        const targetDx = (miniRectGlobal.left + miniRectGlobal.width / 2) - (largeContainerRectFloating.left + largeContainerRectFloating.width / 2);
        const targetDy = (miniRectGlobal.top + miniRectGlobal.height / 2) - (largeContainerRectFloating.top + largeContainerRectFloating.height / 2);
        const targetScale = miniRectGlobal.width / largeContainerRectFloating.width;

        // 5. activo el cierre suave y lanzo las animaciones juntas
        elements.mainPlayer.classList.add("closing");
        elements.mainPlayer.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        elements.expandedCoverContainer.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease";

        requestAnimationFrame(() => {
            elements.mainPlayer.classList.remove("expanded");
            elements.expandedCoverContainer.style.transform = `translate(${targetDx}px, ${targetDy}px) scale(${targetScale})`;
            elements.expandedCoverContainer.style.opacity = "0";
        });

        setTimeout(() => {
            // dejo todo como estaba para la próxima vez
            elements.mainPlayer.classList.remove("closing");
            elements.expandedCoverContainer.style.transition = "none";
            elements.expandedCoverContainer.style.transform = "";
            elements.expandedCoverContainer.style.opacity = "1";
            elements.expandTrigger.style.opacity = "1";
        }, 300);
    }
}

function renderQueue() {
    elements.queueList.innerHTML = ``;
    if (!appState.currentSong) return;

    const currentIndex = appState.songs.findIndex(s => s.id === appState.currentSong.id);
    const nextSongs = appState.songs.slice(currentIndex + 1);

    if (nextSongs.length === 0) {
        elements.queueList.innerHTML = `<p style="color: #666; padding: 20px;">no hay más canciones en cola por ahora</p>`;
        return;
    }

    nextSongs.forEach(song => {
        const item = createListItem(song, "", false);
        elements.queueList.appendChild(item);
    });
}

// detecta clics del usuario
elements.expandTrigger.addEventListener("click", togglePlayerExpansion);
elements.closeExpanded.addEventListener("click", togglePlayerExpansion);

elements.progressContainer.addEventListener("click", (e) => {
    const width = elements.progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    if (duration) {
        audioPlayer.currentTime = (clickX / width) * duration;
    }
});

elements.playBtn.addEventListener("click", togglePlay);
elements.prevBtn.addEventListener("click", prevSong);
elements.nextBtn.addEventListener("click", nextSong);
elements.volumeSlider.addEventListener("input", (e) => updateVolume(e.target.value));

elements.gridViewBtn.addEventListener("click", () => toggleLibraryView("grid"));
elements.listViewBtn.addEventListener("click", () => toggleLibraryView("list"));

document.getElementById("upload-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) analyzeFile(file);
});

elements.uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("titulo", document.getElementById("upload-title").value);
    formData.append("artista", document.getElementById("upload-artist").value);
    formData.append("album", document.getElementById("upload-album").value);
    formData.append("genero", document.getElementById("upload-genre").value);
    formData.append("audio", document.getElementById("upload-file").files[0]);
    const image = document.getElementById("upload-image").files[0];
    if (image) formData.append("imagen", image);
    await uploadSong(formData);
});

// controla acciones del perfil
const userMenu = {
    dropdown: document.getElementById("user-dropdown"),
    trigger: document.getElementById("user-dropdown-trigger"),
    modalContainer: document.getElementById("modal-container"),
    modalName: document.getElementById("modal-name"),
    modalDelete1: document.getElementById("modal-delete-1"),
    modalDelete2: document.getElementById("modal-delete-2"),
    newNameInput: document.getElementById("new-name-input"),
    deleteConfirmInput: document.getElementById("delete-confirm-input"),
    finalDeleteBtn: document.getElementById("final-delete-btn")
};

// abrir y cerrar el menú desplegable
userMenu.trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.dropdown.classList.toggle("show");
});

document.addEventListener("click", () => {
    userMenu.dropdown.classList.remove("show");
});

// muestra las ventanas de opciones
document.getElementById("change-name-btn").addEventListener("click", (e) => {
    e.preventDefault();
    userMenu.newNameInput.value = appState.user.nombre;
    showModal(userMenu.modalName);
});

document.getElementById("delete-account-btn").addEventListener("click", (e) => {
    e.preventDefault();
    showModal(userMenu.modalDelete1);
});

function showModal(modal) {
    userMenu.modalContainer.style.display = "flex";
    document.querySelectorAll(".modal-content-user").forEach(m => m.classList.remove("active"));
    modal.classList.add("active");
}

function closeModal() {
    userMenu.modalContainer.style.display = "none";
}

// para quitar las ventanas de la vista
document.getElementById("cancel-name-btn").addEventListener("click", closeModal);
document.getElementById("cancel-delete-1").addEventListener("click", closeModal);
document.getElementById("cancel-delete-2").addEventListener("click", () => showModal(userMenu.modalDelete1));

// actualizo el nombre si el usuario quiere cambiarlo
document.getElementById("save-name-btn").addEventListener("click", async () => {
    const nuevoNombre = userMenu.newNameInput.value.trim();
    if (!nuevoNombre) return;

    try {
        const response = await fetch("/api/auth/profile-name", {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre: nuevoNombre })
        });

        if (!response.ok) throw new Error("error en la petición");

        const data = await response.json();
        if (data.success) {
            appState.user.nombre = nuevoNombre;
            localStorage.setItem("user", JSON.stringify(appState.user));
            document.getElementById("user-name").textContent = nuevoNombre;
            closeModal();
        }
    } catch (err) { console.error("error actualizando nombre:", err); }
});

// aviso de borrado definitivo de cuenta
document.getElementById("confirm-delete-1").addEventListener("click", () => {
    userMenu.deleteConfirmInput.value = "";
    userMenu.finalDeleteBtn.disabled = true;
    showModal(userMenu.modalDelete2);
});

userMenu.deleteConfirmInput.addEventListener("input", (e) => {
    userMenu.finalDeleteBtn.disabled = e.target.value !== "Borrar";
});

document.getElementById("final-delete-btn").addEventListener("click", async () => {
    if (userMenu.deleteConfirmInput.value !== "Borrar") return;

    try {
        const response = await fetch("/api/auth/profile", {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error("error al borrar la cuenta");

        const data = await response.json();
        if (data.success) {
            auth.logout();
            window.location.href = "/login";
        }
    } catch (err) { console.error("error al eliminar cuenta:", err); }
});

// cerrando la sesión del usuario
document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    auth.logout();
    window.location.href = "/login";
});

elements.searchBtn.addEventListener("click", () => {
    const query = elements.searchInput.value.trim();
    if (query) {
        switchView("search");
        searchSongs(query);
    }
});

elements.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") elements.searchBtn.click();
});

document.querySelectorAll("[data-view]").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(e.currentTarget.getAttribute("data-view"));
    });
});

// detecta clics del usuario de playlist
document.getElementById("create-playlist-btn").addEventListener("click", createNewPlaylist);

document.getElementById("playlist-options-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("playlist-dropdown").classList.toggle("show");
});

document.addEventListener("click", () => {
    document.getElementById("playlist-dropdown").classList.remove("show");
});

document.getElementById("delete-playlist-btn").addEventListener("click", (e) => {
    e.preventDefault();
    if (appState.currentPlaylist) {
        deletePlaylist(appState.currentPlaylist.id);
    }
});

document.getElementById("share-playlist-btn").addEventListener("click", (e) => {
    e.preventDefault();
    alert("funcionalidad de compartir no disponible todavía");
});

// puedes cambiar el nombre de la playlist haciendo clic directo
elements.playlistName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        elements.playlistName.blur();
    }
});

elements.playlistName.addEventListener("blur", () => {
    const id = elements.playlistName.dataset.id;
    const newName = elements.playlistName.textContent.trim();
    if (id && newName && newName !== appState.currentPlaylist?.nombre) {
        updatePlaylistTitle(id, newName);
    }
});

document.getElementById("playlist-image-container").addEventListener("click", () => {
    document.getElementById("playlist-image-input").click();
});

document.getElementById("playlist-image-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && appState.currentPlaylist) {
        updatePlaylistImage(appState.currentPlaylist.id, file);
    }
});

// preparando todo para cuando la página carga

async function init() {
    if (!auth.isAuthenticated()) {
        window.location.href = "/login";
        return;
    }
    const user = auth.getUser();
    document.getElementById("user-name").textContent = user.nombre || "usuario";
    appState.user = user;

    await fetchSongs();
    await fetchPlaylists(user.id); renderRecentSongs();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
