const { readDB, writeDB } = require('../utils/dbHandler');

/**
 * Función auxiliar para verificar conflictos de horario
 * Solo considera eventos que NO han sido eliminados
 */
const verificarConflicto = (eventos, nuevoEvento, idIgnorar = null) => {
    return eventos.find(e => 
        !e.eliminado &&
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
        const asistencias = db.asistencias || [];

        // Extraer rol e ID del usuario autenticado
        const rol = req.user ? req.user.rol : 'estudiante';
        const usuarioId = req.user ? Number(req.user.id) : null;

        const activos = (db.eventos || [])
            .filter(e => {
                // 1. Descartar eventos eliminados
                if (e.eliminado) return false;

                // 2. Administrador ve absolutamente todos los eventos
                if (rol === 'admin') return true;

                // 3. Organizador ve eventos aprobados Y las solicitudes que él creó
                if (rol === 'organizador') {
                    return e.estado === 'aprobado' || Number(e.usuario_id) === usuarioId;
                }

                // 4. Estudiantes / Usuarios por defecto: SOLO ven eventos aprobados
                return e.estado === 'aprobado';
            })
            .map(evento => {
                const asistenciasDelEvento = asistencias.filter(a => Number(a.evento_id) === Number(evento.id));
                
                return {
                    ...evento,
                    asistencias: asistenciasDelEvento.length,
                    asistentes: asistenciasDelEvento
                };
            });

        res.status(200).json({ success: true, data: activos });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener eventos" });
    }
};

const createEvento = async (req, res) => {
    try {
        const { nombre, fecha, hora, espacio, responsable, tipo, estado } = req.body;

        if (!nombre || !fecha || !hora || !espacio) {
            return res.status(400).json({ success: false, message: "Faltan datos críticos (nombre, fecha, hora, espacio)" });
        }

        const db = await readDB();

        const conflicto = verificarConflicto(db.eventos, { fecha, hora, espacio });
        if (conflicto) {
            return res.status(409).json({ 
                success: false, 
                message: `Conflicto: El espacio '${espacio}' ya está ocupado en esa fecha y hora.` 
            });
        }

        const nuevoEvento = {
            id: Date.now(),
            usuario_id: req.user ? req.user.id : null,
            nombre, fecha, hora, espacio,
            responsable: responsable || (req.user ? req.user.nombre : "Sin responsable"),
            tipo: tipo || "Académico",
            estado: estado || "solicitado",
            eliminado: false,
            createdAt: new Date().toISOString()
        };

        if (!db.eventos) db.eventos = [];
        db.eventos.push(nuevoEvento);
        await writeDB(db);

        res.status(201).json({ success: true, data: nuevoEvento });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const db = await readDB();
        
        const index = db.eventos.findIndex(e => e.id == id);
        if (index === -1 || db.eventos[index].eliminado) {
            return res.status(404).json({ success: false, message: "Evento no encontrado" });
        }

        const eventoActual = db.eventos[index];

        if (req.user && eventoActual.usuario_id && eventoActual.usuario_id != req.user.id && req.user.rol !== 'admin') {
            return res.status(403).json({ success: false, message: "No tienes permiso para modificar este evento" });
        }

        if (updates.fecha || updates.hora || updates.espacio) {
            const eventoActualizado = { ...eventoActual, ...updates };
            const conflicto = verificarConflicto(db.eventos, eventoActualizado, parseInt(id));
            if (conflicto) {
                return res.status(409).json({ success: false, message: "La actualización genera un conflicto de horario." });
            }
        }

        const nuevoEstado = (req.user && req.user.rol !== 'admin' && (eventoActual.estado === 'rechazado' || eventoActual.estado === 'cancelado'))
            ? 'solicitado'
            : (updates.estado || eventoActual.estado);

        db.eventos[index] = { 
            ...eventoActual, 
            ...updates, 
            estado: nuevoEstado,
            updatedAt: new Date().toISOString() 
        };

        await writeDB(db);
        res.status(200).json({ success: true, data: db.eventos[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        if (!['aprobado', 'rechazado', 'cancelado'].includes(estado)) {
            return res.status(400).json({ success: false, message: "Estado no válido" });
        }

        const db = await readDB();
        const index = db.eventos.findIndex(e => e.id == id);

        if (index === -1 || db.eventos[index].eliminado) {
            return res.status(404).json({ success: false, message: "Evento no encontrado" });
        }

        db.eventos[index].estado = estado;
        db.eventos[index].updatedAt = new Date().toISOString();

        await writeDB(db);
        res.status(200).json({ success: true, message: `Evento ${estado} con éxito`, data: db.eventos[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getResumen = async (req, res) => {
    try {
        const db = await readDB();
        const eventos = (db.eventos || []).filter(e => !e.eliminado);

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

const deleteEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await readDB();
        const index = db.eventos.findIndex(e => e.id == id);

        if (index === -1) return res.status(404).json({ success: false, message: "Evento no encontrado" });

        db.eventos[index].eliminado = true;
        db.eventos[index].estado = 'cancelado';
        db.eventos[index].deletedAt = new Date().toISOString();

        await writeDB(db);
        res.status(200).json({ success: true, message: "Evento eliminado lógicamente" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const marcarAsistencia = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.user ? req.user.id : null;

        if (!usuario_id) {
            return res.status(401).json({ success: false, message: "Usuario no autenticado" });
        }

        const db = await readDB();
        if (!db.asistencias) db.asistencias = [];

        const evento = (db.eventos || []).find(e => e.id == id && !e.eliminado);
        if (!evento) {
            return res.status(404).json({ success: false, message: "Evento no encontrado" });
        }

        if (evento.estado !== 'aprobado') {
            return res.status(400).json({ success: false, message: "Solo puedes marcar asistencia en eventos aprobados" });
        }

        const yaRegistro = db.asistencias.some(a => a.evento_id == id && a.usuario_id == usuario_id);
        if (yaRegistro) {
            return res.status(400).json({ success: false, message: "Ya has registrado tu asistencia para este evento" });
        }

        const nuevaAsistencia = {
            id: Date.now(),
            evento_id: Number(id),
            usuario_id: Number(usuario_id),
            fecha_registro: new Date().toISOString()
        };

        db.asistencias.push(nuevaAsistencia);
        await writeDB(db);

        res.status(201).json({ success: true, message: "Asistencia registrada con éxito", data: nuevaAsistencia });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const obtenerAsistencias = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await readDB();
        const asistencias = (db.asistencias || []).filter(a => a.evento_id == id);
        res.status(200).json({ success: true, data: asistencias });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    getEventos, 
    createEvento, 
    updateEvento, 
    updateEstado, 
    getResumen, 
    deleteEvento, 
    marcarAsistencia, 
    obtenerAsistencias 
};