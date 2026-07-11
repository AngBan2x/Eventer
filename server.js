const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`📌 Endpoints disponibles:`);
    console.log(`   - GET  /api/eventos`);
    console.log(`   - POST /api/eventos`);
});