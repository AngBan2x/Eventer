const pool = require('../utils/db');

/**
 * Función auxiliar para verificar conflictos de horario usando SQL
 */
const verificarConflictoSQL = async (evento, idIgnorar = null) => {
    const query = `
        SELECT * FROM eventos 
        WHERE eliminado = false 
        AND fecha = $1 
        AND hora = $2 
        AND espacio = $3 
        AND estado NOT IN ('cancelado', 'rechazado')
        ${idIgnorar ? 'AND id != $4' : ''}
    `;
    const values = [evento.fecha, evento.hora, evento.espacio];
    if (idIgnorar) values.push(idIgnorar);
    
    const result = await pool.query(query, values);
    return result.rows[0];
};

const getEventos = async (req, res) => {
    try {
        const rol = req.user ? req.user.rol : 'estudiante';
        const usuarioId = req.user ? req.user.id : null;

        let query = `
            SELECT e.*, 
            (SELECT COUNT(*) FROM asistencias a WHERE a.evento_id = e.id) as asistencias
            FROM eventos e
            WHERE e.eliminado = false
        `;
        const values = [];

        if (rol === 'admin') {
            // Admin ve todos los no eliminados
        } else if (rol === 'organizador') {
            query += ` AND (e.estado = 'aprobado' OR e.usuario_id = $1)`;
            values.push(usuarioId);
        } else {
            query += ` AND e.estado = 'aprobado'`;
        }

        query += ` ORDER BY e.fecha ASC, e.hora ASC`;

        const result = await pool.query(query, values);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al obtener eventos" });
    }
};

