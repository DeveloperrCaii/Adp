import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ========== KONFIGURASI ==========
// Repository untuk all-anime.json
const ANIME_REPO = process.env.ANIME_REPO || 'DeveloperrCaii/DbAnime';
const ANIME_FILE_PATH = process.env.ANIME_FILE_PATH || 'all-anime.json';
// GITHUB API URL untuk READ (bukan RAW)
const ANIME_API_READ_URL = `https://api.github.com/repos/${ANIME_REPO}/contents/${ANIME_FILE_PATH}`;
// GITHUB API URL untuk WRITE (sama)
const ANIME_API_WRITE_URL = `https://api.github.com/repos/${ANIME_REPO}/contents/${ANIME_FILE_PATH}`;

// Repository untuk maintenance.json
const MAINTENANCE_REPO = process.env.MAINTENANCE_REPO || 'DeveloperrCaii/Streaming';
const MAINTENANCE_FILE_PATH = process.env.MAINTENANCE_FILE_PATH || 'frontend/data/maintenance.json';
const MAINTENANCE_API_URL = `https://api.github.com/repos/${MAINTENANCE_REPO}/contents/${MAINTENANCE_FILE_PATH}`;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
};

// Cache untuk mengurangi request (opsional)
let animeCache = null;
let animeCacheTime = 0;
const CACHE_TTL = 3000; // 3 detik cache

