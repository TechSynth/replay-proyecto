// Estado de la aplicación
const appState = {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    songs: [],
    playlists: [],
    user: null
};

// Función para obtener headers con autenticación
function getAuthHeaders() {
    const token = auth.getToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// DOM
const elements = {
    songsGrid: document.getElementById('songs-grid'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    searchResults: document.getElementById('search-results'),
    playBtn: document.getElementById('play-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    songImage: document.querySelector('.song-image'),
    currentSongTitle: document.getElementById('current-song-title'),
    currentSongArtist: document.getElementById('current-song-artist'),
    currentTime: document.getElementById('current-time'),
    totalTime: document.getElementById('total-time'),
    progressFilled: document.getElementById('progress-filled'),
    volumeSlider: document.getElementById('volume-slider'),
    playlistList: document.getElementById('playlist-list'),
    homeView: document.getElementById('home-view'),
    searchView: document.getElementById('search-view'),
    libraryView: document.getElementById('library-view')
};

//API

async function fetchSongs() {
    try {
        const response = await fetch('/api/canciones', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            appState.songs = data.data;
            renderSongs(data.data);
        }
    } catch (error) {
        console.error('Error cargando canciones:', error);
        showError('No se pudieron cargar las canciones');
    }
}

async function fetchPlaylists(userId = null) {
    try {
        const id = userId || appState.user?.id || 1;
        const response = await fetch(`/api/usuarios/${id}/playlists`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            appState.playlists = data.data;
            renderPlaylists(data.data);
        }
    } catch (error) {
        console.error('Error cargando playlists:', error);
    }
}

async function searchSongs(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            renderSearchResults(data.data);
        }
    } catch (error) {
        console.error('Error en búsqueda:', error);
        showError('Error al buscar canciones');
    }
}

//Render

function renderSongs(songs) {
    elements.songsGrid.innerHTML = '';
    
    if (songs.length === 0) {
        elements.songsGrid.innerHTML = '<p>No hay canciones disponibles</p>';
        return;
    }
    
    songs.forEach(song => {
        const songCard = createSongCard(song);
        elements.songsGrid.appendChild(songCard);
    });
}

function createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.onclick = () => playSong(song);
    
    const minutes = Math.floor(song.duracion / 60);
    const seconds = song.duracion % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // usando la imagen local de la carpeta img
    const imageUrl = '/img/portadas.jpg';
    
    card.innerHTML = `
        <div class="song-card-image" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;">
        </div>
        <div class="song-card-title">${song.titulo}</div>
        <div class="song-card-artist">${song.artista_nombre || 'artista desconocido'}</div>
        <div class="song-card-duration">${duration}</div>
    `;
    
    return card;
}

function renderPlaylists(playlists) {
    elements.playlistList.innerHTML = '';
    
    if (playlists.length === 0) {
        elements.playlistList.innerHTML = '<li style="color: #666;">Sin playlists</li>';
        return;
    }
    
    playlists.forEach(playlist => {
        const li = document.createElement('li');
        li.textContent = playlist.nombre;
        li.onclick = () => loadPlaylist(playlist.id);
        elements.playlistList.appendChild(li);
    });
}

function renderSearchResults(results) {
    elements.searchResults.innerHTML = '';
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = '<p>No se encontraron resultados</p>';
        return;
    }
    
    results.forEach(song => {
        const songCard = createSongCard(song);
        elements.searchResults.appendChild(songCard);
    });
}

// Audio Player Real
const audioPlayer = new Audio();

function playSong(song) {
    if (appState.currentSong?.id === song.id) {
        togglePlay();
        return;
    }

    appState.currentSong = song;
    appState.isPlaying = true;
    
    // cargar url directamente desde la base de datos
    audioPlayer.src = song.audio_url;
    audioPlayer.volume = appState.volume;
    audioPlayer.play().catch(err => console.error('error al reproducir:', err));
    
    // actualizar interfaz
    elements.currentSongTitle.textContent = song.titulo;
    elements.currentSongArtist.textContent = song.artista_nombre || 'artista desconocido';
    elements.songImage.style.backgroundImage = "url('/img/portadas.jpg')";
    elements.songImage.style.backgroundSize = "cover";
    elements.songImage.style.backgroundPosition = "center";
    document.querySelector('#play-btn i').className = 'fas fa-pause';
    
    // eventos del audio
    audioPlayer.ontimeupdate = () => {
        appState.currentTime = audioPlayer.currentTime;
        appState.duration = audioPlayer.duration || song.duracion;
        updateProgress();
    };

    audioPlayer.onended = () => {
        nextSong();
    };
}

function togglePlay() {
    if (!appState.currentSong) return;
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        appState.isPlaying = true;
        document.querySelector('#play-btn i').className = 'fas fa-pause';
    } else {
        audioPlayer.pause();
        appState.isPlaying = false;
        document.querySelector('#play-btn i').className = 'fas fa-play';
    }
}

function updateProgress() {
    const percentage = (appState.currentTime / appState.duration) * 100;
    elements.progressFilled.style.width = `${percentage}%`;
    elements.currentTime.textContent = formatTime(appState.currentTime);
    elements.totalTime.textContent = formatTime(appState.duration);
}

function updateVolume(value) {
    appState.volume = value / 100;
    audioPlayer.volume = appState.volume;
}

