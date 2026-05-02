let episodeCount = 1;
let isEditMode = false;
let editingId = null;

const listMode = document.getElementById('listMode');
const formMode = document.getElementById('formMode');
const listModeBtn = document.getElementById('listModeBtn');
const addModeBtn = document.getElementById('addModeBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');
const animeIdInput = document.getElementById('animeId');
const form = document.getElementById('animeForm');
const episodesContainer = document.getElementById('episodesContainer');
const addEpisodeBtn = document.getElementById('addEpisodeBtn');
const submitBtn = document.getElementById('submitBtn');
const previewBtn = document.getElementById('previewBtn');
const previewModal = document.getElementById('previewModal');
const closeModal = document.querySelector('.close');
const messageDiv = document.getElementById('message');
const searchInput = document.getElementById('searchAnime');
const animeListDiv = document.getElementById('animeList');

listModeBtn.addEventListener('click', () => {
    listModeBtn.classList.add('active');
    addModeBtn.classList.remove('active');
    listMode.style.display = 'block';
    formMode.style.display = 'none';
    loadAnimeList();
});

addModeBtn.addEventListener('click', () => {
    listModeBtn.classList.remove('active');
    addModeBtn.classList.add('active');
    listMode.style.display = 'none';
    formMode.style.display = 'block';
    resetForm();
    isEditMode = false;
    editingId = null;
    formTitle.innerText = '📝 Tambah Anime Baru';
    cancelEditBtn.style.display = 'none';
});

cancelEditBtn.addEventListener('click', () => {
    resetForm();
    isEditMode = false;
    editingId = null;
    formTitle.innerText = '📝 Tambah Anime Baru';
    cancelEditBtn.style.display = 'none';
    addModeBtn.click();
});

function resetForm() {
    document.getElementById('title').value = '';
    document.getElementById('cover').value = '';
    document.getElementById('synopsis').value = '';
    document.getElementById('genre').value = '';
    document.getElementById('studio').value = '';
    document.getElementById('rating').value = '';
    document.getElementById('views').value = '';
    document.getElementById('latestEpisode').value = '';
    document.getElementById('uploadDate').value = '';
    document.getElementById('scheduleDay').value = '';
    document.getElementById('scheduleStatus').value = '';
    document.getElementById('isTrending').checked = false;
    animeIdInput.value = '';
    
    episodesContainer.innerHTML = `
        <div class="episode-item" data-index="0">
            <h4>Episode 1</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Judul Episode</label>
                    <input type="text" class="episode-title" required>
                </div>
                <div class="form-group">
                    <label>Video URL</label>
                    <input type="url" class="episode-url" placeholder="https://..." required>
                </div>
            </div>
        </div>
    `;
    episodeCount = 1;
}

async function loadAnimeList() {
    animeListDiv.innerHTML = '<div class="loading">Memuat...</div>';
    try {
        const res = await fetch('/api/anime');
        const animeList = await res.json();
        renderAnimeList(animeList);
    } catch (err) {
        animeListDiv.innerHTML = '<div class="loading">Gagal memuat data</div>';
    }
}

