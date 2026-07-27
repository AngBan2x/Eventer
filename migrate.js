const fs = require('fs').promises;
const path = require('path');
const pool = require('./src/utils/db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('🚀 Iniciando migración de datos...');

        // 1. Leer archivos
        const dbPath = path.join(__dirname, 'data/db.json');
        const schemaPath = path.join(__dirname, 'data/schema.sql');
        
        const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
        const schemaSql = await fs.readFile(schemaPath, 'utf8');

        // 2. Ejecutar Schema
        console.log('📝 Creando tablas...');
        // Modificamos el schema para asegurar que usuarios exista antes que eventos y asistencias
        const fullSchema = `
            CREATE TABLE IF NOT EXISTS usuarios (
                id BIGSERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'estudiante',
                "createdAt" TIMESTAMP DEFAULT NOW(),
                "updatedAt" TIMESTAMP
            );
            ${schemaSql}
        `;
        
        // DROP TABLE CASCADE para resetear el tipo de dato si ya existían como INTEGER
        console.log('🔄 Reajustando tipos de datos a BIGINT...');
        await pool.query('DROP TABLE IF EXISTS asistencias CASCADE');
        await pool.query('DROP TABLE IF EXISTS eventos CASCADE');
        await pool.query('DROP TABLE IF EXISTS espacios CASCADE');
        await pool.query('DROP TABLE IF EXISTS usuarios CASCADE');
        
        await pool.query(fullSchema);

        // 3. Migrar Usuarios
        console.log('👥 Migrando usuarios...');
        for (const u of (dbData.usuarios || [])) {
            await pool.query(
                `INSERT INTO usuarios (id, nombre, email, password, rol, "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 ON CONFLICT (email) DO UPDATE SET 
                 nombre = EXCLUDED.nombre, password = EXCLUDED.password, rol = EXCLUDED.rol`,
                [u.id, u.nombre, u.email, u.password, u.rol, u.createdAt || new Date(), u.updatedAt || null]
            );
        }

        // 4. Migrar Espacios
        console.log('🏫 Migrando espacios...');
        for (const e of (dbData.espacios || [])) {
            await pool.query(
                `INSERT INTO espacios (id, nombre, tipo, capacidad, eliminado, "createdAt") 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (id) DO NOTHING`,
                [e.id, e.nombre, e.tipo, e.capacidad, e.eliminado || false, e.createdAt || new Date()]
            );
        }

        // 5. Migrar Eventos
        console.log('📅 Migrando eventos...');
        for (const ev of (dbData.eventos || [])) {
            await pool.query(
                `INSERT INTO eventos (id, usuario_id, nombre, fecha, hora, espacio, responsable, tipo, estado, descripcion, eliminado, "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
                 ON CONFLICT (id) DO NOTHING`,
                [ev.id, ev.usuario_id, ev.nombre, ev.fecha, ev.hora, ev.espacio, ev.responsable, ev.tipo, ev.estado, ev.descripcion || ev.description, ev.eliminado || false, ev.createdAt || new Date(), ev.updatedAt || null]
            );
        }

        // 6. Migrar Asistencias
        console.log('✅ Migrando asistencias...');
        const validEventIds = new Set((dbData.eventos || []).map(ev => Number(ev.id)));
        const validUserIds = new Set((dbData.usuarios || []).map(u => Number(u.id)));

        for (const a of (dbData.asistencias || [])) {
            if (!validEventIds.has(Number(a.evento_id))) {
                console.warn(`⚠️ Omitida asistencia huérfana (evento no existe): evento_id ${a.evento_id}`);
                continue;
            }
            if (!validUserIds.has(Number(a.usuario_id))) {
                console.warn(`⚠️ Omitida asistencia huérfana (usuario no existe): usuario_id ${a.usuario_id}`);
                continue;
            }

            await pool.query(
                `INSERT INTO asistencias (id, evento_id, usuario_id, fecha_registro) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (id) DO NOTHING`,
                [a.id, a.evento_id, a.usuario_id, a.fecha_registro || new Date()]
            );
        }

        console.log('✨ Migración completada con éxito.');
    } catch (err) {
        console.error('❌ Error durante la migración:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
