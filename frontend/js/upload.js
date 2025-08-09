// frontend/js/upload.js
const tokenU = localStorage.getItem('token');
if (!tokenU) window.location.href = '/login.html';

async function uploadFile(file, endpoint) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload/' + endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tokenU },
    body: fd
  });
  const data = await res.json();
  alert(data.message || 'Hecho');
}

document.getElementById('btnPac').addEventListener('click', () => {
  const f = document.getElementById('csvPac').files[0];
  if (!f) return alert('Selecciona csv');
  uploadFile(f, 'pacientes');
});

document.getElementById('btnMed').addEventListener('click', () => {
  const f = document.getElementById('csvMed').files[0];
  if (!f) return alert('Selecciona csv');
  uploadFile(f, 'medicos');
});

document.getElementById('btnCitas').addEventListener('click', () => {
  const f = document.getElementById('csvCitas').files[0];
  if (!f) return alert('Selecciona csv');
  uploadFile(f, 'citas');
});
