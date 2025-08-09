document.getElementById('resetPacientes').addEventListener('click', async () => {
  if (!confirm('¿Seguro que quieres reiniciar la tabla de pacientes? Esto borrará todos los registros.')) return;

  const res = await fetch('/api/reset/pacientes', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  });

  const data = await res.json();
  alert(data.message);
  fetchPacientes();
});


// frontend/js/pacientes.js
const token = localStorage.getItem('token');
if (!token) { window.location.href = '/login.html'; }

const tbody = document.getElementById('tbodyPacientes');
const form = document.getElementById('formPaciente');
const modalEl = document.getElementById('modalAdd');
const modal = new bootstrap.Modal(modalEl);

async function fetchPacientes() {
  const res = await fetch('/api/pacientes', { headers: { Authorization: 'Bearer ' + token }});
  const data = await res.json();
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.id_paciente}</td>
      <td>${p.nombre_paciente}</td>
      <td>${p.correo_paciente}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="edit(${p.id_paciente})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="del(${p.id_paciente})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

window.edit = async (id) => {
  const res = await fetch('/api/pacientes/' + id, { headers: { Authorization: 'Bearer ' + token }});
  const data = await res.json();
  document.getElementById('id_paciente').value = data.id_paciente;
  document.getElementById('nombre_paciente').value = data.nombre_paciente;
  document.getElementById('correo_paciente').value = data.correo_paciente;
  modal.show();
}

window.del = async (id) => {
  if (!confirm('Eliminar paciente?')) return;
  await fetch('/api/pacientes/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token }});
  fetchPacientes();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries(fd);
  if (body.id_paciente) {
    await fetch('/api/pacientes/' + body.id_paciente, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ nombre_paciente: body.nombre_paciente, correo_paciente: body.correo_paciente })
    });
  } else {
    await fetch('/api/pacientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ nombre_paciente: body.nombre_paciente, correo_paciente: body.correo_paciente })
    });
  }
  form.reset();
  modal.hide();
  fetchPacientes();
});

fetchPacientes();
