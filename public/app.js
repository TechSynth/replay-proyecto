// estado de la app
const appState = {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    songs: [],
    librarySongs: [],
    playlists: [],
    user: null,
    viewMode: 'grid' // grid o list
};

// funcion para los headers
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

// dom
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
    libraryView: document.getElementById('library-view'),
    uploadView: document.getElementById('upload-view'),
    uploadForm: document.getElementById('upload-form'),
    uploadStatus: document.getElementById('upload-status'),
    libraryGrid: document.getElementById('library-grid'),
    libraryList: document.getElementById('library-list'),
    libraryListItems: document.getElementById('library-list-items'),
    gridViewBtn: document.getElementById('grid-view-btn'),
    listViewBtn: document.getElementById('list-view-btn')
};

// api

async function uploadSong(formData) {
    elements.uploadStatus.textContent = 'subiendo canción y procesando metadatos...';
    elements.uploadStatus.className = 'upload-status loading';
    elements.uploadStatus.style.display = 'block';
    
    const submitBtn = document.getElementById('upload-submit-btn');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            elements.uploadStatus.textContent = `¡éxito! se ha subido "${data.data.titulo}"`;
            elements.uploadStatus.className = 'upload-status success';
            elements.uploadForm.reset();
            // recargar datos
            await fetchSongs();
            await fetchLibrary();
        } else {
            elements.uploadStatus.textContent = `error: ${data.error}`;
            elements.uploadStatus.className = 'upload-status error';
        }
    } catch (error) {
        console.error('error en subida:', error);
        elements.uploadStatus.textContent = 'error de conexión con el servidor';
        elements.uploadStatus.className = 'upload-status error';
    } finally {
        submitBtn.disabled = false;
    }
}

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
    }
}

async function fetchLibrary() {
    try {
        const response = await fetch('/api/library', {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            appState.librarySongs = data.data;
            renderLibrary(data.data);
        }
    } catch (error) {
        console.error('Error cargando biblioteca:', error);
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
    }
}

// render

function renderSongs(songs) {
    elements.songsGrid.innerHTML = '';
    if (songs.length === 0) {
        elements.songsGrid.innerHTML = '<p>No hay canciones disponibles</p>';
        return;
    }
    songs.forEach(song => {
        elements.songsGrid.appendChild(createSongCard(song));
    });
}

function renderLibrary(songs) {
    elements.libraryGrid.innerHTML = '';
    elements.libraryListItems.innerHTML = '';
    
    if (songs.length === 0) {
        const msg = '<p style="padding: 20px; color: #b3b3b3;">No has subido ninguna canción todavía.</p>';
        elements.libraryGrid.innerHTML = msg;
        elements.libraryListItems.innerHTML = msg;
        return;
    }
    
    songs.forEach((song, index) => {
        // grid mode
        elements.libraryGrid.appendChild(createSongCard(song));
        
        // list mode
        elements.libraryListItems.appendChild(createListItem(song, index + 1));
    });
}

function createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.onclick = () => playSong(song);
    
    const imageUrl = song.imagen_url || '';
    const imageStyle = imageUrl 
        ? `background-image: url('${imageUrl}'); background-size: cover; background-position: center;` 
        : `background-color: #000; display: flex; align-items: center; justify-content: center;`;
    
    card.innerHTML = `
        <div class="song-card-image" style="${imageStyle}">
            ${!imageUrl ? '<i class="fas fa-music"></i>' : ''}
        </div>
        <div class="song-card-title">${song.titulo}</div>
        <div class="song-card-artist">${song.artista_nombre || 'artista desconocido'}</div>
    `;
    
    return card;
}

function createListItem(song, index) {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.onclick = () => playSong(song);
    
    const date = new Date(song.fecha_subida).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    
    item.innerHTML = `
        <div class="col-cover">
            <div class="item-cover">
                ${song.imagen_url ? `<img src="${song.imagen_url}" alt="${song.titulo}">` : '<i class="fas fa-music"></i>'}
            </div>
        </div>
        <div class="item-info">
            <span class="item-title">${song.titulo}</span>
            <span class="item-artist">${song.artista_nombre || 'artista desconocido'}</span>
        </div>
        <div class="item-album">${song.album_nombre || 'sin álbum'}</div>
        <div class="item-date">${date}</div>
    `;
    
    return item;
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
        elements.searchResults.appendChild(createSongCard(song));
    });
}

// reproductor audio
const audioPlayer = new Audio();

