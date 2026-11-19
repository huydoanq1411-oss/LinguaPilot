(() => {
  const tokenKey = 'linguapilot_token';
  const loginUrl = () => `/?next=${encodeURIComponent(location.pathname + location.search + location.hash)}#account`;
  let token;
  try { token = localStorage.getItem(tokenKey); } catch { /* Login page explains storage requirements. */ }
  if (!token) {
    location.replace(loginUrl());
    return;
  }
  document.querySelector('.lesson-loading')?.removeAttribute('hidden');

  async function load() {
    const status = document.getElementById('lesson-status');
    try {
      const configResponse = await fetch('/app-config.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!configResponse.ok) throw new Error('Không tải được cấu hình ứng dụng.');
      const { apiUrl } = await configResponse.json();
      status.textContent = 'Đang chuẩn bị nội dung cho bạn…';
      const page = location.pathname.split('/').pop() || 'index.html';
      const response = await fetch(`${apiUrl}/lessons/${encodeURIComponent(page)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) {
        try { localStorage.removeItem(tokenKey); } catch { /* Redirect even if storage is blocked. */ }
        location.replace(loginUrl());
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được bài học.');
      if (typeof data.html !== 'string') throw new Error('Dữ liệu bài học không hợp lệ.');
      if (localStorage.getItem(tokenKey) !== token) {
        location.replace(loginUrl());
        return;
      }
      // Only authenticated API responses contain lesson HTML and quiz data.
      document.open();
      document.write(data.html);
      document.close();
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) location.reload();
      });
      window.addEventListener('storage', (event) => {
        if ((event.key === tokenKey || event.key === null) && event.newValue !== token) location.replace(loginUrl());
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          try { if (localStorage.getItem(tokenKey) !== token) location.replace(loginUrl()); } catch { location.replace(loginUrl()); }
        }
      });
    } catch {
      document.querySelector('.lesson-loading')?.setAttribute('data-state', 'error');
      document.querySelector('.lesson-loading')?.setAttribute('aria-busy', 'false');
      status.textContent = 'Chưa tải được bài học. Hãy kiểm tra kết nối và thử lại.';
      document.getElementById('lesson-retry').hidden = false;
    }
  }
  document.getElementById('lesson-retry').addEventListener('click', () => location.reload());
  load();
})();
