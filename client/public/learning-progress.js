(() => {
  // The API inserts this script with the verified account ID before lesson scripts run.
  const userId = document.currentScript?.dataset.userId;
  if (!userId) return;
  const prefix = `linguapilot_progress:${userId}:`;
  const importedKey = 'linguapilot_progress:legacy-imported-by';
  const progressKey = /^(done_bai\d+|ch_done_\d+)$/;
  let token;
  try { token = localStorage.getItem('linguapilot_token'); } catch { /* Reads and writes report storage failure below. */ }

  function requireSession() {
    if (!token || localStorage.getItem('linguapilot_token') !== token) {
      throw new Error('Phiên học đã thay đổi. Hãy tải lại trang.');
    }
  }

  function legacyKeys() {
    return Object.keys(localStorage).filter(key => progressKey.test(key));
  }

  window.LinguaPilotProgress = {
    getItem(key) {
      requireSession();
      return localStorage.getItem(progressKey.test(key) ? prefix + key : key);
    },
    setItem(key, value) {
      requireSession();
      localStorage.setItem(progressKey.test(key) ? prefix + key : key, value);
    },
    completedCount() {
      requireSession();
      return Object.keys(localStorage).filter(key =>
        key.startsWith(prefix + 'done_bai') &&
        progressKey.test(key.slice(prefix.length)) && localStorage.getItem(key) === '1'
      ).length;
    },
    importLegacy() {
      requireSession();
      if (localStorage.getItem(importedKey)) return false;
      for (const key of legacyKeys()) {
        // Keep explicit unchecked values in the account too; never overwrite current progress.
        if (localStorage.getItem(prefix + key) === null) {
          localStorage.setItem(prefix + key, localStorage.getItem(key));
        }
      }
      localStorage.setItem(importedKey, userId);
      return true;
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    const summary = document.getElementById('myProgressBar');
    if (!summary) return;
    try {
      requireSession();
      if (localStorage.getItem(importedKey) || !legacyKeys().length) return;
      const notice = document.createElement('aside');
      notice.className = 'lp-legacy-progress';
      const text = document.createElement('p');
      text.textContent = 'Trình duyệt có tiến độ cũ chưa gắn với tài khoản. Chỉ nhập nếu đây là tiến độ của bạn. Bản cũ vẫn được giữ lại; tiến độ hiện tại không bị ghi đè.';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Nhập tiến độ cũ vào tài khoản này';
      button.addEventListener('click', () => {
        try {
          window.LinguaPilotProgress.importLegacy();
          location.reload();
        } catch {
          window.dispatchEvent(new Event('lp-storage-error'));
        }
      });
      notice.append(text, button);
      summary.after(notice);
    } catch {
      window.dispatchEvent(new Event('lp-storage-error'));
    }
  });
})();
