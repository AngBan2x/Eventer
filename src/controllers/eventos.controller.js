const { readDB, writeDB } = require('../utils/dbHandler');

/**
 * Función auxiliar para verificar conflictos de horario
 */
const verificarConflicto = (eventos, nuevoEvento, idIgnorar = null) => {
    return eventos.find(e => 
        e.id !== idIgnorar &&
        e.fecha === nuevoEvento.fecha &&
        e.hora === nuevoEvento.hora &&
        e.espacio === nuevoEvento.espacio &&
        e.estado !== 'cancelado' && e.estado !== 'rechazado'
    );
};

const getEventos = async (req, res) => {
    try {
        const db = await readDB();
        res.status(200).json({ success: true, data: db.eventos });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener eventos" });
    }
};

const createEvento = async (req, res) => {
    try {
        const { nombre, fecha, hora, espacio, responsable, tipo, estado } = req.body;

        if (!nombre || !fecha || !hora || !espacio) {
            return res.status(400).json({ success: false, message: "Faltan datos críticos" });
        }

        const db = await readDB();

        // REQUERIMIENTO D: Verificar conflictos
        const conflicto = verificarConflicto(db.eventos, { fecha, hora, espacio });
        if (conflicto) {
            return res.status(409).json({ 
                success: false, 
                message: `Conflicto: El espacio '${espacio}' ya está reservado para el ${fecha} a las ${hora}.` 
            });
        }

        const nuevoEvento = {
            id: Date.now(),
            nombre, fecha, hora, espacio, responsable,
            tipo: tipo || "Académico",
            estado: estado || "solicitado", // REQUERIMIENTO E: Estado inicial
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
 * REQUERIMIENTO I: Edición o actualización
 */
const updateEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const db = await readDB();
        
        const index = db.eventos.findIndex(e => e.id == id);
        if (index === -1) return res.status(404).json({ success: false, message: "Evento no encontrado" });

        // Si se intenta cambiar fecha/hora/espacio, verificar que no choque con otro
        if (updates.fecha || updates.hora || updates.espacio) {
            const eventoActualizado = { ...db.eventos[index], ...updates };
            const conflicto = verificarConflicto(db.eventos, eventoActualizado, parseInt(id));
            if (conflicto) {
                return res.status(409).json({ success: false, message: "La actualización genera un conflicto de horario/espacio." });
            }
        }

        db.eventos[index] = { ...db.eventos[index], ...updates, updatedAt: new Date().toISOString() };
        await writeDB(db);
        
        res.status(200).json({ success: true, data: db.eventos[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * REQUERIMIENTO F: Vista de resumen enriquecida
 */
const getResumen = async (req, res) => {
    try {
        const db = await readDB();
        const eventos = db.eventos;

        const resumen = {
            total: eventos.length,
            porEstado: {},
            porTipo: {},
            espaciosMasUsados: {},
            proximos: eventos
                .filter(e => e.fecha >= new Date().toISOString().split('T')[0])
                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                .slice(0, 5)
        };

        eventos.forEach(e => {
            resumen.porEstado[e.estado] = (resumen.porEstado[e.estado] || 0) + 1;
            resumen.porTipo[e.tipo] = (resumen.porTipo[e.tipo] || 0) + 1;
            resumen.espaciosMasUsados[e.espacio] = (resumen.espaciosMasUsados[e.espacio] || 0) + 1;
        });

        res.status(200).json({ success: true, data: resumen });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getEventos, createEvento, updateEvento, getResumen };