function renderAnimeList(animeList) {
    if (!animeList || animeList.length === 0) {
        animeListDiv.innerHTML = '<div class="loading">Belum ada anime</div>';
        return;
    }
    
    animeListDiv.innerHTML = animeList.map(anime => `
        <div class="anime-card-admin">
            <div class="anime-card-left">
                <img src="${anime.cover}" onerror="this.src='https://placehold.co/60x85/1a1a1a/888?text=No+Image'" class="anime-card-img">
                <div class="anime-card-info">
                    <h3>${escapeHtml(anime.title)} ${anime.isTrending ? '🔥' : ''}</h3>
                    <p>⭐ ${anime.rating} | 👁️ ${anime.views} | Eps ${anime.latestEpisode}</p>
                    <p class="anime-genre">${anime.genre.join(', ')}</p>
                </div>
            </div>
            <div class="anime-card-actions">
                <button class="edit-btn" onclick="editAnime('${anime.id}')">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteAnime('${anime.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');
}

window.editAnime = async (id) => {
    try {
        const res = await fetch(`/api/anime/${id}`);
        const anime = await res.json();
        
        isEditMode = true;
        editingId = id;
        
        document.getElementById('title').value = anime.title;
        document.getElementById('cover').value = anime.cover;
        document.getElementById('synopsis').value = anime.synopsis;
        document.getElementById('genre').value = anime.genre.join(', ');
        document.getElementById('studio').value = anime.studio;
        document.getElementById('rating').value = anime.rating;
        document.getElementById('views').value = anime.views;
        document.getElementById('latestEpisode').value = anime.latestEpisode;
        document.getElementById('uploadDate').value = anime.uploadDate;
        document.getElementById('scheduleDay').value = anime.scheduleDay || '';
        document.getElementById('scheduleStatus').value = anime.scheduleStatus || '';
        document.getElementById('isTrending').checked = anime.isTrending || false;
        animeIdInput.value = anime.id;
        
        episodesContainer.innerHTML = '';
        episodeCount = 0;
        anime.episodes.forEach((ep, idx) => {
            episodeCount++;
            const episodeDiv = document.createElement('div');
            episodeDiv.className = 'episode-item';
            episodeDiv.innerHTML = `
                <h4>Episode ${ep.number}</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Judul Episode</label>
                        <input type="text" class="episode-title" value="${escapeHtml(ep.title)}" required>
                    </div>
                    <div class="form-group">
                        <label>Video URL</label>
                        <input type="url" class="episode-url" value="${ep.videoUrl}" required>
                    </div>
                </div>
                <button type="button" class="remove-episode" style="background:#e94560; border:none; padding:4px 8px; border-radius:6px; color:white; cursor:pointer; margin-top:8px;">🗑️ Hapus Episode</button>
            `;
            episodesContainer.appendChild(episodeDiv);
            episodeDiv.querySelector('.remove-episode').addEventListener('click', () => {
                episodeDiv.remove();
                renumberEpisodes();
            });
        });
        
        formTitle.innerText = '✏️ Edit Anime';
        cancelEditBtn.style.display = 'inline-block';
        listModeBtn.classList.remove('active');
        addModeBtn.classList.add('active');
        listMode.style.display = 'none';
        formMode.style.display = 'block';
    } catch (err) {
        showMessage('Gagal load data anime', 'error');
    }
};

window.deleteAnime = async (id) => {
    if (!confirm('Yakin ingin menghapus anime ini?')) return;
    try {
        const res = await fetch(`/api/anime/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
            showMessage(`✅ ${result.message}`, 'success');
            loadAnimeList();
        } else {
            showMessage(`❌ ${result.error}`, 'error');
        }
    } catch (err) {
        showMessage(`❌ Gagal: ${err.message}`, 'error');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

addEpisodeBtn.addEventListener('click', () => {
    episodeCount++;
    const episodeDiv = document.createElement('div');
    episodeDiv.className = 'episode-item';
    episodeDiv.innerHTML = `
        <h4>Episode ${episodeCount}</h4>
        <div class="form-row">
            <div class="form-group">
                <label>Judul Episode</label>
                <input type="text" class="episode-title" required>
            </div>
            <div class="form-group">
                <label>Video URL</label>
                <input type="url" class="episode-url" placeholder="https://..." required>
            </div>
        </div>
        <button type="button" class="remove-episode" style="background:#e94560; border:none; padding:4px 8px; border-radius:6px; color:white; cursor:pointer; margin-top:8px;">🗑️ Hapus Episode</button>
    `;
    episodesContainer.appendChild(episodeDiv);
    episodeDiv.querySelector('.remove-episode').addEventListener('click', () => {
        episodeDiv.remove();
        renumberEpisodes();
    });
});

function renumberEpisodes() {
    const episodes = document.querySelectorAll('.episode-item');
    episodes.forEach((ep, idx) => {
        ep.querySelector('h4').innerText = `Episode ${idx + 1}`;
    });
    episodeCount = episodes.length;
}

function getFormData() {
    const genreRaw = document.getElementById('genre').value;
    const genre = genreRaw.split(',').map(g => g.trim()).filter(g => g);
    
    const episodes = [];
    document.querySelectorAll('.episode-item').forEach((ep, idx) => {
        const titleInput = ep.querySelector('.episode-title');
        const urlInput = ep.querySelector('.episode-url');
        if (titleInput && urlInput && titleInput.value && urlInput.value) {
            episodes.push({
                number: idx + 1,
                title: titleInput.value,
                videoUrl: urlInput.value
            });
        }
    });
    
    return {
        title: document.getElementById('title').value,
        cover: document.getElementById('cover').value,
        synopsis: document.getElementById('synopsis').value,
        genre: genre,
        studio: document.getElementById('studio').value,
        rating: parseFloat(document.getElementById('rating').value),
        views: document.getElementById('views').value,
        latestEpisode: parseInt(document.getElementById('latestEpisode').value),
        uploadDate: document.getElementById('uploadDate').value,
        scheduleDay: document.getElementById('scheduleDay').value || "",
        scheduleStatus: document.getElementById('scheduleStatus').value || "",
        isTrending: document.getElementById('isTrending').checked,
        episodes: episodes
    };
}

previewBtn.addEventListener('click', () => {
    const data = getFormData();
    document.getElementById('previewJson').innerText = JSON.stringify(data, null, 2);
    previewModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
    previewModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === previewModal) previewModal.style.display = 'none';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const animeData = getFormData();
    
    if (animeData.episodes.length === 0) {
        showMessage('Minimal harus ada 1 episode!', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerText = 'Menyimpan...';
    
    try {
        let url = '/api/anime';
        let method = 'POST';
        if (isEditMode && editingId) {
            url = `/api/anime/${editingId}`;
            method = 'PUT';
        }
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(animeData)
        });
        
        const result = await res.json();
        if (res.ok) {
            showMessage(`✅ ${result.message}`, 'success');
            resetForm();
            isEditMode = false;
            editingId = null;
            formTitle.innerText = '📝 Tambah Anime Baru';
            cancelEditBtn.style.display = 'none';
            loadAnimeList();
            listModeBtn.click();
        } else {
            showMessage(`❌ Error: ${result.error}`, 'error');
        }
    } catch (err) {
        showMessage(`❌ Gagal: ${err.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = isEditMode ? '✏️ Update Anime' : '✨ Tambah Anime';
    }
});

searchInput.addEventListener('input', async () => {
    const query = searchInput.value.toLowerCase();
    const res = await fetch('/api/anime');
    let animeList = await res.json();
    if (query) animeList = animeList.filter(a => a.title.toLowerCase().includes(query));
    renderAnimeList(animeList);
});

function showMessage(msg, type) {
    messageDiv.className = `message ${type}`;
    messageDiv.innerText = msg;
    setTimeout(() => messageDiv.className = 'message', 5000);
}

// ========== MAINTENANCE MODE ==========
async function checkMaintenanceStatus() {
    try {
        const res = await fetch('/api/maintenance/status');
        const data = await res.json();
        const statusDiv = document.getElementById('maintenanceStatus');
        if (statusDiv) {
            if (data.maintenance_mode) {
                statusDiv.innerHTML = '<span style="color:#e94560;">🔴 Mode Maintenance AKTIF - Website tidak bisa diakses publik</span>';
            } else {
                statusDiv.innerHTML = '<span style="color:#00b894;">🟢 Mode Maintenance NONAKTIF - Website normal</span>';
            }
        }
    } catch(e) { console.error('Gagal cek maintenance status:', e); }
}

const maintenanceOnBtn = document.getElementById('maintenanceOnBtn');
const maintenanceOffBtn = document.getElementById('maintenanceOffBtn');
const updateCodeBtn = document.getElementById('updateCodeBtn');

if (maintenanceOnBtn) {
    maintenanceOnBtn.addEventListener('click', async () => {
        const accessCode = prompt('Masukkan kode akses maintenance:');
        if (!accessCode) return;
        try {
            const res = await fetch('/api/maintenance/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'on', accessCode: accessCode })
            });
            const data = await res.json();
            if (res.ok) {
                alert('✅ Maintenance mode AKTIF');
                checkMaintenanceStatus();
            } else {
                alert('❌ ' + data.error);
            }
        } catch(e) { alert('Error: ' + e.message); }
    });
}

if (maintenanceOffBtn) {
    maintenanceOffBtn.addEventListener('click', async () => {
        const accessCode = prompt('Masukkan kode akses maintenance:');
        if (!accessCode) return;
        try {
            const res = await fetch('/api/maintenance/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'off', accessCode: accessCode })
            });
            const data = await res.json();
            if (res.ok) {
                alert('✅ Maintenance mode NONAKTIF');
                checkMaintenanceStatus();
            } else {
                alert('❌ ' + data.error);
            }
        } catch(e) { alert('Error: ' + e.message); }
    });
}

if (updateCodeBtn) {
    updateCodeBtn.addEventListener('click', async () => {
        const oldCode = document.getElementById('oldAccessCode').value;
        const newCode = document.getElementById('newAccessCode').value;
        
        if (!oldCode || !newCode) {
            alert('Isi kode akses lama dan baru');
            return;
        }
        
        if (newCode.length < 4) {
            alert('Kode akses baru minimal 4 karakter');
            return;
        }
        
        try {
            const res = await fetch('/api/maintenance/update-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldCode: oldCode, newCode: newCode })
            });
            const data = await res.json();
            if (res.ok) {
                alert('✅ ' + data.message);
                document.getElementById('oldAccessCode').value = '';
                document.getElementById('newAccessCode').value = '';
            } else {
                alert('❌ ' + data.error);
            }
        } catch(e) { alert('Error: ' + e.message); }
    });
}

// Panggil saat load
checkMaintenanceStatus();
loadAnimeList();
