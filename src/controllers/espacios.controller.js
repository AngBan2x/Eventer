const { readDB, writeDB } = require('../utils/dbHandler');

/**
 * Obtener todos los espacios activos
 */
const getEspacios = async (req, res) => {
    try {
        const db = await readDB();
        // Solo espacios que NO estén marcados como eliminados
        const activos = db.espacios.filter(e => !e.eliminado);
        res.status(200).json({ success: true, data: activos });
    } catch (error) {
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

        const db = await readDB();
        const nuevoEspacio = { 
            id: Date.now(), 
            nombre, 
            tipo, 
            capacidad: parseInt(capacidad),
            eliminado: false,
            createdAt: new Date().toISOString() 
        };

        db.espacios.push(nuevoEspacio);
        await writeDB(db);
        res.status(201).json({ success: true, data: nuevoEspacio });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al crear espacio" });
    }
};

/**
 * Actualizar datos de un espacio
 */
const updateEspacio = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const db = await readDB();

        const index = db.espacios.findIndex(e => e.id == id);
        if (index === -1 || db.espacios[index].eliminado) {
            return res.status(404).json({ success: false, message: "Espacio no encontrado" });
        }

        db.espacios[index] = { 
            ...db.espacios[index], 
            ...updates, 
            updatedAt: new Date().toISOString() 
        };

        await writeDB(db);
        res.status(200).json({ success: true, data: db.espacios[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al actualizar espacio" });
    }
};

/**
 * Eliminación lógica de un espacio
 */
const deleteEspacio = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await readDB();
        const index = db.espacios.findIndex(e => e.id == id);

        if (index === -1) return res.status(404).json({ success: false, message: "Espacio no encontrado" });

        db.espacios[index].eliminado = true;
        db.espacios[index].deletedAt = new Date().toISOString();

        await writeDB(db);
        res.status(200).json({ success: true, message: "Espacio eliminado lógicamente" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al eliminar espacio" });
    }
};

module.exports = { getEspacios, createEspacio, updateEspacio, deleteEspacio };