const createEvento = async (req, res) => {
    try {
        const { nombre, fecha, hora, espacio, responsable, tipo, estado, descripcion } = req.body;

        if (!nombre || !fecha || !hora || !espacio) {
            return res.status(400).json({ success: false, message: "Faltan datos críticos (nombre, fecha, hora, espacio)" });
        }

        const conflicto = await verificarConflictoSQL({ fecha, hora, espacio });
        if (conflicto) {
            return res.status(409).json({ 
                success: false, 
                message: `Conflicto: El espacio '${espacio}' ya está ocupado en esa fecha y hora.` 
            });
        }

        const query = `
            INSERT INTO eventos (usuario_id, nombre, fecha, hora, espacio, responsable, tipo, estado, descripcion, eliminado, "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())
            RETURNING *
        `;
        const values = [
            req.user ? req.user.id : null,
            nombre, fecha, hora, espacio,
            responsable || (req.user ? req.user.nombre : "Sin responsable"),
            tipo || "Académico",
            estado || "pendiente",
            descripcion || null
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const checkQuery = `SELECT * FROM eventos WHERE id = $1 AND eliminado = false`;
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Evento no encontrado" });
        }

        const eventoActual = checkResult.rows[0];

        if (req.user && eventoActual.usuario_id && String(eventoActual.usuario_id) !== String(req.user.id) && req.user.rol !== 'admin') {
            return res.status(403).json({ success: false, message: "No tienes permiso para modificar este evento" });
        }

        if (updates.fecha || updates.hora || updates.espacio) {
            const conflicto = await verificarConflictoSQL({
                fecha: updates.fecha || eventoActual.fecha,
                hora: updates.hora || eventoActual.hora,
                espacio: updates.espacio || eventoActual.espacio
            }, id);
            if (conflicto) {
                return res.status(409).json({ success: false, message: "La actualización genera un conflicto de horario." });
            }
        }

        let nuevoEstado = updates.estado || eventoActual.estado;
        if (req.user && req.user.rol !== 'admin') {
            if (['aprobado', 'rechazado', 'cancelado'].includes(eventoActual.estado)) {
                nuevoEstado = 'pendiente';
            }
        }

        const query = `
            UPDATE eventos 
            SET nombre = COALESCE($1, nombre),
                fecha = COALESCE($2, fecha),
                hora = COALESCE($3, hora),
                espacio = COALESCE($4, espacio),
                responsable = COALESCE($5, responsable),
                tipo = COALESCE($6, tipo),
                estado = $7,
                descripcion = COALESCE($8, descripcion),
                "updatedAt" = NOW()
            WHERE id = $9
            RETURNING *
        `;
        const values = [
            updates.nombre, updates.fecha, updates.hora, updates.espacio,
            updates.responsable, updates.tipo, nuevoEstado, updates.descripcion, id
        ];

        const result = await pool.query(query, values);
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, motivo } = req.body;
        
        if (!['aprobado', 'rechazado', 'cancelado', 'pendiente'].includes(estado)) {
            return res.status(400).json({ success: false, message: "Estado no válido" });
        }

        const query = `
            UPDATE eventos 
            SET estado = $1, 
                nota_rechazo = $2,
                "updatedAt" = NOW()
            WHERE id = $3 AND eliminado = false
            RETURNING *
        `;
        const result = await pool.query(query, [estado, estado === 'rechazado' ? motivo : null, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Evento no encontrado" });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getResumen = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                json_object_agg(estado, count) as por_estado,
                json_object_agg(tipo, count_tipo) as por_tipo,
                json_object_agg(espacio, count_espacio) as espacios_mas_usados
            FROM (
                SELECT 
                    estado, COUNT(*) as count,
                    tipo, COUNT(*) OVER(PARTITION BY tipo) as count_tipo,
                    espacio, COUNT(*) OVER(PARTITION BY espacio) as count_espacio
                FROM eventos 
                WHERE eliminado = false
                GROUP BY estado, tipo, espacio
            ) s
        `;
        
        // Versión simplificada para evitar errores de agregación complejos en una sola query
        const totalResult = await pool.query('SELECT COUNT(*) FROM eventos WHERE eliminado = false');
        const estadosResult = await pool.query('SELECT estado, COUNT(*) FROM eventos WHERE eliminado = false GROUP BY estado');
        const tiposResult = await pool.query('SELECT tipo, COUNT(*) FROM eventos WHERE eliminado = false GROUP BY tipo');
        const espaciosResult = await pool.query('SELECT espacio, COUNT(*) FROM eventos WHERE eliminado = false GROUP BY espacio');
        const proximosResult = await pool.query(`
            SELECT * FROM eventos 
            WHERE eliminado = false AND fecha >= CURRENT_DATE 
            ORDER BY fecha ASC, hora ASC 
            LIMIT 5
        `);

        const porEstado = {};
        estadosResult.rows.forEach(r => porEstado[r.estado] = parseInt(r.count));
        
        const porTipo = {};
        tiposResult.rows.forEach(r => porTipo[r.tipo] = parseInt(r.count));

        const espaciosMasUsados = {};
        espaciosResult.rows.forEach(r => espaciosMasUsados[r.espacio] = parseInt(r.count));

        res.status(200).json({
            success: true,
            data: {
                total: parseInt(totalResult.rows[0].count),
                porEstado,
                porTipo,
                espaciosMasUsados,
                proximos: proximosResult.rows
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteEvento = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            UPDATE eventos 
            SET eliminado = true, estado = 'cancelado', "deletedAt" = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Evento no encontrado" });
        }

        res.status(200).json({ success: true, message: "Evento eliminado lógicamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const marcarAsistencia = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.user ? req.user.id : null;

        if (!usuario_id) return res.status(401).json({ success: false, message: "Usuario no autenticado" });

        const checkEvento = await pool.query('SELECT * FROM eventos WHERE id = $1 AND eliminado = false', [id]);
        if (checkEvento.rowCount === 0) return res.status(404).json({ success: false, message: "Evento no encontrado" });
        if (checkEvento.rows[0].estado !== 'aprobado') return res.status(400).json({ success: false, message: "Solo puedes marcar asistencia en eventos aprobados" });

        const checkAsistencia = await pool.query('SELECT * FROM asistencias WHERE evento_id = $1 AND usuario_id = $2', [id, usuario_id]);
        if (checkAsistencia.rowCount > 0) return res.status(400).json({ success: false, message: "Ya has registrado tu asistencia" });

        const query = `INSERT INTO asistencias (evento_id, usuario_id, fecha_registro) VALUES ($1, $2, NOW()) RETURNING *`;
        const result = await pool.query(query, [id, usuario_id]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const obtenerAsistencias = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM asistencias WHERE evento_id = $1', [id]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
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