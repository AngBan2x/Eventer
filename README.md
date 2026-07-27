# BM Eventer 🗓️✨

Sistema web integral desarrollado para la gestión, control y optimización de espacios físicos y eventos académicos en la **Facultad Experimental de Ciencias y Tecnología (FaCyT)** de la Universidad de Carabobo (UC).

## 🚀 Acerca del Proyecto

**BM Eventer** surge como una solución tecnológica para centralizar la planificación de actividades extracurriculares, clases especiales, talleres y jornadas de pasantías. Su objetivo principal es automatizar la verificación de disponibilidad de espacios (aulas, laboratorios y auditorios), eliminar los tradicionales choques de horarios, y dotar al Decanato y a los administradores de un panel de métricas para la toma de decisiones informadas sobre mantenimiento y uso de instalaciones.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap (Diseño SPA responsivo).
*   **Backend:** Node.js, Express.js.
*   **Base de Datos:** PostgreSQL (Gestión de registros relacionales, integridad referencial y marcas de tiempo).
*   **Entorno de Ejecución:** Linux / Ubuntu vía WSL2 (Windows Subsystem for Linux).

---

## ✨ Funcionalidades Principales

1. **Gestión de Espacios Físicos:**
   * Registro y configuración de aulas, laboratorios y auditorios especificando su capacidad máxima y tipo.
2. **Solicitud Automatizada de Eventos:**
   * Formularios interactivos para que los profesores y organizadores programen actividades (nombre, fecha, hora, responsable y espacio requerido).
3. **Validación Algorítmica de Conflictos (Regla de Negocio):**
   * El *backend* intercepta cada intento de registro y evalúa en tiempo real si el espacio seleccionado ya se encuentra ocupado en la misma fecha y hora por un evento activo, bloqueando solapamientos de manera automática.
4. **Ciclo de Vida y Gestión de Estados:**
   * Control administrativo de los eventos a través de tres estados principales: `solicitado`, `aprobado` y `cancelado/rechazado`.
5. **Eliminación Lógica:**
   * Borrado seguro de registros que libera el espacio físico para nuevas reservas, pero preserva la trazabilidad histórica de las solicitudes en la base de datos.
6. **Cartelera Pública Dinámica:**
   * Visualización en tiempo real de la oferta académica y de eventos activos para toda la comunidad de la FaCyT.
7. **Dashboard Directivo:**
   * Panel de resumen estadístico para las autoridades con métricas clave (total de eventos procesados, espacios más demandados y próximos a realizarse).

---

## 📐 Flujo del Sistema

1. **Solicitud:** El organizador ingresa los datos del evento en la plataforma web.
2. **Validación:** El servidor evalúa la disponibilidad del espacio en la base de datos PostgreSQL.
   * *Si hay choque:* Se rechaza la operación y se notifica al usuario.
   * *Si está libre:* Se almacena con estado `solicitado` y se actualiza la cartelera.
3. **Aprobación:** El administrador evalúa la pertinencia académica y cambia el estado a `aprobado` o `cancelado`.

---

## 👥 Equipo de Desarrollo

* **Angel Bandres**
* **Joshtin Mejías**

*Asignatura: CA0702 - Sistemas de Información (1-2026)*
