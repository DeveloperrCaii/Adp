let episodeCount = 1;
let isEditMode = false;
let editingId = null;
let allAnimeData = [];
let selectedAnimeIds = new Set();

// DOM Elements
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
const statusFilter = document.getElementById('statusFilter');
const dayFilter = document.getElementById('dayFilter');
const sortFilter = document.getElementById('sortFilter');
const animeListDiv = document.getElementById('animeList');
const statsInfo = document.getElementById('statsInfo');
const bulkBar = document.getElementById('bulkBar');
const selectedCountSpan = document.getElementById('selectedCount');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const bulkStatusSelect = document.getElementById('bulkStatusSelect');
const bulkDaySelect = document.getElementById('bulkDaySelect');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

// ========== MODE SWITCH ==========
listModeBtn.addEventListener('click', () => {
    listModeBtn.classList.add('active');
    addModeBtn.classList.remove('active');
    listMode.style.display = 'block';
    formMode.style.display = 'none';
    loadAnimeList();
    clearSelection();
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
    clearSelection();
});

cancelEditBtn.addEventListener('click', () => {
    resetForm();
    isEditMode = false;
    editingId = null;
    formTitle.innerText = '📝 Tambah Anime Baru';
    cancelEditBtn.style.display = 'none';
    addModeBtn.click();
});

// ========== FORM FUNCTIONS ==========
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
    
    const scheduleDay = document.getElementById('scheduleDay').value;
    const scheduleStatus = document.getElementById('scheduleStatus').value;
    
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
        scheduleDay: scheduleDay || "",
        scheduleStatus: scheduleStatus || "",
        isTrending: document.getElementById('isTrending').checked,
        episodes: episodes
    };
}

// ========== LOAD AND DISPLAY ANIME ==========
async function loadAnimeList() {
    animeListDiv.innerHTML = '<div class="loading">Memuat...</div>';
    try {
        const res = await fetch('/api/anime');
        allAnimeData = await res.json();
        applyFiltersAndSort();
    } catch (err) {
        animeListDiv.innerHTML = '<div class="loading">Gagal memuat data</div>';
    }
}

function getStatusText(anime) {
    if (!anime.scheduleDay || anime.scheduleDay === '') {
        return { text: '🏁 Tamat', class: 'status-tamat' };
    }
    if (anime.scheduleStatus === 'Menunggu Update') {
        return { text: '⏳ Menunggu Update', class: 'status-waiting' };
    }
    return { text: '✅ Sudah Tayang', class: 'status-tayang' };
}

function getDayOrder(day) {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    return days.indexOf(day);
}

function applyFiltersAndSort() {
    let filtered = [...allAnimeData];
    
    // Filter search
    const searchQuery = searchInput?.value.toLowerCase() || '';
    if (searchQuery) {
        filtered = filtered.filter(anime => anime.title.toLowerCase().includes(searchQuery));
    }
    
    // Filter status
    const statusValue = statusFilter?.value || 'all';
    if (statusValue !== 'all') {
        if (statusValue === 'tamat') {
            filtered = filtered.filter(anime => !anime.scheduleDay || anime.scheduleDay === '');
        } else {
            filtered = filtered.filter(anime => anime.scheduleStatus === statusValue);
        }
    }
    
    // Filter hari
    const dayValue = dayFilter?.value || 'all';
    if (dayValue !== 'all') {
        filtered = filtered.filter(anime => anime.scheduleDay === dayValue);
    }
    
    // Sort
    const sortValue = sortFilter?.value || 'az';
    if (sortValue === 'az') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortValue === 'za') {
        filtered.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortValue === 'terbaru') {
        filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } else if (sortValue === 'terlama') {
        filtered.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
    } else if (sortValue === 'hari') {
        filtered.sort((a, b) => {
            const orderA = getDayOrder(a.scheduleDay);
            const orderB = getDayOrder(b.scheduleDay);
            if (orderA === -1 && orderB === -1) return 0;
            if (orderA === -1) return 1;
            if (orderB === -1) return -1;
            return orderA - orderB;
        });
    }
    
    // Update stats
    const totalAnime = allAnimeData.length;
    const tamatCount = allAnimeData.filter(a => !a.scheduleDay || a.scheduleDay === '').length;
    const tayangCount = allAnimeData.filter(a => a.scheduleStatus === 'Sudah Tayang' && a.scheduleDay).length;
    const waitingCount = allAnimeData.filter(a => a.scheduleStatus === 'Menunggu Update' && a.scheduleDay).length;
    
    statsInfo.innerHTML = `
        <span>📺 Total Anime: <span>${totalAnime}</span></span>
        <span>✅ Sudah Tayang: <span>${tayangCount}</span></span>
        <span>⏳ Menunggu Update: <span>${waitingCount}</span></span>
        <span>🏁 Tamat: <span>${tamatCount}</span></span>
    `;
    
    renderAnimeList(filtered);
}

