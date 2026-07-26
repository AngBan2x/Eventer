// Middleware estricto: exige que el usuario esté autenticado
const verifyAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !userRole || userRole === 'invitado') {
        return res.status(401).json({ mensaje: "No autenticado. Inicia sesión para continuar." });
    }

    req.user = {
        id: parseInt(userId),
        rol: userRole
    };

    next();
};

// Middleware opcional: si vienen headers asigna req.user, si no, permite continuar como invitado (req.user = null)
const optionalAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (userId && userRole && userRole !== 'invitado') {
        req.user = {
            id: parseInt(userId),
            rol: userRole
        };
    } else {
        req.user = null;
    }

    next();
};

// Middleware de autorización por roles
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ mensaje: "No autorizado" });
        }

        if (roles.length && !roles.includes(req.user.rol)) {
            return res.status(403).json({ mensaje: "Acceso prohibido para este rol" });
        }

        next();
    };
};

module.exports = { verifyAuth, optionalAuth, authorize };