function playSong(song) {
    if (appState.currentSong?.id === song.id) {
        togglePlay();
        return;
    }

    appState.currentSong = song;
    appState.isPlaying = true;
    
    audioPlayer.src = `/api/music/stream/${song.id}`;
    audioPlayer.volume = appState.volume;
    audioPlayer.play().catch(err => console.error('error al reproducir:', err));
    
    elements.currentSongTitle.textContent = song.titulo;
    elements.currentSongArtist.textContent = song.artista_nombre || 'artista desconocido';
    
    if (song.imagen_url) {
        elements.songImage.innerHTML = `<img src="${song.imagen_url}" alt="cover">`;
        elements.songImage.style.backgroundColor = 'transparent';
    } else {
        elements.songImage.innerHTML = '<i class="fas fa-music"></i>';
        elements.songImage.style.backgroundColor = '#000';
    }
    
    document.querySelector('#play-btn i').className = 'fas fa-pause';
    
    audioPlayer.ontimeupdate = () => {
        appState.currentTime = audioPlayer.currentTime;
        appState.duration = audioPlayer.duration || song.duracion || 0;
        updateProgress();
    };

    audioPlayer.onended = () => nextSong();
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
    const list = appState.viewMode === 'list' && elements.libraryView.style.display !== 'none' ? appState.librarySongs : appState.songs;
    if (!appState.currentSong || list.length === 0) return;
    const currentIndex = list.findIndex(s => s.id === appState.currentSong.id);
    const nextIndex = (currentIndex + 1) % list.length;
    playSong(list[nextIndex]);
}

function prevSong() {
    const list = appState.viewMode === 'list' && elements.libraryView.style.display !== 'none' ? appState.librarySongs : appState.songs;
    if (!appState.currentSong || list.length === 0) return;
    const currentIndex = list.findIndex(s => s.id === appState.currentSong.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    playSong(list[prevIndex]);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// navegacion

function switchView(viewName) {
    elements.homeView.style.display = 'none';
    elements.searchView.style.display = 'none';
    elements.libraryView.style.display = 'none';
    elements.uploadView.style.display = 'none';
    
    const view = document.getElementById(`${viewName}-view`);
    if (view) view.style.display = 'block';
    
    document.querySelectorAll('.main-nav li').forEach(li => {
        li.classList.remove('active');
    });
    const navLink = document.querySelector(`[data-view="${viewName}"]`);
    if (navLink) navLink.parentElement.classList.add('active');
    
    if (viewName === 'library') fetchLibrary();
}

function toggleLibraryView(mode) {
    appState.viewMode = mode;
    if (mode === 'grid') {
        elements.libraryGrid.style.display = 'grid';
        elements.libraryList.style.display = 'none';
        elements.gridViewBtn.classList.add('active');
        elements.listViewBtn.classList.remove('active');
    } else {
        elements.libraryGrid.style.display = 'none';
        elements.libraryList.style.display = 'block';
        elements.gridViewBtn.classList.remove('active');
        elements.listViewBtn.classList.add('active');
    }
}

// listeners

elements.playBtn.addEventListener('click', togglePlay);
elements.prevBtn.addEventListener('click', prevSong);
elements.nextBtn.addEventListener('click', nextSong);
elements.volumeSlider.addEventListener('input', (e) => updateVolume(e.target.value));

elements.gridViewBtn.addEventListener('click', () => toggleLibraryView('grid'));
elements.listViewBtn.addEventListener('click', () => toggleLibraryView('list'));

elements.uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('titulo', document.getElementById('upload-title').value);
    formData.append('artista', document.getElementById('upload-artist').value);
    formData.append('audio', document.getElementById('upload-file').files[0]);
    const image = document.getElementById('upload-image').files[0];
    if (image) formData.append('imagen', image);
    
    await uploadSong(formData);
});

document.getElementById('logout-btn').addEventListener('click', () => {
    auth.logout();
    window.location.href = '/login';
});

elements.searchBtn.addEventListener('click', () => {
    const query = elements.searchInput.value.trim();
    if (query) {
        switchView('search');
        searchSongs(query);
    }
});

elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.searchBtn.click();
});

document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(e.currentTarget.getAttribute('data-view'));
    });
});

// inicializacion

async function init() {
    if (!auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }
    const user = auth.getUser();
    document.getElementById('user-name').textContent = user.nombre || 'Usuario';
    appState.user = user;
    
    await fetchSongs();
    await fetchPlaylists(user.id);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
