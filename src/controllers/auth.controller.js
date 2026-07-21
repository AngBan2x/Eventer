const { readDB } = require('../utils/dbHandler');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = await readDB();
        const usuarios = db.usuarios || [];

        const usuario = usuarios.find(u => u.email === email && u.password === password);

        if (!usuario) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }

        const { password: _, ...usuarioSinPassword } = usuario;
        res.json(usuarioSinPassword);
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
};

module.exports = { login };
