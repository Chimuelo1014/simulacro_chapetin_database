// frontend/js/auth.js
const form = document.getElementById('loginForm');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries(fd);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    window.location.href = '/dashboard.html';
  } else {
    alert(data.message || 'Error');
  }
});
