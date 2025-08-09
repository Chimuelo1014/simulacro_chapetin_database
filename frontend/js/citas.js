
document.getElementById('resetCitas').addEventListener('click', async () => {
  if (!confirm('¿Seguro que quieres reiniciar todas las citas?')) return;

  const res = await fetch('/api/reset/cita', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + tokenC }
  });

  const data = await res.json();
  alert(data.message);
  fetchCitas();
});

// frontend/js/citas.js
const tokenC = localStorage.getItem('token');
if (!tokenC) window.location.href = '/login.html';
const tbodyC = document.getElementById('tbodyCitas');
const selPaciente = document.getElementById('selPaciente');
const selMedico = document.getElementById('selMedico');
const formCita = document.getElementById('formCita');
const modalCita = new bootstrap.Modal(document.getElementById('modalCita'));

async function fetchCombos() {
  const [pRes, mRes] = await Promise.all([
    fetch('/api/pacientes', { headers: { Authorization: 'Bearer ' + tokenC }}),
    fetch('/api/medicos', { headers: { Authorization: 'Bearer ' + tokenC }})
  ]);
  const [pacientes, medicos] = await Promise.all([pRes.json(), mRes.json()]);
  selPaciente.innerHTML = pacientes.map(p => `<option value="${p.id_paciente}">${p.nombre_paciente}</option>`).join('');
  selMedico.innerHTML = medicos.map(m => `<option value="${m.id_medico}">${m.nombre_medico}</option>`).join('');
}

async function fetchCitas() {
  const res = await fetch('/api/citas', { headers: { Authorization: 'Bearer ' + tokenC }});
  const data = await res.json();
  tbodyC.innerHTML = data.map(c => `
    <tr>
      <td>${c.id_cita}</td>
      <td>${c.nombre_paciente}</td>
      <td>${c.nombre_medico}</td>
      <td>${c.fecha_cita}</td>
      <td>${c.hora_cita}</td>
      <td>${c.estatus_cita || ''}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editCita(${c.id_cita})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="delCita(${c.id_cita})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

window.editCita = async (id) => {
  const res = await fetch('/api/citas', { headers: { Authorization: 'Bearer ' + tokenC }});
  const all = await res.json();
  const c = all.find(x => x.id_cita === id);
  document.getElementById('id_cita').value = c.id_cita;
  document.getElementById('fecha_cita').value = c.fecha_cita;
  document.getElementById('hora_cita').value = c.hora_cita;
  document.getElementById('formCita').elements['motivo'].value = c.motivo;
  document.getElementById('formCita').elements['estatus_cita'].value = c.estatus_cita;
  document.getElementById('selPaciente').value = c.id_paciente;
  document.getElementById('selMedico').value = c.id_medico;
  modalCita.show();
}

window.delCita = async (id) => {
  if (!confirm('Eliminar cita?')) return;
  await fetch('/api/citas/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tokenC }});
  fetchCitas();
}

formCita.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formCita);
  const b = Object.fromEntries(fd);
  if (b.id_cita) {
    await fetch('/api/citas/' + b.id_cita, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenC },
      body: JSON.stringify(b)
    });
  } else {
    await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenC },
      body: JSON.stringify(b)
    });
  }
  formCita.reset();
  modalCita.hide();
  fetchCitas();
});

await fetchCombos();
fetchCitas();
