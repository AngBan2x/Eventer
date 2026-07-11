const { readDB, writeDB } = require('../utils/dbHandler');

/**
 * Obtiene todos los eventos
 */
const getEventos = async (req, res) => {
    try {
        const db = await readDB();
        res.status(200).json({ success: true, data: db.eventos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Crea un nuevo evento
 */
const createEvento = async (req, res) => {
    try {
        const { nombre, fecha, hora, espacio, responsable, estado } = req.body;

        if (!nombre || !fecha || !espacio || !responsable) {
            return res.status(400).json({ 
                success: false, 
                message: "Faltan campos obligatorios" 
            });
        }

        const db = await readDB();
        
        const nuevoEvento = {
            id: Date.now(),
            nombre,
            fecha,
            hora: hora || "Por definir",
            espacio,
            responsable,
            estado: estado || "pendiente",
            createdAt: new Date().toISOString()
        };

        db.eventos.push(nuevoEvento);
        await writeDB(db);

        res.status(201).json({ success: true, data: nuevoEvento });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getEventos,
    createEvento
};