document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadEventos();
    loadEspacios();

    // Manejar el formulario de nuevo evento
    document.getElementById('form-evento').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nombre: document.getElementById('nombre').value,
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            espacio: document.getElementById('select-espacios').value,
            responsable: document.getElementById('responsable').value
        };

        const resp = await fetch('/api/eventos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await resp.json();
        if (result.success) {
            alert('Evento creado con éxito');
            location.reload();
        } else {
            alert('Error: ' + result.message);
        }
    });
});

async function loadDashboard() {
    const resp = await fetch('/api/eventos/resumen');
    const { data } = await resp.json();
    const container = document.getElementById('resumen-container');
    
    container.innerHTML = `
        <div class="col-md-4">
            <div class="card bg-primary text-white p-3">
                <h5>Total Eventos</h5>
                <h2 class="mb-0">${data.total}</h2>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card bg-success text-white p-3">
                <h5>Próximo Evento</h5>
                <p class="mb-0">${data.proximos[0]?.nombre || 'Ninguno'}</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card bg-info text-white p-3">
                <h5>Espacio más usado</h5>
                <p class="mb-0">${Object.keys(data.espaciosMasUsados)[0] || 'N/A'}</p>
            </div>
        </div>
    `;
}

async function loadEventos() {
    const resp = await fetch('/api/eventos');
    const { data } = await resp.json();
    const tbody = document.getElementById('lista-eventos');
    tbody.innerHTML = data.map(e => `
        <tr>
            <td><strong>${e.nombre}</strong><br><small class="text-muted">${e.responsable}</small></td>
            <td>${e.fecha}<br>${e.hora}</td>
            <td><span class="badge bg-secondary">${e.espacio}</span></td>
            <td><span class="badge ${e.estado === 'aprobado' ? 'bg-success' : 'bg-warning'}">${e.estado}</span></td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="eliminarEvento(${e.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

async function loadEspacios() {
    const resp = await fetch('/api/espacios');
    const { data } = await resp.json();
    
    // Llenar el select del formulario
    const select = document.getElementById('select-espacios');
    select.innerHTML = data.map(es => `<option value="${es.nombre}">${es.nombre}</option>`).join('');

    // Llenar la lista visual de espacios
    const container = document.getElementById('lista-espacios');
    container.innerHTML = data.map(es => `
        <div class="col-md-4 mb-3">
            <div class="border p-2 rounded">
                <h6>${es.nombre}</h6>
                <small>Tipo: ${es.tipo} | Capacidad: ${es.capacidad}</small>
            </div>
        </div>
    `).join('');
}

async function eliminarEvento(id) {
    if (confirm('¿Estás seguro de eliminar este evento?')) {
        await fetch(`/api/eventos/${id}`, { method: 'DELETE' });
        location.reload();
    }
}