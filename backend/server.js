import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8000;

// ==================== HELPER FUNCTIONS ====================
// Token helper functions
function generateToken(user) {
    const payload = {
        userId: user.id || 0,
        username: user.name,
        role: 'admin',
        timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifySimpleToken(token) {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        const tokenAge = Date.now() - decoded.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 jam
        return tokenAge <= maxAge ? decoded : null;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Authentication middleware
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak ditemukan. Silakan login kembali.' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = verifySimpleToken(token);
        
        if (!decoded) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak valid atau telah expired. Silakan login kembali.' 
            });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Middleware auth error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Token tidak valid' 
        });
    }
};

// Validation function
function validateInput(nama, sandi) {
    let isValid = true;
    
    if (!nama) {
        isValid = false;
    }
    
    if (!sandi || !/^\d{6}$/.test(sandi)) {
        isValid = false;
    }
    
    return isValid;
}

// Simulate API call (for testing)
async function simulateAPICall(nama, sandi) {
    try {
        // Simulasi delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Demo credentials
        const demoCredentials = [
            { username: 'admin', password: '123456' },
            { username: 'superadmin', password: '654321' },
            { username: 'operator', password: '000000' }
        ];
        
        return demoCredentials.some(cred => 
            cred.username === nama && cred.password === sandi
        );
    } catch (error) {
        console.error('API simulation error:', error);
        return false;
    }
}

// Save session function (for reference - ini digunakan di frontend)
function saveSession(adminName, apiResponse = null) {
    // Ini fungsi untuk frontend, hanya sebagai reference
    console.log('Session saved for:', adminName);
}

// ==================== MIDDLEWARE ====================
// CORS Configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:8000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});


// ==================== DATABASE CONFIGURATION ====================
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'diabetes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Helper function for database queries
async function query(sql, params = []) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw new Error(`Database error: ${error.message}`);
    } finally {
        if (connection) connection.release();
    }
}

// ==================== AUTH ROUTES ====================
// GET /api/auth/login (untuk debugging)
app.get('/api/auth/login', (req, res) => {
    res.json({
        message: 'Login endpoint',
        note: 'Use POST method to login',
        example: {
            method: 'POST',
            url: '/api/auth/login',
            headers: { 'Content-Type': 'application/json' },
            body: { username: 'admin', password: 'your_password' }
        },
        available_methods: ['POST']
    });
});

// POST /api/auth/login (login utama)
app.post('/api/auth/login', async (req, res) => {
    console.log('📥 POST Login request received');
    console.log('Request body:', req.body);
    
    try {
        const { username, password } = req.body;
        
        // Validasi input menggunakan validateInput function
        if (!validateInput(username, password)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username harus diisi dan password harus 6 digit angka' 
            });
        }
        
        console.log('🔍 Checking admin in database...');
        
        // Cek di tabel admin
        const admins = await query(
            'SELECT * FROM admin WHERE name = ? AND sandi = ?', 
            [username, password]
        );
        
        console.log(`🔍 Found ${admins.length} admin(s) with credentials`);
        
        if (admins.length === 0) {
            // Optional: Fallback ke simulated API untuk testing
            console.log('⚠️ No admin found in DB, checking simulated API...');
            const simulatedResult = await simulateAPICall(username, password);
            
            if (simulatedResult) {
                console.log('✅ Login successful via simulation');
                const token = generateToken({ id: 0, name: username });
                
                return res.json({
                    success: true,
                    message: 'Login berhasil (simulated)',
                    user: {
                        id: 0,
                        name: username,
                        role: 'admin'
                    },
                    token: token
                });
            }
            
            console.log('❌ Invalid credentials');
            return res.status(401).json({ 
                success: false, 
                message: 'Username atau password salah' 
            });
        }
        
        const admin = admins[0];
        console.log('✅ Login successful for admin:', admin.name);
        
        // Generate token
        const token = generateToken(admin);
        
        res.json({
            success: true,
            message: 'Login berhasil',
            user: {
                id: admin.id || 0,
                name: admin.name,
                role: 'admin'
            },
            token: token
        });
        
    } catch (error) {
        console.error('💥 Login error:', error);
        
        // Handle specific database errors
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ 
                success: false, 
                message: 'Tabel admin tidak ditemukan di database' 
            });
        }
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            return res.status(500).json({ 
                success: false, 
                message: 'Akses database ditolak' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server: ' + error.message 
        });
    }
});