function nextSong() {
    if (!appState.currentSong || appState.songs.length === 0) return;
    
    const currentIndex = appState.songs.findIndex(s => s.id === appState.currentSong.id);
    const nextIndex = (currentIndex + 1) % appState.songs.length;
    playSong(appState.songs[nextIndex]);
}

function prevSong() {
    if (!appState.currentSong || appState.songs.length === 0) return;
    
    const currentIndex = appState.songs.findIndex(s => s.id === appState.currentSong.id);
    const prevIndex = (currentIndex - 1 + appState.songs.length) % appState.songs.length;
    playSong(appState.songs[prevIndex]);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// PLAYLISTS

async function createPlaylist() {
    try {
        const nombre = document.getElementById('playlist-name').value;
        const descripcion = document.getElementById('playlist-description').value;
        const es_publica = document.getElementById('playlist-public').checked;

        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                nombre,
                descripcion: descripcion || null,
                es_publica
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Playlist creada exitosamente');
            closeCreatePlaylistModal();
            
            // Recargar playlists
            await fetchPlaylists(appState.user.id);
            
            // Limpiar formulario
            document.getElementById('create-playlist-form').reset();
        } else {
            showError(data.error || 'Error al crear la playlist');
        }
    } catch (error) {
        console.error('Error creando playlist:', error);
        showError('Error al crear la playlist');
    }
}

async function loadPlaylist(playlistId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/canciones`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            // Mostrar canciones de la playlist en la grid
            renderSongs(data.data);
            switchView('library');
        }
    } catch (error) {
        console.error('Error cargando playlist:', error);
        showError('Error al cargar la playlist');
    }
}

async function addSongToPlaylist(playlistId, songId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/canciones`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ cancion_id: songId })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Canción agregada a la playlist');
        } else {
            showError(data.error || 'Error al agregar canción');
        }
    } catch (error) {
        console.error('Error agregando canción:', error);
        showError('Error al agregar canción a la playlist');
    }
}

async function deletePlaylist(playlistId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta playlist?')) {
        return;
    }

    try {
        const response = await fetch(`/api/playlists/${playlistId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Playlist eliminada');
            await fetchPlaylists(appState.user.id);
        } else {
            showError(data.error || 'Error al eliminar la playlist');
        }
    } catch (error) {
        console.error('Error eliminando playlist:', error);
        showError('Error al eliminar la playlist');
    }
}

// MODALES Y UI

function openCreatePlaylistModal() {
    document.getElementById('modal-create-playlist').style.display = 'block';
}

function closeCreatePlaylistModal() {
    document.getElementById('modal-create-playlist').style.display = 'none';
}

// Mostrar/Ocultar mensajes de éxito y error
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// NAVEGACIÓN

function switchView(viewName) {
    elements.homeView.style.display = 'none';
    elements.searchView.style.display = 'none';
    elements.libraryView.style.display = 'none';
    
    switch(viewName) {
        case 'home':
            elements.homeView.style.display = 'block';
            break;
        case 'search':
            elements.searchView.style.display = 'block';
            break;
        case 'library':
            elements.libraryView.style.display = 'block';
            break;
    }
    
    //Actualizar navegación activa
    document.querySelectorAll('.main-nav li').forEach(li => {
        li.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).parentElement.classList.add('active');
}

// Event Listeners

// Hacer que la barra de progreso sea interactiva
elements.progressFilled.parentElement.addEventListener('click', (e) => {
    if (!appState.currentSong) return;
    
    const progressBar = e.currentTarget;
    const clickPosition = e.offsetX;
    const totalWidth = progressBar.clientWidth;
    const clickPercentage = clickPosition / totalWidth;
    
    const seekTime = clickPercentage * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
});

// Controles del reproductor
elements.playBtn.addEventListener('click', togglePlay);
elements.prevBtn.addEventListener('click', prevSong);
elements.nextBtn.addEventListener('click', nextSong);
elements.volumeSlider.addEventListener('input', (e) => updateVolume(e.target.value));

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.logout();
    window.location.href = '/login';
});

// Busqueda
elements.searchBtn.addEventListener('click', () => {
    const query = elements.searchInput.value.trim();
    if (query) {
        switchView('search');
        searchSongs(query);
    }
});

elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.searchBtn.click();
    }
});

// Navegación
document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.currentTarget.getAttribute('data-view');
        switchView(view);
    });
});

// Modal para crear playlist
document.getElementById('create-playlist-btn').addEventListener('click', openCreatePlaylistModal);
document.getElementById('modal-close-btn').addEventListener('click', closeCreatePlaylistModal);
document.getElementById('modal-cancel-btn').addEventListener('click', closeCreatePlaylistModal);

// Cerrar modal al hacer click afuera
document.getElementById('modal-create-playlist').addEventListener('click', (e) => {
    if (e.target.id === 'modal-create-playlist') {
        closeCreatePlaylistModal();
    }
});

// Enviar formulario de crear playlist
document.getElementById('create-playlist-form').addEventListener('submit', (e) => {
    e.preventDefault();
    createPlaylist();
});

// INICIALIZACIÓN

async function init() {
    console.log('Inicializando rePLAY...');
    
    // Verificar autenticación
    if (!auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }
    
    // Mostrar nombre del usuario
    const user = auth.getUser();
    document.getElementById('user-name').textContent = user.nombre || 'Usuario';
    appState.user = user;
    
    // Cargar datos iniciales
    await fetchSongs();
    await fetchPlaylists(user.id);
    
    console.log('Aplicación lista');
}

// if dom rdy
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
};