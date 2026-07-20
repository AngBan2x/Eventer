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

/**
 * Genera un resumen estadístico de los eventos
 */
const getResumen = async (req, res) => {
    try {
        const db = await readDB();
        const eventos = db.eventos;

        // 1. Cantidad total
        const totalEventos = eventos.length;

        // 2. Cantidad por estado
        const porEstado = eventos.reduce((acc, evento) => {
            const estado = evento.estado || 'pendiente';
            acc[estado] = (acc[estado] || 0) + 1;
            return acc;
        }, {});

        // 3. Próximos 5 eventos (ordenados por fecha ascendente)
        // Solo tomamos eventos cuya fecha sea igual o posterior a hoy
        const hoy = new Date().toISOString().split('T')[0];
        const proximosCinco = eventos
            .filter(e => e.fecha >= hoy)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                total: totalEventos,
                estadisticas: porEstado,
                proximosEventos: proximosCinco
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al generar resumen" });
    }
};

module.exports = {
    getEventos,
    createEvento,
    getResumen
};