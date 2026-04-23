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
    
    card.innerHTML = `
        <div class="song-card-image">
            <i class="fas fa-compact-disc"></i>
        </div>
        <div class="song-card-title">${song.titulo}</div>
        <div class="song-card-artist">${song.artista_nombre || 'Artista Desconocido'}</div>
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

//player

function playSong(song) {
    appState.currentSong = song;
    appState.isPlaying = true;
    appState.currentTime = 0; 
    
    // Actualizar interfaz
    elements.currentSongTitle.textContent = song.titulo;
    elements.currentSongArtist.textContent = song.artista_nombre || 'Artista Desconocido';
    
    // Cambiar icono a pause
    document.querySelector('#play-btn i').className = 'fas fa-pause';
    
    // Simular duración
    appState.duration = song.duracion;
    elements.totalTime.textContent = formatTime(song.duracion);
    
    // Iniciar simulación de reproducción
    startPlayback();
    
    console.log('Reproduciendo:', song.titulo);
    console.log('URL del audio:', song.audio_url);
}

function togglePlay() {
    if (!appState.currentSong) {
        return;
    }
    
    appState.isPlaying = !appState.isPlaying;
    
    const playIcon = document.querySelector('#play-btn i');
    
    if (appState.isPlaying) {
        playIcon.className = 'fas fa-pause';
        startPlayback();
    } else {
        playIcon.className = 'fas fa-play';
        stopPlayback();
    }
}

let playbackInterval;

function startPlayback() {
    stopPlayback(); //cleaner
    
    playbackInterval = setInterval(() => {
        if (appState.isPlaying && appState.currentTime < appState.duration) {
            appState.currentTime++;
            updateProgress();
        } else if (appState.currentTime >= appState.duration) {
            stopPlayback();
            appState.currentTime = 0;
            appState.isPlaying = false;
            document.querySelector('#play-btn i').className = 'fas fa-play';
        }
    }, 1000);
}

function stopPlayback() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
    }
}

function updateProgress() {
    const percentage = (appState.currentTime / appState.duration) * 100;
    elements.progressFilled.style.width = `${percentage}%`;
    elements.currentTime.textContent = formatTime(appState.currentTime);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showError(message) {
    // Mostrar error en consola (puedes personalizar para mostrar en UI)
    console.error(message);
    alert(message);
}

function updateVolume(value) {
    appState.volume = value / 100;
    console.log('Volumen:', appState.volume);
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

// EVENT LISTENERS

// Controles del reproductor
elements.playBtn.addEventListener('click', togglePlay);
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