// ========== FUNCTIONS FOR ALL-ANIME ==========
// BACA via GitHub API (langsung, tanpa cache CDN)
async function getAnimeFileRead(forceFresh = false) {
    const now = Date.now();
    if (!forceFresh && animeCache && (now - animeCacheTime) < CACHE_TTL) {
        console.log('📦 Menggunakan cache anime (3 detik)');
        return animeCache;
    }
    
    try {
        console.log('📡 Mengambil dari GitHub API:', ANIME_API_READ_URL);
        
        const res = await axios.get(ANIME_API_READ_URL, { 
            headers: githubHeaders,
            // Header untuk mencegah cache
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        
        // Decode content dari base64
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        const data = JSON.parse(content);
        
        animeCache = { data: data };
        animeCacheTime = now;
        
        console.log(`✅ Berhasil mengambil ${data.length} anime dari GitHub API`);
        return { data: data };
    } catch (err) {
        console.error('❌ Gagal baca dari GitHub API:', err.message);
        if (animeCache) return animeCache;
        throw new Error('Gagal mengambil data anime');
    }
}

// TULIS via GitHub API
async function getAnimeFileForWrite() {
    try {
        const res = await axios.get(ANIME_API_WRITE_URL, { headers: githubHeaders });
        return {
            content: Buffer.from(res.data.content, 'base64').toString('utf8'),
            sha: res.data.sha
        };
    } catch (err) {
        console.error('❌ Gagal ambil file untuk write:', err.message);
        throw new Error('Gagal mengambil data anime untuk write');
    }
}

async function updateAnimeFile(content, sha, commitMessage) {
    const updatedContent = Buffer.from(content, 'utf8').toString('base64');
    const payload = {
        message: commitMessage,
        content: updatedContent,
        sha: sha,
        branch: 'main'
    };
    const res = await axios.put(ANIME_API_WRITE_URL, payload, { headers: githubHeaders });
    
    // Clear cache setelah update
    animeCache = null;
    animeCacheTime = 0;
    
    console.log('✅ File berhasil diupdate ke GitHub');
    return res.data;
}

// ========== FUNCTIONS FOR MAINTENANCE ==========
async function getMaintenanceFileRead() {
    try {
        const res = await axios.get(MAINTENANCE_API_URL, { headers: githubHeaders });
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        const json = JSON.parse(content);
        return { data: json };
    } catch (err) {
        console.log('⚠️ maintenance.json belum ada, pakai default');
        return { data: { maintenance_mode: false, access_code: 'LanzAdminAnime' } };
    }
}

async function getMaintenanceFileForWrite() {
    try {
        const res = await axios.get(MAINTENANCE_API_URL, { headers: githubHeaders });
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        const json = JSON.parse(content);
        return { data: json, sha: res.data.sha };
    } catch (err) {
        const defaultData = { maintenance_mode: false, access_code: 'LanzAdminAnime' };
        return { data: defaultData, sha: null };
    }
}

async function updateMaintenanceFile(data, sha) {
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
    const payload = {
        message: 'Update maintenance data',
        content: content,
        branch: 'main'
    };
    if (sha) payload.sha = sha;
    const res = await axios.put(MAINTENANCE_API_URL, payload, { headers: githubHeaders });
    return res.data;
}

// ========== ENDPOINTS ==========

// GET semua anime (via GitHub API, realtime)
app.get('/api/anime', async (req, res) => {
    try {
        const forceFresh = req.query.fresh === 'true';
        const { data } = await getAnimeFileRead(forceFresh);
        
        // Header anti-cache untuk browser
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.json(data);
    } catch (err) {
        console.error('Error GET /api/anime:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET anime by ID
app.get('/api/anime/:id', async (req, res) => {
    try {
        const { data } = await getAnimeFileRead();
        const anime = data.find(a => a.id === req.params.id);
        if (!anime) return res.status(404).json({ error: 'Anime tidak ditemukan' });
        res.json(anime);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST tambah anime
app.post('/api/anime', async (req, res) => {
    try {
        const newAnime = req.body;
        
        const requiredFields = ['title', 'cover', 'synopsis', 'genre', 'studio', 'rating', 'views', 'latestEpisode', 'uploadDate', 'episodes'];
        for (const field of requiredFields) {
            if (!newAnime[field] || (typeof newAnime[field] === 'string' && newAnime[field].trim() === '')) {
                return res.status(400).json({ error: `Field '${field}' wajib diisi` });
            }
        }
        
        if (!newAnime.scheduleDay || newAnime.scheduleDay === '') delete newAnime.scheduleDay;
        if (!newAnime.scheduleStatus || newAnime.scheduleStatus === '') delete newAnime.scheduleStatus;
        if (newAnime.isTrending === undefined) newAnime.isTrending = false;
        
        const { content, sha } = await getAnimeFileForWrite();
        let animeList = JSON.parse(content);
        
        const maxId = Math.max(...animeList.map(a => parseInt(a.id)), 0);
        newAnime.id = (maxId + 1).toString();
        
        animeList.push(newAnime);
        await updateAnimeFile(JSON.stringify(animeList, null, 2), sha, `Add anime: ${newAnime.title}`);
        
        res.json({ success: true, id: newAnime.id, message: 'Anime berhasil ditambahkan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT edit anime
app.put('/api/anime/:id', async (req, res) => {
    try {
        const animeId = req.params.id;
        let updatedAnime = req.body;
        
        const requiredFields = ['title', 'cover', 'synopsis', 'genre', 'studio', 'rating', 'views', 'latestEpisode', 'uploadDate', 'episodes'];
        for (const field of requiredFields) {
            if (!updatedAnime[field] || (typeof updatedAnime[field] === 'string' && updatedAnime[field].trim() === '')) {
                return res.status(400).json({ error: `Field '${field}' wajib diisi` });
            }
        }
        
        if (!updatedAnime.scheduleDay || updatedAnime.scheduleDay === '') delete updatedAnime.scheduleDay;
        if (!updatedAnime.scheduleStatus || updatedAnime.scheduleStatus === '') delete updatedAnime.scheduleStatus;
        if (updatedAnime.isTrending === undefined) updatedAnime.isTrending = false;
        
        const { content, sha } = await getAnimeFileForWrite();
        let animeList = JSON.parse(content);
        
        const index = animeList.findIndex(a => a.id === animeId);
        if (index === -1) return res.status(404).json({ error: 'Anime tidak ditemukan' });
        
        updatedAnime.id = animeId;
        animeList[index] = updatedAnime;
        
        await updateAnimeFile(JSON.stringify(animeList, null, 2), sha, `Edit anime: ${updatedAnime.title}`);
        
        res.json({ success: true, message: 'Anime berhasil diupdate' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE anime
app.delete('/api/anime/:id', async (req, res) => {
    try {
        const animeId = req.params.id;
        const { content, sha } = await getAnimeFileForWrite();
        let animeList = JSON.parse(content);
        
        const deletedAnime = animeList.find(a => a.id === animeId);
        if (!deletedAnime) return res.status(404).json({ error: 'Anime tidak ditemukan' });
        
        const newAnimeList = animeList.filter(a => a.id !== animeId);
        await updateAnimeFile(JSON.stringify(newAnimeList, null, 2), sha, `Delete anime: ${deletedAnime.title}`);
        res.json({ success: true, message: 'Anime berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== MAINTENANCE MODE ENDPOINTS ==========

app.get('/api/maintenance/status', async (req, res) => {
    try {
        const { data } = await getMaintenanceFileRead();
        res.json({ 
            maintenance_mode: data.maintenance_mode,
            access_code_exists: !!data.access_code
        });
    } catch (err) {
        res.json({ maintenance_mode: false });
    }
});

app.post('/api/maintenance/toggle', async (req, res) => {
    try {
        const { action, accessCode } = req.body;
        const { data, sha } = await getMaintenanceFileForWrite();
        
        if (accessCode !== data.access_code) {
            return res.status(401).json({ error: 'Kode akses salah' });
        }
        
        data.maintenance_mode = (action === 'on');
        await updateMaintenanceFile(data, sha);
        
        res.json({ success: true, maintenance_mode: data.maintenance_mode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/maintenance/update-code', async (req, res) => {
    try {
        const { oldCode, newCode } = req.body;
        const { data, sha } = await getMaintenanceFileForWrite();
        
        if (oldCode !== data.access_code) {
            return res.status(401).json({ error: 'Kode akses lama salah' });
        }
        
        if (!newCode || newCode.length < 4) {
            return res.status(400).json({ error: 'Kode akses baru minimal 4 karakter' });
        }
        
        data.access_code = newCode;
        await updateMaintenanceFile(data, sha);
        
        res.json({ success: true, message: 'Kode akses berhasil diubah' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch all untuk SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default app;
