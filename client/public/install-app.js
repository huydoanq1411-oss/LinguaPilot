(() => {
  window.bindLinguaPilotInstallButton = button => {
    if (!button) return;
    if (button.dataset.installBound) return;
    button.dataset.installBound = 'true';
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let installPrompt = null;
    button.hidden = standalone;

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      button.hidden = false;
    });

    button.addEventListener('click', async () => {
      if (installPrompt) {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') button.hidden = true;
        installPrompt = null;
        return;
      }
      if (isIOS) {
        alert('Để thêm app: nhấn nút Chia sẻ trong Safari, chọn “Thêm vào màn hình chính”, rồi nhấn “Thêm”.');
      } else {
        alert('Mở menu trình duyệt ⋮ rồi chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.');
      }
    });

    window.addEventListener('appinstalled', () => { button.hidden = true; });
  };
})();
