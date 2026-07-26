const { readDB, writeDB } = require('../utils/dbHandler');

// Login de usuarios
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = await readDB();
        const usuarios = db.usuarios || [];

        const usuario = usuarios.find(u => u.email === email && u.password === password);

        if (!usuario) {
            return res.status(401).json({ success: false, mensaje: "Credenciales inválidas" });
        }

        const { password: _, ...usuarioSinPassword } = usuario;
        res.json({ success: true, data: usuarioSinPassword });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: "Error en el servidor" });
    }
};

// Registro de usuarios (Rol por defecto: "estudiante")
const register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ success: false, mensaje: "Todos los campos son obligatorios" });
        }

        const db = await readDB();
        if (!db.usuarios) db.usuarios = [];

        // Verificar si el correo ya existe
        const yaExiste = db.usuarios.some(u => u.email === email);
        if (yaExiste) {
            return res.status(400).json({ success: false, mensaje: "El correo ya está registrado" });
        }

        const nuevoUsuario = {
            id: Date.now(),
            nombre,
            email,
            password,
            rol: 'estudiante', // Rol por defecto asignado automáticamente
            createdAt: new Date().toISOString()
        };

        db.usuarios.push(nuevoUsuario);
        await writeDB(db);

        const { password: _, ...usuarioSinPassword } = nuevoUsuario;
        res.status(201).json({ success: true, data: usuarioSinPassword });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: "Error al registrar usuario" });
    }
};

// Listar todos los usuarios (Exclusivo Admin)
const getUsuarios = async (req, res) => {
    try {
        const db = await readDB();
        const usuarios = (db.usuarios || []).map(({ password, ...u }) => u);
        res.status(200).json({ success: true, data: usuarios });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: "Error al obtener usuarios" });
    }
};

// Cambiar rol de un usuario (Exclusivo Admin)
const cambiarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;

        const rolesValidos = ['estudiante', 'organizador', 'admin'];
        if (!rolesValidos.includes(rol)) {
            return res.status(400).json({ success: false, mensaje: "Rol no válido" });
        }

        const db = await readDB();
        const usuario = (db.usuarios || []).find(u => u.id == id);

        if (!usuario) {
            return res.status(404).json({ success: false, mensaje: "Usuario no encontrado" });
        }

        usuario.rol = rol;
        usuario.updatedAt = new Date().toISOString();

        await writeDB(db);
        res.status(200).json({ success: true, mensaje: `Rol actualizado a ${rol}`, data: usuario });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: "Error al cambiar el rol" });
    }
};

module.exports = { login, register, getUsuarios, cambiarRol };