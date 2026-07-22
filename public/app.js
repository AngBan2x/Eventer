document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfazSegunRol();
    loadDashboard();
    loadEventos();
    loadEspacios();

    // Recargar y adaptar interfaz al cambiar de usuario
    document.getElementById('user-selector').addEventListener('change', () => {
        actualizarInterfazSegunRol();
        loadEventos();
    });

    // Manejar la solicitud de nuevo evento
    document.getElementById('form-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            nombre: document.getElementById('nombre').value,
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            espacio: document.getElementById('select-espacios').value,
            responsable: document.getElementById('responsable').value
        };

        const result = await apiFetch('/api/eventos', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result.success) {
            alert('Evento solicitado con éxito. Quedará en espera de aprobación.');
            document.getElementById('form-evento').reset();
            
            // Volver a la pestaña de eventos y recargar
            const tabEventos = new bootstrap.Tab(document.getElementById('btn-tab-eventos'));
            tabEventos.show();
            loadEventos();
            loadDashboard();
        } else {
            alert('Error: ' + result.message);
        }
    });
});

// Función auxiliar para peticiones HTTP con encabezados de autenticación
async function apiFetch(url, options = {}) {
    const userSelect = document.getElementById('user-selector');
    const user = JSON.parse(userSelect.value);

    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': String(user.id),
        'x-user-role': user.rol,
        ...(options.headers || {})
    };

    const resp = await fetch(url, { ...options, headers });
    return await resp.json();
}

function getCurrentUser() {
    return JSON.parse(document.getElementById('user-selector').value);
}

// Oculta/muestra elementos según las facultades del rol actual
function actualizarInterfazSegunRol() {
    const user = getCurrentUser();
    const navItemNuevo = document.getElementById('nav-item-nuevo');

    if (user.rol === 'estudiante') {
        navItemNuevo.classList.add('d-none'); // Ocultar pestaña "Solicitar Evento"
        
        // Si el estudiante estaba parado en la pestaña de nuevo evento, mandarlo a la lista
        const tabNuevo = document.getElementById('tab-nuevo');
        if (tabNuevo && tabNuevo.classList.contains('active')) {
            const btnEventos = document.getElementById('btn-tab-eventos');
            const tab = new bootstrap.Tab(btnEventos);
            tab.show();
        }
    } else {
        navItemNuevo.classList.remove('d-none'); // Mostrar para organizadores y admin
    }
}

async function loadDashboard() {
    const { data } = await apiFetch('/api/eventos/resumen');
    const container = document.getElementById('resumen-container');
    
    if (!data) return;

    const espacioTop = Object.keys(data.espaciosMasUsados || {})[0] || 'N/A';

    container.innerHTML = `
        <div class="col-md-4">
            <div class="card bg-primary text-white p-3 shadow-sm">
                <h5>Total Eventos</h5>
                <h2 class="mb-0">${data.total || 0}</h2>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card bg-success text-white p-3 shadow-sm">
                <h5>Próximo Evento</h5>
                <p class="mb-0">${data.proximos?.[0]?.nombre || 'Ninguno'}</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card bg-info text-white p-3 shadow-sm">
                <h5>Espacio más usado</h5>
                <p class="mb-0">${espacioTop}</p>
            </div>
        </div>
    `;
}

async function loadEventos() {
    const { data } = await apiFetch('/api/eventos');
    const user = getCurrentUser();
    const tbody = document.getElementById('lista-eventos');

    if (!data) return;

    tbody.innerHTML = data.map(e => {
        let badgeClass = 'bg-warning text-dark';
        if (e.estado === 'aprobado') badgeClass = 'bg-success';
        if (e.estado === 'rechazado') badgeClass = 'bg-danger';
        if (e.estado === 'cancelado') badgeClass = 'bg-secondary';

        // Conteo dinámico de asistencias desde el objeto que envía el backend
        const totalAsistentes = typeof e.asistencias === 'number' ? e.asistencias : 0;

        let acciones = '';

        // Acciones Administrador
        if (user.rol === 'admin') {
            if (e.estado !== 'aprobado') {
                acciones += `<button class="btn btn-sm btn-success me-1" onclick="cambiarEstado(${e.id}, 'aprobado')">Aprobar</button>`;
            }
            if (e.estado !== 'rechazado') {
                acciones += `<button class="btn btn-sm btn-warning me-1" onclick="cambiarEstado(${e.id}, 'rechazado')">Rechazar</button>`;
            }
            acciones += `<button class="btn btn-sm btn-danger" onclick="eliminarEvento(${e.id})">Eliminar</button>`;
        } 
        
        // El botón "Asistir" SOLO se muestra si el evento está aprobado
        if (e.estado === 'aprobado') {
            acciones += `<button class="btn btn-sm btn-outline-primary ms-1" onclick="marcarAsistencia(${e.id})">Asistir</button>`;
        }

        return `
            <tr>
                <td><strong>${e.nombre}</strong><br><small class="text-muted">${e.responsable || 'Sin responsable'}</small></td>
                <td>${e.fecha}<br><small class="text-muted">${e.hora}</small></td>
                <td><span class="badge bg-secondary">${e.espacio}</span></td>
                <td><span class="badge ${badgeClass}">${e.estado}</span></td>
                <td>
                    <span class="badge bg-light text-dark border">
                        👥 ${totalAsistentes} confirmados
                    </span>
                </td>
                <td class="text-end">${acciones || '<small class="text-muted">Sin acciones</small>'}</td>
            </tr>
        `;
    }).join('');
}

async function loadEspacios() {
    const { data } = await apiFetch('/api/espacios');
    if (!data) return;

    const select = document.getElementById('select-espacios');
    select.innerHTML = data.map(es => `<option value="${es.nombre}">${es.nombre}</option>`).join('');

    const container = document.getElementById('lista-espacios');
    container.innerHTML = data.map(es => `
        <div class="col-md-4 mb-3">
            <div class="border p-3 rounded bg-white shadow-sm">
                <h6 class="fw-bold mb-1">${es.nombre}</h6>
                <small class="text-muted d-block">Tipo: ${es.tipo || 'N/A'}</small>
                <small class="text-muted d-block">Capacidad: ${es.capacidad || 'N/A'} personas</small>
            </div>
        </div>
    `).join('');
}

async function cambiarEstado(id, estado) {
    const result = await apiFetch(`/api/eventos/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado })
    });

    if (result.success) {
        loadEventos();
        loadDashboard();
    } else {
        alert('Error: ' + result.message);
    }
}

async function marcarAsistencia(id) {
    const user = getCurrentUser();

    const result = await apiFetch(`/api/eventos/${id}/asistir`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
    });

    if (result.success) {
        alert('¡Asistencia registrada exitosamente!');
        await loadEventos();
    } else {
        alert('Nota: ' + result.message);
    }
}

async function eliminarEvento(id) {
    if (confirm('¿Estás seguro de eliminar este evento?')) {
        const result = await apiFetch(`/api/eventos/${id}`, { method: 'DELETE' });
        if (result.success) {
            loadEventos();
            loadDashboard();
        } else {
            alert('Error: ' + result.message);
        }
    }
}