Actúa como un programador experto en Node.js y desarrollo web. Necesito crear la estructura inicial de una aplicación web monolítica para gestionar eventos en la facultad FaCyT. El backend debe usar Express y almacenar los datos de los eventos y espacios en un archivo local db.json. Genérame el código para un servidor básico en server.js que tenga dos rutas (endpoints) de tipo GET y POST: una para registrar un evento con sus datos (nombre, fecha, hora, espacio, responsable, estado) y otra para consultar todos los eventos registrados. Haz el código lo más limpio y documentado posible.
---
¡Hola! Como experto en Node.js, me encantaría ayudarte a sentar las bases de este proyecto para la FaCyT. Para una aplicación monolítica que utiliza un archivo local como persistencia, seguiremos una estructura limpia, separando la lógica de acceso a datos de los controladores de ruta.

A continuación, te presento la estructura y el código necesario.

### 1. Inicialización del proyecto

Primero, asegúrate de tener una carpeta para el proyecto y ejecuta:

```bash
npm init -y
npm install express
```

### 2. Estructura de archivos sugerida

```text
facyt-eventos/
├── db.json           # Nuestra "base de datos" local
├── server.js         # Punto de entrada y lógica del servidor
└── package.json
```

### 3. Creación del archivo `db.json`

Crea este archivo con una estructura inicial vacía:

```json db.json
{
  "eventos": []
}
```

### 4. Implementación del servidor (`server.js`)

Aquí tienes el código de `server.js` con comentarios detallados y buenas prácticas:

```javascript server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware para parsear JSON en el cuerpo de las peticiones
app.use(express.json());

/**
 * Funciones de utilidad para interactuar con db.json
 */
const readDB = async () => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error leyendo la base de datos:", error);
        return { eventos: [] };
    }
};

const writeDB = async (data) => {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error escribiendo en la base de datos:", error);
    }
};

// --- RUTAS (ENDPOINTS) ---

/**
 * @route   GET /eventos
 * @desc    Obtener todos los eventos registrados
 */
app.get('/eventos', async (req, res) => {
    try {
        const db = await readDB();
        res.status(200).json({
            success: true,
            data: db.eventos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener eventos" });
    }
});

/**
 * @route   POST /eventos
 * @desc    Registrar un nuevo evento
 */
app.post('/eventos', async (req, res) => {
    try {
        const { nombre, fecha, hora, espacio, responsable, estado } = req.body;

        // Validación básica
        if (!nombre || !fecha || !espacio || !responsable) {
            return res.status(400).json({
                success: false,
                message: "Por favor, completa los campos obligatorios (nombre, fecha, espacio, responsable)."
            });
        }

        const db = await readDB();

        // Crear el nuevo objeto de evento
        const nuevoEvento = {
            id: Date.now(), // ID sencillo basado en timestamp
            nombre,
            fecha,
            hora: hora || "No especificada",
            espacio,
            responsable,
            estado: estado || "pendiente", // Estado por defecto
            createdAt: new Date().toISOString()
        };

        // Guardar en el array y persistir en el archivo
        db.eventos.push(nuevoEvento);
        await writeDB(db);

        res.status(201).json({
            success: true,
            message: "Evento registrado exitosamente",
            data: nuevoEvento
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error al registrar el evento" });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(` Servidor FaCyT Eventos corriendo en:`);
    console.log(` http://localhost:${PORT}`);
    console.log(`==========================================`);
});
```

### Características destacadas del código:

1.  **Manejo Asíncrono (`async/await`)**: Se utiliza el módulo `fs.promises` para evitar bloquear el hilo principal de Node.js al leer o escribir en el archivo JSON.
2.  **Validación de Datos**: En el endpoint `POST`, se verifica que los campos obligatorios estén presentes antes de intentar guardar.
3.  **Persistencia Limpia**: `JSON.stringify(data, null, 2)` permite que el archivo `db.json` se mantenga legible para humanos (con indentación).
4.  **Respuesta Estructurada**: Todas las respuestas devuelven un objeto con una propiedad `success` y `data` o `message`, lo cual es una excelente práctica para facilitar el consumo desde el frontend.
5.  **Robustez**: Se incluyen bloques `try-catch` para manejar posibles errores de lectura/escritura de archivos.

### Cómo probarlo:

1.  **Iniciar el servidor**: `node server.js`
2.  **Registrar un evento (POST)**: Usa Postman o cURL:
    ```bash
    curl -X POST http://localhost:3000/eventos \
    -H "Content-Type: application/json" \
    -d '{"nombre": "Seminario AI", "fecha": "2023-12-01", "espacio": "Aula Magna", "responsable": "Dr. Garcia"}'
    ```
3.  **Consultar eventos (GET)**:
    ```bash
    curl http://localhost:3000/eventos
    ```

¿Te gustaría que añadamos alguna validación específica para los espacios de la facultad o que implementemos el sistema de rutas en archivos separados?

---
Implementemos el sistema en archivos separados
---

Excelente decisión. Separar el código en capas (Rutas, Controladores y Persistencia) hace que la aplicación sea mucho más escalable, fácil de testear y profesional.

Aquí tienes la estructura de archivos propuesta y el código correspondiente:

### Nueva Estructura de Proyecto

```text
facyt-eventos/
├── data/
│   └── db.json              # "Base de datos"
├── src/
│   ├── controllers/
│   │   └── eventos.controller.js  # Lógica de negocio
│   ├── routes/
│   │   └── eventos.routes.js      # Definición de rutas
│   ├── utils/
│   │   └── dbHandler.js           # Utilidades para leer/escribir el JSON
│   └── app.js                     # Configuración de Express
├── server.js                      # Punto de entrada (Arranque)
└── package.json
```

---

### 1. Persistencia: `src/utils/dbHandler.js`
Esta capa se encarga exclusivamente de interactuar con el archivo físico.

```javascript src/utils/dbHandler.js
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
```

---

### 2. Controlador: `src/controllers/eventos.controller.js`
Aquí reside la lógica de qué hacer cuando llega una petición.

```javascript src/controllers/eventos.controller.js
const { readDB, writeDB } = require('../utils/dbHandler');

