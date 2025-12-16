// config/cors.js - SIMPLE VERSION (Development only)
import cors from 'cors';

// Untuk development, izinkan semua origin
const corsOptions = {
    origin: '*', // IZINKAN SEMUA di development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

export default cors(corsOptions);