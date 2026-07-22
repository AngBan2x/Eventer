// Variable global auxiliar para guardar eventos cargados
let eventosCache = [];

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
            
            const tabEventos = new bootstrap.Tab(document.getElementById('btn-tab-eventos'));
            tabEventos.show();
            loadEventos();
            loadDashboard();
        } else {
            alert('Error: ' + result.message);
        }
    });

    // Listener para guardar cambios al editar un evento
    document.getElementById('form-editar-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;

        const data = {
            nombre: document.getElementById('edit-nombre').value,
            fecha: document.getElementById('edit-fecha').value,
            hora: document.getElementById('edit-hora').value,
            espacio: document.getElementById('edit-select-espacios').value,
            responsable: document.getElementById('edit-responsable').value
        };

        const result = await apiFetch(`/api/eventos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (result.success) {
            alert('Evento actualizado correctamente. Si estaba aprobado/rechazado, ha pasado a estado "solicitado" para revisión.');
            const modalEl = document.getElementById('modalEditarEvento');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            loadEventos();
            loadDashboard();
        } else {
            alert('Error al actualizar: ' + result.message);
        }
    });

    // Listener para confirmar rechazo con nota opcional
    document.getElementById('form-rechazar-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('rechazar-id').value;
        const motivo = document.getElementById('rechazar-motivo').value.trim();

        const result = await apiFetch(`/api/eventos/${id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'rechazado', motivo })
        });

        if (result.success) {
            const modalEl = document.getElementById('modalRechazarEvento');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            loadEventos();
            loadDashboard();
        } else {
            alert('Error: ' + result.message);
        }
    });
});

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

function actualizarInterfazSegunRol() {
    const user = getCurrentUser();
    const navItemNuevo = document.getElementById('nav-item-nuevo');

    if (user.rol === 'estudiante') {
        navItemNuevo.classList.add('d-none');
        
        const tabNuevo = document.getElementById('tab-nuevo');
        if (tabNuevo && tabNuevo.classList.contains('active')) {
            const btnEventos = document.getElementById('btn-tab-eventos');
            const tab = new bootstrap.Tab(btnEventos);
            tab.show();
        }
    } else {
        navItemNuevo.classList.remove('d-none');
    }
}

async function loadDashboard() {
    const { data } = await apiFetch('/api/eventos/resumen');
    const container = document.getElementById('resumen-container');
    
    if (!data) return;

    // Obtener las claves y ordenarlas descendentemente según la frecuencia
    const espacios = data.espaciosMasUsados || {};
    const espacioTop = Object.keys(espacios).sort((a, b) => espacios[b] - espacios[a])[0] || 'N/A';

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
                <h5>Espacio más solicitado</h5>
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

    eventosCache = data;

    tbody.innerHTML = data.map(e => {
        let badgeClass = 'bg-warning text-dark';
        if (e.estado === 'aprobado') badgeClass = 'bg-success';
        if (e.estado === 'rechazado') badgeClass = 'bg-danger';
        if (e.estado === 'cancelado') badgeClass = 'bg-secondary';

        const totalAsistentes = typeof e.asistencias === 'number' ? e.asistencias : 0;
        const esOwner = Number(e.usuario_id) === Number(user.id);

        let acciones = '';

        // Botón Editar: visible SOLO para el organizador/creador del evento
        if (esOwner) {
            acciones += `<button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditar(${e.id})">Editar</button>`;
        }

        // Acciones del Administrador
        if (user.rol === 'admin') {
            if (e.estado !== 'aprobado') {
                acciones += `<button class="btn btn-sm btn-success me-1" onclick="cambiarEstado(${e.id}, 'aprobado')">Aprobar</button>`;
            }
            if (e.estado !== 'rechazado') {
                acciones += `<button class="btn btn-sm btn-warning me-1" onclick="abrirModalRechazar(${e.id})">Rechazar</button>`;
            }
            acciones += `<button class="btn btn-sm btn-danger me-1" onclick="eliminarEvento(${e.id})">Eliminar</button>`;
        } 
        
        // Botón "Asistir" para eventos aprobados
        if (e.estado === 'aprobado') {
            acciones += `<button class="btn btn-sm btn-outline-success ms-1" onclick="marcarAsistencia(${e.id})">Asistir</button>`;
        }

        // Nota de rechazo (si existe y el evento fue rechazado)
        let htmlNota = '';
        if (e.estado === 'rechazado' && e.nota_rechazo) {
            htmlNota = `<div class="mt-1 small text-danger border-start border-danger ps-2 bg-light rounded py-1">
                <strong>Motivo de rechazo:</strong> ${e.nota_rechazo}
            </div>`;
        }

        return `
            <tr>
                <td>
                    <strong>${e.nombre}</strong><br>
                    <small class="text-muted">${e.responsable || 'Sin responsable'}</small>
                </td>
                <td>${e.fecha}<br><small class="text-muted">${e.hora}</small></td>
                <td><span class="badge bg-secondary">${e.espacio}</span></td>
                <td>
                    <span class="badge ${badgeClass}">${e.estado}</span>
                    ${htmlNota}
                </td>
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
    const selectEdit = document.getElementById('edit-select-espacios');

    const optionsHtml = data.map(es => `<option value="${es.nombre}">${es.nombre}</option>`).join('');

    if (select) select.innerHTML = optionsHtml;
    if (selectEdit) selectEdit.innerHTML = optionsHtml;

    const container = document.getElementById('lista-espacios');
    if (container) {
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
}

function abrirModalEditar(id) {
    const evento = eventosCache.find(e => e.id == id);
    if (!evento) return;

    document.getElementById('edit-id').value = evento.id;
    document.getElementById('edit-nombre').value = evento.nombre;
    document.getElementById('edit-fecha').value = evento.fecha;
    document.getElementById('edit-hora').value = evento.hora;
    document.getElementById('edit-select-espacios').value = evento.espacio;
    document.getElementById('edit-responsable').value = evento.responsable || '';

    const modal = new bootstrap.Modal(document.getElementById('modalEditarEvento'));
    modal.show();
}

function abrirModalRechazar(id) {
    document.getElementById('rechazar-id').value = id;
    document.getElementById('rechazar-motivo').value = '';

    const modal = new bootstrap.Modal(document.getElementById('modalRechazarEvento'));
    modal.show();
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