function renderAnimeList(animeList) {
    if (!animeList || animeList.length === 0) {
        animeListDiv.innerHTML = '<div class="loading">Tidak ada anime ditemukan</div>';
        return;
    }
    
    animeListDiv.innerHTML = animeList.map(anime => {
        const status = getStatusText(anime);
        const uploadDate = new Date(anime.uploadDate).toLocaleDateString('id-ID');
        const isSelected = selectedAnimeIds.has(anime.id);
        const dayDisplay = anime.scheduleDay ? `📆 Tayang: ${anime.scheduleDay}` : '🏁 Tamat';
        
        return `
        <div class="anime-card-admin ${isSelected ? 'selected' : ''}" data-id="${anime.id}">
            <div class="checkbox-col">
                <input type="checkbox" class="anime-checkbox" data-id="${anime.id}" ${isSelected ? 'checked' : ''}>
            </div>
            <div class="anime-card-left">
                <img src="${anime.cover}" onerror="this.src='https://placehold.co/60x85/1a1a1a/888?text=No+Image'" class="anime-card-img">
                <div class="anime-card-info">
                    <h3>
                        ${escapeHtml(anime.title)} ${anime.isTrending ? '🔥' : ''}
                        <span class="status-badge ${status.class}">${status.text}</span>
                    </h3>
                    <p>⭐ ${anime.rating} | 👁️ ${anime.views} | Eps ${anime.latestEpisode}</p>
                    <p class="upload-date">📅 Upload: ${uploadDate}</p>
                    <p class="schedule-day-info">${dayDisplay}</p>
                    <p class="anime-genre">${anime.genre.slice(0, 3).join(', ')}</p>
                </div>
            </div>
            <div class="anime-card-actions">
                <button class="edit-btn" onclick="editAnime('${anime.id}')">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteAnime('${anime.id}')">🗑️ Hapus</button>
            </div>
        </div>
    `}).join('');
    
    // Attach checkbox event listeners
    document.querySelectorAll('.anime-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                selectedAnimeIds.add(id);
            } else {
                selectedAnimeIds.delete(id);
            }
            updateSelectionUI();
        });
    });
    
    updateSelectionUI();
}

function updateSelectionUI() {
    const count = selectedAnimeIds.size;
    if (count > 0) {
        bulkBar.style.display = 'flex';
        selectedCountSpan.innerText = count;
    } else {
        bulkBar.style.display = 'none';
    }
    
    // Update checkbox di cards
    document.querySelectorAll('.anime-card-admin').forEach(card => {
        const id = card.dataset.id;
        if (selectedAnimeIds.has(id)) {
            card.classList.add('selected');
            const cb = card.querySelector('.anime-checkbox');
            if (cb) cb.checked = true;
        } else {
            card.classList.remove('selected');
            const cb = card.querySelector('.anime-checkbox');
            if (cb) cb.checked = false;
        }
    });
}

function clearSelection() {
    selectedAnimeIds.clear();
    updateSelectionUI();
}

function selectAll() {
    const visibleCards = document.querySelectorAll('.anime-card-admin');
    visibleCards.forEach(card => {
        const id = card.dataset.id;
        if (id) selectedAnimeIds.add(id);
    });
    updateSelectionUI();
}

function deselectAll() {
    selectedAnimeIds.clear();
    updateSelectionUI();
}

// ========== BULK OPERATIONS ==========
async function bulkUpdateStatus() {
    const newStatus = bulkStatusSelect.value;
    if (!newStatus) return;
    
    if (selectedAnimeIds.size === 0) {
        showMessage('Pilih anime terlebih dahulu', 'error');
        return;
    }
    
    if (!confirm(`Ubah status ${selectedAnimeIds.size} anime menjadi "${newStatus}"?`)) return;
    
    const updatedAnime = [];
    for (const anime of allAnimeData) {
        if (selectedAnimeIds.has(anime.id)) {
            const updated = { ...anime };
            if (newStatus === 'tamat') {
                updated.scheduleDay = "";
                updated.scheduleStatus = "";
            } else {
                if (!updated.scheduleDay) updated.scheduleDay = "Senin";
                updated.scheduleStatus = newStatus;
            }
            updatedAnime.push(updated);
        } else {
            updatedAnime.push(anime);
        }
    }
    
    await saveBulkUpdate(updatedAnime, `Bulk update status ke ${newStatus} untuk ${selectedAnimeIds.size} anime`);
    bulkStatusSelect.value = "";
}

