
document.getElementById('resetMedicos').addEventListener('click', async () => {
  if (!confirm('¿Seguro que quieres reiniciar la tabla de médicos? Esto también borrará todas las citas relacionadas.')) return;

  const res = await fetch('/api/reset/medicos', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + tokenM }
  });

  const data = await res.json();
  alert(data.message);
  fetchMedicos();
});

// frontend/js/medicos.js
const tokenM = localStorage.getItem('token');
if (!tokenM) window.location.href = '/login.html';
const tbodyM = document.getElementById('tbodyMedicos');
const formM = document.getElementById('formMed');
const modalMed = new bootstrap.Modal(document.getElementById('modalMed'));

async function fetchMedicos() {
  const res = await fetch('/api/medicos', { headers: { Authorization: 'Bearer ' + tokenM }});
  const data = await res.json();
  tbodyM.innerHTML = data.map(m => `
    <tr>
      <td>${m.id_medico}</td><td>${m.nombre_medico}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editMed(${m.id_medico})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="delMed(${m.id_medico})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

window.editMed = async (id) => {
  const res = await fetch('/api/medicos', { headers: { Authorization: 'Bearer ' + tokenM }});
  const data = await res.json();
  const m = data.find(x => x.id_medico === id);
  document.getElementById('id_medico').value = m.id_medico;
  document.getElementById('nombre_medico').value = m.nombre_medico;
  modalMed.show();
}

window.delMed = async (id) => {
  if (!confirm('Eliminar médico?')) return;
  await fetch('/api/medicos/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tokenM }});
  fetchMedicos();
}

formM.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formM);
  const b = Object.fromEntries(fd);
  if (b.id_medico) {
    await fetch('/api/medicos/' + b.id_medico, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenM },
      body: JSON.stringify({ nombre_medico: b.nombre_medico })
    });
  } else {
    await fetch('/api/medicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenM },
      body: JSON.stringify({ nombre_medico: b.nombre_medico })
    });
  }
  formM.reset();
  modalMed.hide();
  fetchMedicos();
});

fetchMedicos();