/**
 * Obtiene todos los eventos
 */
const getEventos = async (req, res) => {
    try {
        const db = await readDB();
        res.status(200).json({ success: true, data: db.eventos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Crea un nuevo evento
 */
const createEvento = async (req, res) => {
    try {
        const { nombre, fecha, hora, espacio, responsable, estado } = req.body;

        if (!nombre || !fecha || !espacio || !responsable) {
            return res.status(400).json({ 
                success: false, 
                message: "Faltan campos obligatorios" 
            });
        }

        const db = await readDB();
        
        const nuevoEvento = {
            id: Date.now(),
            nombre,
            fecha,
            hora: hora || "Por definir",
            espacio,
            responsable,
            estado: estado || "pendiente",
            createdAt: new Date().toISOString()
        };

        db.eventos.push(nuevoEvento);
        await writeDB(db);

        res.status(201).json({ success: true, data: nuevoEvento });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getEventos,
    createEvento
};
```

---

### 3. Rutas: `src/routes/eventos.routes.js`
Define los endpoints y los vincula a sus controladores.

```javascript src/routes/eventos.routes.js
const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventos.controller');

// Definición de endpoints
router.get('/', eventosController.getEventos);
router.post('/', eventosController.createEvento);

module.exports = router;
```

---

### 4. Configuración de App: `src/app.js`
Configura middlewares y centraliza las rutas.

```javascript src/app.js
const express = require('express');
const eventosRoutes = require('./routes/eventos.routes');

const app = express();

// Middlewares
app.use(express.json());

// Rutas
app.use('/api/eventos', eventosRoutes);

// Ruta base de prueba
app.get('/', (req, res) => {
    res.json({ message: "Bienvenido a la API de Gestión de Eventos FaCyT" });
});

module.exports = app;
```

---

### 5. Punto de entrada: `server.js`
Solo se encarga de levantar el servidor.

```javascript server.js
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`📌 Endpoints disponibles:`);
    console.log(`   - GET  /api/eventos`);
    console.log(`   - POST /api/eventos`);
});
```

---

### 6. Inicialización de datos: `data/db.json`
Asegúrate de crear la carpeta `data` y el archivo `db.json`:

```json data/db.json
{
  "eventos": []
}
```

### Ventajas de este enfoque:
1.  **Mantenibilidad**: Si mañana decides cambiar `db.json` por MongoDB o PostgreSQL, solo tienes que modificar `dbHandler.js`.
2.  **Legibilidad**: Cada archivo tiene una única responsabilidad (Principio de Responsabilidad Única).
3.  **Escalabilidad**: Si necesitas gestionar "Espacios" o "Usuarios", simplemente creas nuevas carpetas de controladores y rutas siguiendo el mismo patrón.
4.  **Organización**: Las rutas ahora están prefijadas con `/api/eventos`, lo que permite versionar tu API fácilmente en el futuro.

Para ejecutarlo, simplemente usa:
```bash
node server.js
```