async function bulkUpdateDay() {
    const newDay = bulkDaySelect.value;
    if (newDay === "") {
        // Kosongkan (tamat)
        if (!confirm(`Tandai ${selectedAnimeIds.size} anime sebagai TAMAT?`)) return;
        
        const updatedAnime = [];
        for (const anime of allAnimeData) {
            if (selectedAnimeIds.has(anime.id)) {
                const updated = { ...anime };
                updated.scheduleDay = "";
                updated.scheduleStatus = "";
                updatedAnime.push(updated);
            } else {
                updatedAnime.push(anime);
            }
        }
        await saveBulkUpdate(updatedAnime, `Bulk set tamat untuk ${selectedAnimeIds.size} anime`);
    } else if (newDay) {
        if (!confirm(`Ubah hari tayang ${selectedAnimeIds.size} anime menjadi ${newDay}?`)) return;
        
        const updatedAnime = [];
        for (const anime of allAnimeData) {
            if (selectedAnimeIds.has(anime.id)) {
                const updated = { ...anime };
                updated.scheduleDay = newDay;
                if (!updated.scheduleStatus) updated.scheduleStatus = "Sudah Tayang";
                updatedAnime.push(updated);
            } else {
                updatedAnime.push(anime);
            }
        }
        await saveBulkUpdate(updatedAnime, `Bulk update hari ke ${newDay} untuk ${selectedAnimeIds.size} anime`);
    }
    bulkDaySelect.value = "";
}

async function bulkDelete() {
    if (selectedAnimeIds.size === 0) {
        showMessage('Pilih anime terlebih dahulu', 'error');
        return;
    }
    
    const animeTitles = allAnimeData
        .filter(a => selectedAnimeIds.has(a.id))
        .map(a => a.title)
        .join(', ');
    
    if (!confirm(`⚠️ HAPUS PERMANEN ${selectedAnimeIds.size} anime:\n${animeTitles}\n\nYakin ingin menghapus?`)) return;
    
    const updatedAnime = allAnimeData.filter(a => !selectedAnimeIds.has(a.id));
    await saveBulkUpdate(updatedAnime, `Bulk delete ${selectedAnimeIds.size} anime`);
    clearSelection();
}

async function saveBulkUpdate(updatedData, commitMessage) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Menyimpan...';
    
    try {
        // Update satu per satu karena API hanya support single update
        for (const anime of updatedData) {
            const existingAnime = allAnimeData.find(a => a.id === anime.id);
            if (JSON.stringify(existingAnime) !== JSON.stringify(anime)) {
                await fetch(`/api/anime/${anime.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(anime)
                });
            }
        }
        
        showMessage(`✅ Berhasil update ${selectedAnimeIds.size} anime`, 'success');
        await loadAnimeList();
    } catch (err) {
        showMessage(`❌ Gagal: ${err.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = isEditMode ? '✏️ Update Anime' : '✨ Tambah Anime';
    }
}

// ========== SINGLE ANIME OPERATIONS ==========
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
        clearSelection();
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

// ========== EPISODE MANAGEMENT ==========
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

// ========== FORM SUBMIT ==========
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

// ========== UTILITIES ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showMessage(msg, type) {
    messageDiv.className = `message ${type}`;
    messageDiv.innerText = msg;
    setTimeout(() => messageDiv.className = 'message', 5000);
}

// ========== EVENT LISTENERS ==========
searchInput.addEventListener('input', applyFiltersAndSort);
statusFilter.addEventListener('change', applyFiltersAndSort);
dayFilter.addEventListener('change', applyFiltersAndSort);
sortFilter.addEventListener('change', applyFiltersAndSort);

selectAllBtn.addEventListener('click', selectAll);
deselectAllBtn.addEventListener('click', deselectAll);
bulkStatusSelect.addEventListener('change', bulkUpdateStatus);
bulkDaySelect.addEventListener('change', bulkUpdateDay);
bulkDeleteBtn.addEventListener('click', bulkDelete);

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

// Initialize
checkMaintenanceStatus();
loadAnimeList();
