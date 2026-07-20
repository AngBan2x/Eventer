const { readDB, writeDB } = require('../utils/dbHandler');

const getEspacios = async (req, res) => {
    try {
        const db = await readDB();
        res.status(200).json({ success: true, data: db.espacios });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener espacios" });
    }
};

const createEspacio = async (req, res) => {
    try {
        const { nombre, tipo, capacidad } = req.body;
        if (!nombre || !tipo || !capacidad) {
            return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
        }
        const db = await readDB();
        const nuevoEspacio = { id: Date.now(), nombre, tipo, capacidad, createdAt: new Date().toISOString() };
        db.espacios.push(nuevoEspacio);
        await writeDB(db);
        res.status(201).json({ success: true, data: nuevoEspacio });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al crear espacio" });
    }
};

module.exports = { getEspacios, createEspacio };