// Get current user info
app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user,
            message: 'Session valid'
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', verifyToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logout berhasil'
    });
});

// ==================== PROTECTED ROUTES ====================
// Middleware untuk melindungi semua routes di bawah
app.use('/api/users', verifyToken);
app.use('/api/symptoms', verifyToken);
app.use('/api/recommendations', verifyToken);
app.use('/api/diagnoses', verifyToken);
app.use('/api/user_symptoms', verifyToken);

// ==================== USERS ROUTES ====================
// GET all users
app.get('/api/users', async (req, res) => {
    try {
        console.log('📋 Fetching users by:', req.user?.username);
        const users = await query(`
            SELECT * FROM users ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const users = await query('SELECT * FROM users WHERE id = ?', [id]);
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// CREATE new user
app.post('/api/users', async (req, res) => {
    try {
        const { nama_lengkap, usia, jenis_kelamin, riwayat_keluarga } = req.body;
        
        // Validasi input
        if (!nama_lengkap || !usia || !jenis_kelamin || !riwayat_keluarga) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required' 
            });
        }
        
        const result = await query(
            'INSERT INTO users (nama_lengkap, usia, jenis_kelamin, riwayat_keluarga) VALUES (?, ?, ?, ?)',
            [nama_lengkap, usia, jenis_kelamin, riwayat_keluarga]
        );
        
        res.json({ 
            success: true,
            id: result.insertId, 
            message: 'User created successfully' 
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// UPDATE user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_lengkap, usia, jenis_kelamin, riwayat_keluarga } = req.body;
        
        // Check if user exists
        const existingUser = await query('SELECT id FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        await query(
            'UPDATE users SET nama_lengkap = ?, usia = ?, jenis_kelamin = ?, riwayat_keluarga = ? WHERE id = ?',
            [nama_lengkap, usia, jenis_kelamin, riwayat_keluarga, id]
        );
        
        res.json({ 
            success: true,
            message: 'User updated successfully' 
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// DELETE user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if user exists
        const existingUser = await query('SELECT id FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        await query('DELETE FROM users WHERE id = ?', [id]);
        
        res.json({ 
            success: true,
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// ==================== SYMPTOMS ROUTES ====================
// GET all symptoms
app.get('/api/symptoms', async (req, res) => {
    try {
        const symptoms = await query(`
            SELECT * FROM symptoms ORDER BY id
        `);
        res.json({
            success: true,
            data: symptoms
        });
    } catch (error) {
        console.error('Error fetching symptoms:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET symptom by ID
app.get('/api/symptoms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const symptoms = await query('SELECT * FROM symptoms WHERE id = ?', [id]);
        
        if (symptoms.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Symptom not found' 
            });
        }
        
        res.json({
            success: true,
            data: symptoms[0]
        });
    } catch (error) {
        console.error('Error fetching symptom:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// CREATE new symptom
app.post('/api/symptoms', async (req, res) => {
    try {
        const { kode_gejala, nama_gejala, deskripsi, tingkat_keparahan, bobot } = req.body;
        
        // Validasi
        if (!kode_gejala || !nama_gejala) {
            return res.status(400).json({ 
                success: false,
                error: 'Kode gejala dan nama gejala harus diisi' 
            });
        }
        
        const result = await query(
            'INSERT INTO symptoms (kode_gejala, nama_gejala, deskripsi, tingkat_keparahan, bobot) VALUES (?, ?, ?, ?, ?)',
            [kode_gejala, nama_gejala, deskripsi, tingkat_keparahan, bobot]
        );
        
        res.json({ 
            success: true,
            id: result.insertId, 
            message: 'Symptom created successfully' 
        });
    } catch (error) {
        console.error('Error creating symptom:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// UPDATE symptom
app.put('/api/symptoms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { kode_gejala, nama_gejala, deskripsi, tingkat_keparahan, bobot } = req.body;
        
        await query(
            'UPDATE symptoms SET kode_gejala = ?, nama_gejala = ?, deskripsi = ?, tingkat_keparahan = ?, bobot = ? WHERE id = ?',
            [kode_gejala, nama_gejala, deskripsi, tingkat_keparahan, bobot, id]
        );
        
        res.json({ 
            success: true,
            message: 'Symptom updated successfully' 
        });
    } catch (error) {
        console.error('Error updating symptom:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// DELETE symptom
app.delete('/api/symptoms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await query('DELETE FROM symptoms WHERE id = ?', [id]);
        
        res.json({ 
            success: true,
            message: 'Symptom deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting symptom:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// ==================== RECOMMENDATIONS ROUTES ====================
// GET all recommendations
app.get('/api/recommendations', async (req, res) => {
    try {
        const recommendations = await query(`
            SELECT * FROM recommendations ORDER BY id
        `);
        res.json({
            success: true,
            data: recommendations
        });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET recommendation by ID
app.get('/api/recommendations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const recommendations = await query('SELECT * FROM recommendations WHERE id = ?', [id]);
        
        if (recommendations.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Recommendation not found' 
            });
        }
        
        res.json({
            success: true,
            data: recommendations[0]
        });
    } catch (error) {
        console.error('Error fetching recommendation:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// CREATE new recommendation
app.post('/api/recommendations', async (req, res) => {
    try {
        const { kategori, judul, deskripsi, untuk_tingkat_risiko } = req.body;
        
        const result = await query(
            'INSERT INTO recommendations (kategori, judul, deskripsi, untuk_tingkat_risiko) VALUES (?, ?, ?, ?)',
            [kategori, judul, deskripsi, untuk_tingkat_risiko]
        );
        
        res.json({ 
            success: true,
            id: result.insertId, 
            message: 'Recommendation created successfully' 
        });
    } catch (error) {
        console.error('Error creating recommendation:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// UPDATE recommendation
app.put('/api/recommendations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { kategori, judul, deskripsi, untuk_tingkat_risiko } = req.body;
        
        await query(
            'UPDATE recommendations SET kategori = ?, judul = ?, deskripsi = ?, untuk_tingkat_risiko = ? WHERE id = ?',
            [kategori, judul, deskripsi, untuk_tingkat_risiko, id]
        );
        
        res.json({ 
            success: true,
            message: 'Recommendation updated successfully' 
        });
    } catch (error) {
        console.error('Error updating recommendation:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// DELETE recommendation
app.delete('/api/recommendations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await query('DELETE FROM recommendations WHERE id = ?', [id]);
        
        res.json({ 
            success: true,
            message: 'Recommendation deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting recommendation:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// ==================== USER SYMPTOMS ROUTES ====================
// GET all user symptoms
app.get('/api/user_symptoms', async (req, res) => {
    try {
        const userSymptoms = await query(`
           SELECT * FROM user_symptoms ORDER BY id
        `);
        res.json({
            success: true,
            data: userSymptoms
        });
    } catch (error) {
        console.error('Error fetching user symptoms:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET user symptoms by user ID
app.get('/api/user_symptoms/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userSymptoms = await query(`
            SELECT us.*, s.nama_gejala, s.kode_gejala, s.tingkat_keparahan, s.bobot 
            FROM user_symptoms us 
            LEFT JOIN symptoms s ON us.symptom_id = s.id 
            WHERE us.user_id = ? 
            ORDER BY us.created_at DESC
        `, [userId]);
        
        res.json({
            success: true,
            data: userSymptoms
        });
    } catch (error) {
        console.error('Error fetching user symptoms:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// CREATE new user symptom
app.post('/api/user_symptoms', async (req, res) => {
    try {
        const { user_id, symptom_id } = req.body;
        
        if (!user_id || !symptom_id) {
            return res.status(400).json({ 
                success: false,
                error: 'User ID and Symptom ID are required' 
            });
        }
        
        const result = await query(
            'INSERT INTO user_symptoms (user_id, symptom_id) VALUES (?, ?)',
            [user_id, symptom_id]
        );
        
        res.json({ 
            success: true,
            id: result.insertId, 
            message: 'User symptom created successfully' 
        });
    } catch (error) {
        console.error('Error creating user symptom:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// ==================== DIAGNOSES ROUTES ====================
// GET all diagnoses
app.get('/api/diagnoses', async (req, res) => {
    try {
        const diagnoses = await query(`
            SELECT d.*, u.nama_lengkap 
            FROM diagnoses d 
            LEFT JOIN users u ON d.user_id = u.id 
            ORDER BY d.created_at DESC
        `);
        res.json({
            success: true,
            data: diagnoses
        });
    } catch (error) {
        console.error('Error fetching diagnoses:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET diagnosis by ID
app.get('/api/diagnoses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const diagnoses = await query(`
            SELECT d.*, u.nama_lengkap 
            FROM diagnoses d 
            LEFT JOIN users u ON d.user_id = u.id 
            WHERE d.id = ?
        `, [id]);
        
        if (diagnoses.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Diagnosis not found' 
            });
        }
        
        res.json({
            success: true,
            data: diagnoses[0]
        });
    } catch (error) {
        console.error('Error fetching diagnosis:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// GET diagnoses by user ID
app.get('/api/diagnoses/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const diagnoses = await query(`
            SELECT * FROM diagnoses WHERE user_id = ? ORDER BY created_at DESC
        `, [userId]);
        
        res.json({
            success: true,
            data: diagnoses
        });
    } catch (error) {
        console.error('Error fetching user diagnoses:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// CREATE new diagnosis
app.post('/api/diagnoses', async (req, res) => {
    try {
        const { user_id, hasil_diagnosis, tingkat_risiko, skor } = req.body;
        
        // Validasi input
        if (!user_id || !hasil_diagnosis || !tingkat_risiko || skor === undefined) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required: user_id, hasil_diagnosis, tingkat_risiko, skor' 
            });
        }
        
        const result = await query(
            'INSERT INTO diagnoses (user_id, hasil_diagnosis, tingkat_risiko, skor) VALUES (?, ?, ?, ?)',
            [user_id, hasil_diagnosis, tingkat_risiko, skor]
        );
        
        res.json({ 
            success: true,
            id: result.insertId,
            user_id: user_id,
            hasil_diagnosis: hasil_diagnosis,
            tingkat_risiko: tingkat_risiko,
            skor: skor,
            message: 'Diagnosis created successfully' 
        });
    } catch (error) {
        console.error('Error creating diagnosis:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// UPDATE diagnosis
app.put('/api/diagnoses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hasil_diagnosis, tingkat_risiko, skor } = req.body;
        
        await query(
            'UPDATE diagnoses SET hasil_diagnosis = ?, tingkat_risiko = ?, skor = ? WHERE id = ?',
            [hasil_diagnosis, tingkat_risiko, skor, id]
        );
        
        res.json({ 
            success: true,
            message: 'Diagnosis updated successfully' 
        });
    } catch (error) {
        console.error('Error updating diagnosis:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// DELETE diagnosis
app.delete('/api/diagnoses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await query('DELETE FROM diagnoses WHERE id = ?', [id]);
        
        res.json({ 
            success: true,
            message: 'Diagnosis deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting diagnosis:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// ==================== PUBLIC ENDPOINTS ====================
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Diabetes API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await query('SELECT 1 as test');
        res.json({ 
            success: true,
            message: 'Database connection successful',
            test: result
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Diabetes Management System API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
                me: 'GET /api/auth/me (requires token)',
                logout: 'POST /api/auth/logout (requires token)'
            },
            public: {
                health: 'GET /api/health',
                testDb: 'GET /api/test-db'
            },
            protected: {
                users: 'GET /api/users (requires token)',
                symptoms: 'GET /api/symptoms (requires token)',
                recommendations: 'GET /api/recommendations (requires token)',
                diagnoses: 'GET /api/diagnoses (requires token)',
                userSymptoms: 'GET /api/user_symptoms (requires token)'
            }
        },
        note: 'Use Authorization: Bearer <token> header for protected endpoints'
    });
});

// ==================== ERROR HANDLING ====================
// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        message: 'Check available endpoints at /'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    const statusCode = error.status || 500;
    const message = error.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack
        })
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🔐 Login endpoint: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`📊 API Documentation: http://localhost:${PORT}/`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
    console.log(`🛡️  All data endpoints are protected with token authentication`);
});

export default app;