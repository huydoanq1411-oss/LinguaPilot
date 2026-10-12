(() => {
  const libraryHome = document.querySelector('.idx-topbar');
  if (libraryHome) {
    const actions = libraryHome.querySelector('.idx-topbar-btns');
    if (actions && !actions.querySelector('[data-lp-home]')) {
      const home = document.createElement('a');
      home.href = '/';
      home.dataset.lpHome = 'true';
      home.className = 'idx-home-link';
      home.setAttribute('aria-label', 'LinguaPilot - trang ch\u1ee7');
      home.innerHTML = '<span class="idx-home-icon" aria-hidden="true">\u2302</span><span>Trang ch\u1ee7</span>';
      actions.prepend(home);
    }
    return;
  }

  const nav = document.createElement('header');
  nav.className = 'lp-sitebar';
  nav.innerHTML = `
    <a class="lp-sitebar-brand" href="/" aria-label="LinguaPilot - trang ch\u1ee7">
      <img src="/app-icon.svg" alt=""><span>lingua<span class="lp-muted">pilot</span></span>
    </a>
    <nav class="lp-sitebar-links" aria-label="\u0110i\u1ec1u h\u01b0\u1edbng ch\u00ednh">
      <a href="/">Trang ch\u1ee7</a><a href="/jp/index.html">Kh\u00e1m ph\u00e1</a><a href="/jp/cau-truc-jlpt.html">K\u1ef3 thi JLPT</a>
    </nav>
    <div class="lp-sitebar-actions">
      <a class="lp-sitebar-home" href="/">&larr; Trang ch\u1ee7</a>
      <button class="lp-sitebar-install" id="siteInstallAppButton" type="button" aria-label="Th\u00eam LinguaPilot v\u00e0o m\u00e0n h\u00ecnh ch\u00ednh" title="Th\u00eam LinguaPilot v\u00e0o m\u00e0n h\u00ecnh ch\u00ednh" hidden>+ C\u00e0i app</button>
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
