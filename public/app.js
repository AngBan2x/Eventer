let eventosCache = [];
let usuariosCache = [];

document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfazSegunRol();
    loadDashboard();
    loadEventos();
    loadEspacios();

    const inputBuscar = document.getElementById('buscar-usuario');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', (e) => {
            filtrarYRenderizarUsuarios(e.target.value);
        });
    }

    // Evento Formulario de Registro
    document.getElementById('form-registro').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const data = {
                nombre: document.getElementById('reg-nombre').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                password: document.getElementById('reg-password').value
            };

            const result = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (result && result.success) {
                alert('¡Registro exitoso! Has iniciado sesión como Estudiante.');
                setSesionUsuario(result.data);

                const modalEl = document.getElementById('modalAuth');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                document.getElementById('form-registro').reset();
            } else {
                alert('Error al registrarse: ' + (result?.mensaje || result?.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al registrar:', error);
            alert('No se pudo conectar con el servidor.');
        }
    });

    // Evento Formulario de Login
    document.getElementById('form-login').addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const data = {
                email: document.getElementById('login-email').value.trim(),
                password: document.getElementById('login-password').value
            };

            const result = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (result && result.success) {
                alert(`¡Bienvenido de nuevo, ${result.data.nombre}!`);
                setSesionUsuario(result.data);

                const modalEl = document.getElementById('modalAuth');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                document.getElementById('form-login').reset();
            } else {
                alert('Error: ' + (result?.mensaje || 'Credenciales incorrectas'));
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            alert('No se pudo conectar con el servidor.');
        }
    });

    // Solicitar evento
    document.getElementById('form-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getCurrentUser();

        let responsableInput = document.getElementById('responsable').value.trim();
        if (!responsableInput) {
            responsableInput = (user && user.nombre && user.nombre !== 'Invitado') ? user.nombre : 'Sin responsable';
        }

        const descripcionTexto = document.getElementById('descripcion').value.trim();

        const data = {
            nombre: document.getElementById('nombre').value.trim(),
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            espacio: document.getElementById('select-espacios').value,
            responsable: responsableInput,
            descripcion: descripcionTexto,
            description: descripcionTexto, // Para asegurar compatibilidad con la API
            usuario_id: user.id,
            estado: 'pendiente'
        };

        const result = await apiFetch('/api/eventos', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result && result.success) {
            alert('Evento solicitado con éxito.');
            document.getElementById('form-evento').reset();
            
            const tabEventos = new bootstrap.Tab(document.getElementById('btn-tab-eventos'));
            tabEventos.show();
            
            await loadEventos();
            await loadDashboard();
        } else {
            alert('Error: ' + (result?.message || result?.mensaje));
        }
    });

    // Editar evento
    document.getElementById('form-editar-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const descripcionTexto = document.getElementById('edit-descripcion').value.trim();

        const data = {
            nombre: document.getElementById('edit-nombre').value.trim(),
            fecha: document.getElementById('edit-fecha').value, // CORREGIDO: era id 'fecha'
            hora: document.getElementById('edit-hora').value,
            espacio: document.getElementById('edit-select-espacios').value,
            responsable: document.getElementById('edit-responsable').value.trim(),
            descripcion: descripcionTexto,
            description: descripcionTexto, // Para asegurar compatibilidad con la API
            estado: 'pendiente',
            nota_rechazo: '',
            motivo: ''
        };

        const resData = await apiFetch(`/api/eventos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        const resEstado = await apiFetch(`/api/eventos/${id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ 
                estado: 'pendiente', 
                nota_rechazo: '', 
                motivo: '' 
            })
        });

        if ((resData && resData.success) || (resEstado && resEstado.success)) {
            alert('✅ Evento actualizado y reenviado a revisión.');
            
            const modalEl = document.getElementById('modalEditarEvento');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            await loadEventos();
            await loadDashboard();
        } else {
            alert('Error en el servidor: ' + (resData?.mensaje || resData?.message || 'No se pudo actualizar'));
        }
    });

    // Rechazar evento
    document.getElementById('form-rechazar-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('rechazar-id').value;
        const motivo = document.getElementById('rechazar-motivo').value.trim();

        const result = await apiFetch(`/api/eventos/${id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'rechazado', motivo })
        });

        if (result && result.success) {
            const modalEl = document.getElementById('modalRechazarEvento');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            loadEventos();
            loadDashboard();
        } else {
            alert('Error: ' + (result?.message || result?.mensaje));
        }
    });
});

function getCurrentUser() {
    const userStr = localStorage.getItem('usuario_facyt');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            localStorage.removeItem('usuario_facyt');
        }
    }
    return { id: 0, nombre: 'Invitado', rol: 'invitado' };
}

function setSesionUsuario(usuario) {
    if (usuario) {
        localStorage.setItem('usuario_facyt', JSON.stringify(usuario));
    } else {
        localStorage.removeItem('usuario_facyt');
    }
    actualizarInterfazSegunRol();
    loadEventos();
    loadDashboard();
}

function cerrarSesion() {
    setSesionUsuario(null);
    alert('Sesión cerrada correctamente.');
}

async function apiFetch(url, options = {}) {
    try {
        const user = getCurrentUser();

        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': String(user.id),
            'x-user-role': user.rol,
            ...(options.headers || {})
        };

        const resp = await fetch(url, { ...options, headers });

        const contentType = resp.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const errorText = await resp.text();
            console.error('El servidor no devolvió JSON:', errorText);
            return { 
                success: false, 
                mensaje: `Error ${resp.status}: La ruta no existe en el backend o el servidor falló.` 
            };
        }

        return await resp.json();
    } catch (err) {
        console.error('Error en apiFetch:', err);
        return { success: false, mensaje: 'Error de red o servidor no disponible' };
    }
}

function actualizarInterfazSegunRol() {
    const user = getCurrentUser();
    
    // 1. Renderizar Navbar
    const authNav = document.getElementById('auth-nav-container');
    if (user.rol === 'invitado' || user.id === 0) {
        authNav.innerHTML = `
            <button class="btn btn-light btn-sm fw-bold text-primary px-3" onclick="abrirModalAuth('login')">
                🔑 Acceder
            </button>
        `;
    } else {
        authNav.innerHTML = `
            <span class="text-white small me-2 d-none d-sm-inline">
                👤 <strong>${user.nombre}</strong> 
                <span class="badge bg-light text-dark ms-1">${user.rol}</span>
            </span>
            <button class="btn btn-outline-light btn-sm" onclick="cerrarSesion()">Salir</button>
        `;
    }

    // 2. Control de Pestañas y Secciones
    const navItemNuevo = document.getElementById('nav-item-nuevo');
    const navItemUsuarios = document.getElementById('nav-item-usuarios');
    const seccionHistorial = document.getElementById('seccion-historial-admin');
    const seccionPendientes = document.getElementById('seccion-pendientes');

    if (user.rol === 'estudiante' || user.rol === 'invitado') {
        if (navItemNuevo) navItemNuevo.classList.add('d-none');
        const tabNuevo = document.getElementById('tab-nuevo');
        if (tabNuevo && tabNuevo.classList.contains('active')) {
            const btnEventos = document.getElementById('btn-tab-eventos');
            const tab = new bootstrap.Tab(btnEventos);
            tab.show();
        }
    } else {
        if (navItemNuevo) navItemNuevo.classList.remove('d-none');
    }

    if (user.rol === 'admin' || user.rol === 'organizador') {
        if (seccionPendientes) seccionPendientes.classList.remove('d-none');
    } else {
        if (seccionPendientes) seccionPendientes.classList.add('d-none');
    }

    if (user.rol === 'admin') {
        if (navItemUsuarios) navItemUsuarios.classList.remove('d-none');
        if (seccionHistorial) seccionHistorial.classList.remove('d-none');
        loadUsuarios();
    } else {
        if (navItemUsuarios) navItemUsuarios.classList.add('d-none');
        if (seccionHistorial) seccionHistorial.classList.add('d-none');

        const tabUsuarios = document.getElementById('tab-usuarios');
        if (tabUsuarios && tabUsuarios.classList.contains('active')) {
            const btnEventos = document.getElementById('btn-tab-eventos');
            const tab = new bootstrap.Tab(btnEventos);
            tab.show();
        }
    }

    const verColumnaEstado = user.rol === 'admin' || user.rol === 'organizador';
    document.querySelectorAll('.th-estado').forEach(th => {
        if (verColumnaEstado) {
            th.classList.remove('d-none');
        } else {
            th.classList.add('d-none');
        }
    });
}

function abrirModalAuth(pestana = 'login') {
    const modalEl = document.getElementById('modalAuth');
    const modal = new bootstrap.Modal(modalEl);

    if (pestana === 'registro') {
        const tabRegistro = new bootstrap.Tab(document.getElementById('pills-registro-tab'));
        tabRegistro.show();
    } else {
        const tabLogin = new bootstrap.Tab(document.getElementById('pills-login-tab'));
        tabLogin.show();
    }

    modal.show();
}

async function loadDashboard() {
    const container = document.getElementById('resumen-container');
    if (!container) return;

    const result = await apiFetch('/api/eventos');
    if (!result || !result.data) return;

    const hoy = new Date().toISOString().split('T')[0];

    const aprobados = result.data.filter(e => 
        String(e.estado || '').toLowerCase().trim() === 'aprobado'
    );

    const proximos = aprobados
        .filter(e => e.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    
    const proximoNombre = proximos.length > 0 ? proximos[0].nombre : 'Ninguno';

    const conteoEspacios = {};
    aprobados.forEach(e => {
        if (e.espacio) {
            conteoEspacios[e.espacio] = (conteoEspacios[e.espacio] || 0) + 1;
        }
    });
    
    const espacioTop = Object.keys(conteoEspacios).sort((a, b) => conteoEspacios[b] - conteoEspacios[a])[0] || 'N/A';

    container.innerHTML = `
        <div class="col-12 col-md-4 mb-2 mb-md-0">
            <div class="card bg-primary text-white p-3 shadow-sm border-0">
                <small class="text-white-50 text-uppercase fw-bold">Total Aprobados</small>
                <h2 class="mb-0 fw-bold">${aprobados.length}</h2>
            </div>
        </div>
        <div class="col-12 col-md-4 mb-2 mb-md-0">
            <div class="card bg-success text-white p-3 shadow-sm border-0">
                <small class="text-white-50 text-uppercase fw-bold">Próximo Evento</small>
                <p class="mb-0 fw-bold text-truncate">${proximoNombre}</p>
            </div>
        </div>
        <div class="col-12 col-md-4">
            <div class="card bg-info text-white p-3 shadow-sm border-0">
                <small class="text-white-50 text-uppercase fw-bold">Espacio Principal</small>
                <p class="mb-0 fw-bold text-truncate">${espacioTop}</p>
            </div>
        </div>
    `;
}

async function loadEventos() {
    const result = await apiFetch('/api/eventos');
    const user = getCurrentUser();

    if (!result || !result.data) return;
    const data = result.data;
    eventosCache = data;

    const hoy = new Date().toISOString().split('T')[0];
    const verColumnaEstado = user.rol === 'admin' || user.rol === 'organizador';
    const totalColumnas = verColumnaEstado ? 6 : 5;

    const getEstado = (e) => (e.estado ? String(e.estado).toLowerCase().trim() : 'pendiente');

    const proximos = data.filter(e => getEstado(e) === 'aprobado' && e.fecha >= hoy);

    const recientesRealizados = data
        .filter(e => getEstado(e) === 'aprobado' && e.fecha < hoy)
        .reverse()
        .slice(0, 2);

    let pendientes = [];

    if (user.rol === 'admin') {
        pendientes = data.filter(e => getEstado(e) === 'pendiente');
    } else if (user.rol === 'organizador') {
        pendientes = data.filter(e => {
            const est = getEstado(e);
            const esRevisable = est === 'pendiente' || est === 'rechazado';

            const idCreador = Number(e.usuario_id || e.usuarioId || e.userId || 0);
            const esMismoId = idCreador > 0 && idCreador === Number(user.id);
            const esMismoNombre = e.responsable && user.nombre && 
                                 e.responsable.toLowerCase().trim() === user.nombre.toLowerCase().trim();

            const esSuEvento = esMismoId || esMismoNombre || (!e.usuario_id && !e.usuarioId);

            return esRevisable && esSuEvento;
        });
    }

    const historialAprobados = data.filter(e => getEstado(e) === 'aprobado');

    const tbodyProximos = document.getElementById('lista-proximos-eventos');
    if (tbodyProximos) {
        tbodyProximos.innerHTML = proximos.length > 0 
            ? proximos.map(e => generarFilaEvento(e, user)).join('')
            : `<tr><td colspan="${totalColumnas}" class="text-center text-muted py-3">No hay próximos eventos programados</td></tr>`;
    }

    const tbodyRecientes = document.getElementById('lista-eventos-recientes');
    if (tbodyRecientes) {
        tbodyRecientes.innerHTML = recientesRealizados.length > 0 
            ? recientesRealizados.map(e => generarFilaEvento(e, user)).join('')
            : `<tr><td colspan="${totalColumnas}" class="text-center text-muted py-3">No hay eventos recientes realizados</td></tr>`;
    }

    const tbodyPendientes = document.getElementById('lista-solicitudes-pendientes');
    if (tbodyPendientes) {
        tbodyPendientes.innerHTML = pendientes.length > 0 
            ? pendientes.map(e => generarFilaEvento(e, user)).join('')
            : `<tr><td colspan="${totalColumnas}" class="text-center text-muted py-3">No hay solicitudes pendientes en este momento</td></tr>`;
    }

    const tbodyHistorial = document.getElementById('lista-historial-admin');
    if (tbodyHistorial) {
        tbodyHistorial.innerHTML = historialAprobados.length > 0
            ? historialAprobados.map(e => generarFilaEvento(e, user, true)).join('')
            : `<tr><td colspan="7" class="text-center text-muted py-3">No hay eventos aprobados en el historial</td></tr>`;
    }
}

function generarFilaEvento(e, user, esHistorialAdmin = false) {
    const hoy = new Date().toISOString().split('T')[0];
    const esPasado = e.fecha < hoy;
    const estadoNorm = (e.estado || 'pendiente').toString().toLowerCase();

    const idCreador = Number(e.usuario_id || e.usuarioId || e.userId || 0);
    const esOwner = (idCreador > 0 && idCreador === Number(user.id)) || 
                    (e.responsable && user.nombre && e.responsable.toLowerCase().trim() === user.nombre.toLowerCase().trim()) ||
                    !e.usuario_id;
    
    const esAdmin = user.rol === 'admin';
    const verColumnaEstado = esAdmin || user.rol === 'organizador';

    let celdaEstadoHTML = '';
    if (verColumnaEstado) {
        let badgeClass = 'bg-warning text-dark';
        if (estadoNorm === 'aprobado') badgeClass = 'bg-success';
        if (estadoNorm === 'rechazado') badgeClass = 'bg-danger';
        if (estadoNorm === 'cancelado') badgeClass = 'bg-secondary';

        let htmlNota = '';
        if (estadoNorm === 'rechazado' && (e.nota_rechazo || e.motivo)) {
            const motivoTexto = e.nota_rechazo || e.motivo;
            htmlNota = `<div class="mt-1 small text-danger border-start border-3 border-danger ps-2 bg-light rounded py-1">
                <strong>Motivo rechazo:</strong> ${motivoTexto}
            </div>`;
        }

        celdaEstadoHTML = `<td data-label="Estado"><span class="badge ${badgeClass}">${e.estado || 'pendiente'}</span>${htmlNota}</td>`;
    }

    let acciones = '';

    if (esOwner && !esPasado) {
        const textoBtn = estadoNorm === 'rechazado' ? '✏️ Corregir' : 'Editar';
        const claseBtn = estadoNorm === 'rechazado' ? 'btn-outline-warning text-dark' : 'btn-outline-primary';
        acciones += `<button class="btn btn-sm ${claseBtn} me-1 mb-1" onclick="abrirModalEditar(${e.id})">${textoBtn}</button>`;
    }

    if (esAdmin) {
        if (!esPasado) {
            if (estadoNorm !== 'aprobado') {
                acciones += `<button class="btn btn-sm btn-success me-1 mb-1" onclick="cambiarEstado(${e.id}, 'aprobado')">Aprobar</button>`;
            }
            if (estadoNorm !== 'rechazado') {
                acciones += `<button class="btn btn-sm btn-warning me-1 mb-1" onclick="abrirModalRechazar(${e.id})">Rechazar</button>`;
            }
        }
        acciones += `<button class="btn btn-sm btn-danger me-1 mb-1" onclick="eliminarEvento(${e.id})">Eliminar</button>`;
    } 
    
    if (estadoNorm === 'aprobado' && !esPasado) {
        acciones += `<button class="btn btn-sm btn-outline-success mb-1" onclick="marcarAsistencia(${e.id})">Asistir</button>`;
    }

    const totalAsistentes = typeof e.asistencias === 'number' ? e.asistencias : (e.asistencias?.length || 0);
    const celdaId = esHistorialAdmin ? `<td data-label="ID"><small class="text-muted fw-bold">#${e.id}</small></td>` : '';

    // CORREGIDO: Sin espacios ni saltos de línea internos en el contenedor HTML
    const descTexto = (e.descripcion || e.description || '').trim();
    let htmlDescripcion = '';
    if (descTexto) {
        htmlDescripcion = `
            <div class="text-start mb-2 w-100">
                <details>
                    <summary class="text-primary small fw-semibold" style="cursor: pointer; user-select: none; font-size: 0.85rem;">
                        Ver descripción
                    </summary>
                    <div class="mt-2 p-2 bg-light rounded text-dark border-start border-3 border-primary shadow-sm" style="white-space: pre-wrap; font-size: 0.825rem; line-height: 1.35;">${descTexto}</div>
                </details>
            </div>
        `;
    }

    return `
        <tr>
            ${celdaId}
            <td data-label="Evento">
                <strong>${e.nombre}</strong><br>
                <small class="text-muted">Resp: ${e.responsable || 'Sin responsable'}</small>
            </td>
            <td data-label="Fecha/Hora">${e.fecha}<br><small class="text-muted">${e.hora}</small></td>
            <td data-label="Espacio"><span class="badge bg-secondary">${e.espacio}</span></td>
            ${celdaEstadoHTML}
            <td data-label="Asistentes">
                <span class="badge bg-light text-dark border">
                    👥 ${totalAsistentes} confirmados
                </span>
            </td>
            <td class="actions-cell text-end">
                ${htmlDescripcion}
                ${acciones || '<small class="text-muted">Sin acciones</small>'}
            </td>
        </tr>
    `;
}

async function loadEspacios() {
    const result = await apiFetch('/api/espacios');
    if (!result || !result.data) return;
    const data = result.data;

    const select = document.getElementById('select-espacios');
    const selectEdit = document.getElementById('edit-select-espacios');

    const optionsHtml = data.map(es => `<option value="${es.nombre}">${es.nombre}</option>`).join('');

    if (select) select.innerHTML = optionsHtml;
    if (selectEdit) selectEdit.innerHTML = optionsHtml;

    const container = document.getElementById('lista-espacios');
    if (container) {
        container.innerHTML = data.map(es => `
            <div class="col-12 col-md-4 mb-2">
                <div class="border p-3 rounded bg-white shadow-sm">
                    <h6 class="fw-bold mb-1">${es.nombre}</h6>
                    <small class="text-muted d-block">Tipo: ${es.tipo || 'N/A'}</small>
                    <small class="text-muted d-block">Capacidad: ${es.capacidad || 'N/A'} personas</small>
                </div>
            </div>
        `).join('');
    }
}

async function loadUsuarios() {
    const result = await apiFetch('/api/auth/usuarios');
    if (!result || !result.success) return;

    usuariosCache = result.data || [];
    
    const textoBusqueda = document.getElementById('buscar-usuario')?.value || '';
    filtrarYRenderizarUsuarios(textoBusqueda);
}

function filtrarYRenderizarUsuarios(filtro = '') {
    const tbody = document.getElementById('lista-usuarios');
    if (!tbody) return;

    const currentUser = getCurrentUser();
    const termino = filtro.toLowerCase().trim();

    const usuariosFiltrados = usuariosCache.filter(u => 
        (u.nombre && u.nombre.toLowerCase().includes(termino)) ||
        (u.email && u.email.toLowerCase().includes(termino))
    );

    if (usuariosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No se encontraron usuarios que coincidan con "${filtro}"</td></tr>`;
        return;
    }

    tbody.innerHTML = usuariosFiltrados.map(u => {
        const esMismoUsuario = Number(u.id) === Number(currentUser.id);
        const isDisabled = esMismoUsuario ? 'disabled' : '';
        const etiquetaMismoUsuario = esMismoUsuario ? '<span class="badge bg-secondary ms-1">Tú</span>' : '';

        return `
            <tr>
                <td data-label="ID">${u.id}</td>
                <td data-label="Nombre"><strong>${u.nombre}</strong> ${etiquetaMismoUsuario}</td>
                <td data-label="Email">${u.email}</td>
                <td data-label="Rol Actual"><span class="badge bg-info text-dark">${u.rol}</span></td>
                <td data-label="Nuevo Rol">
                    <select class="form-select form-select-sm" ${isDisabled} onchange="cambiarRolUsuario(${u.id}, this.value)">
                        <option value="estudiante" ${u.rol === 'estudiante' ? 'selected' : ''}>Estudiante</option>
                        <option value="organizador" ${u.rol === 'organizador' ? 'selected' : ''}>Organizador</option>
                        <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

async function cambiarRolUsuario(id, nuevoRol) {
    const currentUser = getCurrentUser();

    if (Number(id) === Number(currentUser.id)) {
        alert('No puedes cambiar tu propio rol de administrador.');
        loadUsuarios();
        return;
    }

    const result = await apiFetch(`/api/auth/usuarios/${id}/rol`, {
        method: 'PUT',
        body: JSON.stringify({ rol: nuevoRol })
    });

    if (result && result.success) {
        alert(`Rol actualizado con éxito a ${nuevoRol}`);
        loadUsuarios();
    } else {
        alert('Error: ' + (result?.mensaje || 'No se pudo cambiar el rol'));
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
    // CORREGIDO: Lee la descripción considerando ambas propiedades
    document.getElementById('edit-descripcion').value = evento.descripcion || evento.description || '';

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

    if (result && result.success) {
        loadEventos();
        loadDashboard();
    } else {
        alert('Error: ' + (result?.message || result?.mensaje));
    }
}

async function marcarAsistencia(id) {
    const user = getCurrentUser();

    if (user.rol === 'invitado' || user.id === 0) {
        abrirModalAuth('registro');
        return;
    }

    const result = await apiFetch(`/api/eventos/${id}/asistir`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
    });

    if (result && result.success) {
        alert('¡Asistencia registrada exitosamente!');
        await loadEventos();
    } else {
        alert('Nota: ' + (result?.message || result?.mensaje));
    }
}

async function eliminarEvento(id) {
    if (confirm('¿Estás seguro de eliminar este evento?')) {
        const result = await apiFetch(`/api/eventos/${id}`, { method: 'DELETE' });
        if (result && result.success) {
            loadEventos();
            loadDashboard();
        } else {
            alert('Error: ' + (result?.message || result?.mensaje));
        }
    }
}