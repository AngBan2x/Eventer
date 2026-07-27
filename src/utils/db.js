const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para conexiones seguras en la nube
    }
});

pool.on('error', (err) => {
    console.error('Error inesperado en el cliente de PostgreSQL', err);
    process.exit(-1);
});

module.exports = pool;