const verifyAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !userRole) {
        return res.status(401).json({ mensaje: "No autenticado. Se requieren headers x-user-id y x-user-role." });
    }

    req.user = {
        id: parseInt(userId),
        rol: userRole
    };

    next();
};

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

module.exports = { verifyAuth, authorize };