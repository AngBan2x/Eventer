const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/db.json');

const readDB = async () => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, devolvemos una estructura inicial
        return { eventos: [] };
    }
};

const writeDB = async (data) => {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error al escribir en db.json:", error);
        throw new Error("Error de persistencia");
    }
};

module.exports = { readDB, writeDB };