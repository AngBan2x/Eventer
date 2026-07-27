const pool = require('../utils/db');

// Login de usuarios
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const query = 'SELECT * FROM usuarios WHERE email = $1 AND password = $2';
        const result = await pool.query(query, [email, password]);

        if (result.rowCount === 0) {
            return res.status(401).json({ success: false, mensaje: "Credenciales inválidas" });
        }

        const usuario = result.rows[0];
        const { password: _, ...usuarioSinPassword } = usuario;
        res.json({ success: true, data: usuarioSinPassword });
    } catch (error) {
        console.error(error);
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

        // Verificar si el correo ya existe
        const checkQuery = 'SELECT id FROM usuarios WHERE email = $1';
        const checkResult = await pool.query(checkQuery, [email]);
        
        if (checkResult.rowCount > 0) {
            return res.status(400).json({ success: false, mensaje: "El correo ya está registrado" });
        }

        const insertQuery = `
            INSERT INTO usuarios (nombre, email, password, rol, "createdAt")
            VALUES ($1, $2, $3, 'estudiante', NOW())
            RETURNING id, nombre, email, rol, "createdAt"
        `;
        const result = await pool.query(insertQuery, [nombre, email, password]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, mensaje: "Error al registrar usuario" });
    }
};

// Listar todos los usuarios (Exclusivo Admin)
const getUsuarios = async (req, res) => {
    try {
        const query = 'SELECT id, nombre, email, rol, "createdAt", "updatedAt" FROM usuarios ORDER BY id DESC';
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
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

        const query = `
            UPDATE usuarios 
            SET rol = $1, "updatedAt" = NOW() 
            WHERE id = $2 
            RETURNING id, nombre, email, rol, "updatedAt"
        `;
        const result = await pool.query(query, [rol, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, mensaje: "Usuario no encontrado" });
        }

        res.status(200).json({ success: true, mensaje: `Rol actualizado a ${rol}`, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, mensaje: "Error al cambiar el rol" });
    }
};

module.exports = { login, register, getUsuarios, cambiarRol };