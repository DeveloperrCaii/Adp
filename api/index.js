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

// ========== KONFIGURASI 2 REPOSITORY BERBEDA ==========
// Repository 1: DbAnime (untuk all-anime.json)
const ANIME_REPO = process.env.ANIME_REPO || 'DeveloperrCaii/DbAnime';
const ANIME_FILE_PATH = process.env.ANIME_FILE_PATH || 'all-anime.json';
const ANIME_API_URL = `https://api.github.com/repos/${ANIME_REPO}/contents/${ANIME_FILE_PATH}`;

// Repository 2: Streaming (untuk maintenance.json - SAMA dengan admin panel)
const MAINTENANCE_REPO = process.env.MAINTENANCE_REPO || 'DeveloperrCaii/Streaming';
const MAINTENANCE_FILE_PATH = process.env.MAINTENANCE_FILE_PATH || 'frontend/data/maintenance.json';
const MAINTENANCE_API_URL = `https://api.github.com/repos/${MAINTENANCE_REPO}/contents/${MAINTENANCE_FILE_PATH}`;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
};

// ========== FUNCTIONS FOR ALL-ANIME (Repository DbAnime) ==========
async function getAnimeFile() {
    try {
        const res = await axios.get(ANIME_API_URL, { headers: githubHeaders });
        return {
            content: Buffer.from(res.data.content, 'base64').toString('utf8'),
            sha: res.data.sha
        };
    } catch (err) {
        console.error('Gagal ambil all-anime.json dari DbAnime:', err.message);
        throw new Error('Gagal mengambil data anime dari repository DbAnime');
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
    const res = await axios.put(ANIME_API_URL, payload, { headers: githubHeaders });
    return res.data;
}

// ========== FUNCTIONS FOR MAINTENANCE (Repository Streaming - SAMA dengan admin panel) ==========
async function getMaintenanceFile() {
    try {
        const res = await axios.get(MAINTENANCE_API_URL, { headers: githubHeaders });
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        const json = JSON.parse(content);
        return { data: json, sha: res.data.sha };
    } catch (err) {
        // Jika file belum ada, buat default
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

// ========== ENDPOINTS FOR ALL-ANIME (ke DbAnime repo) ==========

// GET semua anime
app.get('/api/anime', async (req, res) => {
    try {
        const { content } = await getAnimeFile();
        res.json(JSON.parse(content));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET anime by ID
app.get('/api/anime/:id', async (req, res) => {
    try {
        const { content } = await getAnimeFile();
        const animeList = JSON.parse(content);
        const anime = animeList.find(a => a.id === req.params.id);
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
        
        const { content, sha } = await getAnimeFile();
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
        
        const { content, sha } = await getAnimeFile();
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
        const { content, sha } = await getAnimeFile();
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

// ========== MAINTENANCE MODE ENDPOINTS (ke Streaming repo - SAMA dengan admin panel) ==========

// GET status maintenance
app.get('/api/maintenance/status', async (req, res) => {
    try {
        const { data } = await getMaintenanceFile();
        res.json({ 
            maintenance_mode: data.maintenance_mode,
            access_code_exists: !!data.access_code
        });
    } catch (err) {
        res.json({ maintenance_mode: false });
    }
});

// POST toggle maintenance
app.post('/api/maintenance/toggle', async (req, res) => {
    try {
        const { action, accessCode } = req.body;
        const { data, sha } = await getMaintenanceFile();
        
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

// POST update access code
app.post('/api/maintenance/update-code', async (req, res) => {
    try {
        const { oldCode, newCode } = req.body;
        const { data, sha } = await getMaintenanceFile();
        
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
