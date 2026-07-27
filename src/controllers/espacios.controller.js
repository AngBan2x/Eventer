const pool = require('../utils/db');

/**
 * Obtener todos los espacios activos
 */
const getEspacios = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM espacios WHERE eliminado = false ORDER BY nombre ASC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al obtener espacios" });
    }
};

/**
 * Crear un nuevo espacio
 */
const createEspacio = async (req, res) => {
    try {
        const { nombre, tipo, capacidad } = req.body;
        if (!nombre || !tipo || !capacidad) {
            return res.status(400).json({ success: false, message: "Nombre, tipo y capacidad son obligatorios" });
        }

        const query = `
            INSERT INTO espacios (nombre, tipo, capacidad, eliminado, "createdAt")
            VALUES ($1, $2, $3, false, NOW())
            RETURNING *
        `;
        const values = [nombre, tipo, parseInt(capacidad)];
        const result = await pool.query(query, values);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al crear espacio" });
    }
};

/**
 * Actualizar datos de un espacio
 */
const updateEspacio = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipo, capacidad } = req.body;

        const query = `
            UPDATE espacios 
            SET nombre = COALESCE($1, nombre), 
                tipo = COALESCE($2, tipo), 
                capacidad = COALESCE($3, capacidad),
                "updatedAt" = NOW()
            WHERE id = $4 AND eliminado = false
            RETURNING *
        `;
        const values = [nombre, tipo, capacidad ? parseInt(capacidad) : null, id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Espacio no encontrado" });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al actualizar espacio" });
    }
};

/**
 * Eliminación lógica de un espacio
 */
const deleteEspacio = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            UPDATE espacios 
            SET eliminado = true, "deletedAt" = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Espacio no encontrado" });
        }

        res.status(200).json({ success: true, message: "Espacio eliminado lógicamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error al eliminar espacio" });
    }
};

module.exports = { getEspacios, createEspacio, updateEspacio, deleteEspacio };