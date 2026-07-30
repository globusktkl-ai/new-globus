document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const { data, error } = await window.supabaseClient
    .from('office_users')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .eq('is_active', true)
    .single();
  if (error || !data) {
    alert('Invalid email or password');
    return;
  }
  localStorage.setItem('office_logged_in','true');
  localStorage.setItem('office_user_name', data.full_name || 'Office');
  window.location.replace('index.html');
});