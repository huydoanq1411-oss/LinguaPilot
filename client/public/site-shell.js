(() => {
  const libraryHome = document.querySelector('.idx-topbar');
  if (libraryHome) {
    const actions = libraryHome.querySelector('.idx-topbar-btns');
    if (actions && !actions.querySelector('[data-lp-home]')) {
      const home = document.createElement('a');
      home.href = '/';
      home.dataset.lpHome = 'true';
      home.textContent = '⌂ LinguaPilot';
      actions.prepend(home);
    }
    return;
  }

  const nav = document.createElement('header');
  nav.className = 'lp-sitebar';
  nav.innerHTML = `
    <a class="lp-sitebar-brand" href="/" aria-label="LinguaPilot — trang chủ">
      <img src="/app-icon.svg" alt=""><span>lingua<span class="lp-muted">pilot</span></span>
    </a>
    <nav class="lp-sitebar-links" aria-label="Điều hướng chính">
      <a href="/">Trang chủ</a><a href="/jp/index.html">Khám phá</a><a href="/jp/cau-truc-jlpt.html">Kỳ thi JLPT</a>
    </nav>
    <div class="lp-sitebar-actions">
      <a class="lp-sitebar-home" href="/">← Trang chủ</a>
      <button class="lp-sitebar-install" id="siteInstallAppButton" type="button" aria-label="Thêm LinguaPilot vào màn hình chính" title="Thêm LinguaPilot vào màn hình chính" hidden>＋ Cài app</button>
    </div>`;
  document.body.prepend(nav);

  const bindButton = () => window.bindLinguaPilotInstallButton?.(document.getElementById('siteInstallAppButton'));
  if (window.bindLinguaPilotInstallButton) bindButton();
  else {
    const script = document.createElement('script');
    script.src = '/install-app.js';
    script.onload = bindButton;
    document.head.appendChild(script);
  }
})();
