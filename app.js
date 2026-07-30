// Xbox 360 Save Manager - Standalone Mobile PWA Engine
document.addEventListener('DOMContentLoaded', () => {

  // State
  let titlesCache = {};
  let currentConfig = {
    console_a: { name: "Xbox 360 Sala", ip: "192.168.60.182", port: 21, root_path: "Hdd1/Content/0000000000000000/" },
    console_b: { name: "Xbox 360 Quarto", ip: "192.168.1.15", port: 21, root_path: "Hdd1/Content/0000000000000000/" },
    profile_aliases: { "EE24390EB39C0968": "ReedyHades4024" }
  };

  let activePane = 'a';
  let currentAnalysis = null;

  // DOM Elements
  const navBtns = {
    sync: document.getElementById('nav-btn-sync'),
    browser: document.getElementById('nav-btn-browser'),
    profiles: document.getElementById('nav-btn-profiles'),
    backups: document.getElementById('nav-btn-backups')
  };

  const views = {
    sync: document.getElementById('view-sync'),
    browser: document.getElementById('view-browser'),
    profiles: document.getElementById('view-profiles'),
    backups: document.getElementById('view-backups')
  };

  const profileSelect = document.getElementById('profileSelect');
  const btnRefreshProfiles = document.getElementById('btnRefreshProfiles');
  const btnAliasProfile = document.getElementById('btnAliasProfile');
  const btnStartSync = document.getElementById('btnStartSync');
  const btnOpenProfileInBrowser = document.getElementById('btnOpenProfileInBrowser');

  const tabBtnA = document.getElementById('tab-btn-a');
  const tabBtnB = document.getElementById('tab-btn-b');
  const pathInput = document.getElementById('mobile-path-input');
  const btnGo = document.getElementById('btn-mobile-go');
  const btnUp = document.getElementById('btn-mobile-up');
  const btnRefreshFile = document.getElementById('btn-mobile-refresh');
  const mobileFileList = document.getElementById('mobile-file-list');

  const mobileProfilesList = document.getElementById('mobile-profiles-list');
  const btnRefreshProfileManager = document.getElementById('btnRefreshProfileManager');

  const modalConfig = document.getElementById('modal-mobile-config');
  const btnMobileConfig = document.getElementById('btn-mobile-config');
  const btnCloseModalConfig = document.getElementById('close-modal-mobile-config');
  const btnSaveMobileConfig = document.getElementById('btn-save-mobile-config');

  // Inicialização
  init();

  async function init() {
    loadLocalConfig();
    setupNavigation();
    await loadTitleDB();
    await checkConsolesStatus();
    await loadProfiles();
  }

  // 1. Carregar Configurações Salvas no Celular (localStorage)
  function loadLocalConfig() {
    const saved = localStorage.getItem('xbox_sync_mobile_config');
    if (saved) {
      try {
        currentConfig = JSON.parse(saved);
      } catch (e) {}
    }
    if (!currentConfig.profile_aliases) {
      currentConfig.profile_aliases = { "EE24390EB39C0968": "ReedyHades4024" };
    }
    updateConfigUI();
  }

  function saveLocalConfig() {
    localStorage.setItem('xbox_sync_mobile_config', JSON.stringify(currentConfig));
  }

  function updateConfigUI() {
    document.getElementById('name-a').textContent = currentConfig.console_a.name;
    document.getElementById('name-b').textContent = currentConfig.console_b.name;
    document.getElementById('tab-label-a').textContent = currentConfig.console_a.name;
    document.getElementById('tab-label-b').textContent = currentConfig.console_b.name;

    document.getElementById('cfg-name-a').value = currentConfig.console_a.name;
    document.getElementById('cfg-ip-a').value = currentConfig.console_a.ip;
    document.getElementById('cfg-port-a').value = currentConfig.console_a.port;

    document.getElementById('cfg-name-b').value = currentConfig.console_b.name;
    document.getElementById('cfg-ip-b').value = currentConfig.console_b.ip;
    document.getElementById('cfg-port-b').value = currentConfig.console_b.port;
  }

  // 2. Banco de Títulos Xbox 360
  async function loadTitleDB() {
    try {
      const res = await fetch('titles.json');
      const data = await res.json();
      data.forEach(item => {
        if (item.titleid && item.title) {
          titlesCache[item.titleid.toUpperCase()] = item.title;
        }
      });
    } catch (e) {
      console.warn("Title IDs dataset offline/fallback mode.");
    }
  }

  function getGameTitle(tid) {
    if (!tid) return null;
    const clean = tid.trim().toUpperCase();

    // Pastas triviais ignoradas
    if (["00000000", "00000001", "00000002", "00000003", "00010000", "00020000", "00070000", "00080000"].includes(clean)) {
      return null;
    }

    if (clean === "0000000000000000") return "📦 Conteúdo Geral / Jogos Sem Perfil";

    if (clean.length === 16 && (clean.startswith ? clean.startswith("E") : clean.startsWith("E") || clean.startsWith("0"))) {
      if (currentConfig.profile_aliases && currentConfig.profile_aliases[clean]) {
        return `👤 ${currentConfig.profile_aliases[clean]}`;
      }
      if (clean === "EE24390EB39C0968") return "👤 ReedyHades4024";
      if (clean.startsWith("E")) return "👤 Perfil";
    }

    if (titlesCache[clean]) return titlesCache[clean];

    if (clean.length === 8 && !clean.startsWith("0000")) {
      const var0 = clean.substring(0, 4) + '0' + clean.substring(5);
      if (titlesCache[var0]) return titlesCache[var0];
      const var8 = clean.substring(0, 4) + '8' + clean.substring(5);
      if (titlesCache[var8]) return titlesCache[var8];
    }
    return null;
  }

  // 3. Status dos Consoles na Rede Wi-Fi
  async function checkConsolesStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      const dotA = document.getElementById('dot-a');
      const textA = document.getElementById('text-a');
      if (data.console_a && data.console_a.online) {
        dotA.className = 'dot online';
        textA.textContent = 'Online';
      } else {
        dotA.className = 'dot offline';
        textA.textContent = 'Offline';
      }

      const dotB = document.getElementById('dot-b');
      const textB = document.getElementById('text-b');
      if (data.console_b && data.console_b.online) {
        dotB.className = 'dot online';
        textB.textContent = 'Online';
      } else {
        dotB.className = 'dot offline';
        textB.textContent = 'Offline';
      }
    } catch (e) {
      document.getElementById('text-a').textContent = 'Pronto Wi-Fi';
      document.getElementById('text-b').textContent = 'Pronto Wi-Fi';
    }
  }

  // 4. Navegação por Abas Inferiores
  function setupNavigation() {
    Object.keys(navBtns).forEach(key => {
      navBtns[key]?.addEventListener('click', () => switchView(key));
    });

    tabBtnA?.addEventListener('click', () => switchPane('a'));
    tabBtnB?.addEventListener('click', () => switchPane('b'));

    btnMobileConfig?.addEventListener('click', () => modalConfig.classList.remove('hidden'));
    btnCloseModalConfig?.addEventListener('click', () => modalConfig.classList.add('hidden'));

    btnSaveMobileConfig?.addEventListener('click', () => {
      currentConfig.console_a.name = document.getElementById('cfg-name-a').value.trim();
      currentConfig.console_a.ip = document.getElementById('cfg-ip-a').value.trim();
      currentConfig.console_a.port = parseInt(document.getElementById('cfg-port-a').value) || 21;

      currentConfig.console_b.name = document.getElementById('cfg-name-b').value.trim();
      currentConfig.console_b.ip = document.getElementById('cfg-ip-b').value.trim();
      currentConfig.console_b.port = parseInt(document.getElementById('cfg-port-b').value) || 21;

      saveLocalConfig();
      updateConfigUI();
      modalConfig.classList.add('hidden');
      alert('Configurações salvas!');
    });
  }

  function switchView(viewName) {
    Object.keys(navBtns).forEach(k => {
      if (k === viewName) {
        navBtns[k].classList.add('active');
        views[k].classList.remove('hidden');
      } else {
        navBtns[k].classList.remove('active');
        views[k].classList.add('hidden');
      }
    });

    if (viewName === 'profiles') renderMobileProfilesManager();
    if (viewName === 'browser') loadMobileDirectory();
  }

  function switchPane(paneKey) {
    activePane = paneKey;
    if (paneKey === 'a') {
      tabBtnA.classList.add('active');
      tabBtnB.classList.remove('active');
      pathInput.value = currentConfig.console_a.root_path;
    } else {
      tabBtnB.classList.add('active');
      tabBtnA.classList.remove('active');
      pathInput.value = currentConfig.console_b.root_path;
    }
    loadMobileDirectory();
  }

  // 5. Carregar Perfis dos Consoles
  async function loadProfiles() {
    try {
      profileSelect.innerHTML = '<option value="ALL">Carregando perfis...</option>';
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (data.success && data.profiles) {
        profileSelect.innerHTML = '';
        data.profiles.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          profileSelect.appendChild(opt);
        });
      } else {
        profileSelect.innerHTML = '<option value="ALL">🌐 Todos os Perfis (Sincronização Completa)</option>';
      }
    } catch (e) {
      profileSelect.innerHTML = '<option value="ALL">🌐 Todos os Perfis (Sincronização Completa)</option>';
    }
  }

  btnRefreshProfiles?.addEventListener('click', loadProfiles);

  btnAliasProfile?.addEventListener('click', () => {
    const selectedPid = profileSelect.value;
    if (!selectedPid || selectedPid === 'ALL' || selectedPid === '0000000000000000') {
      alert('Selecione um perfil de usuário específico na lista para renomear.');
      return;
    }
    editProfileAlias(selectedPid);
  });

  async function editProfileAlias(pid) {
    const currentAlias = currentConfig.profile_aliases[pid] || '';
    const newAlias = prompt(`Digite o apelido desejado para o perfil (${pid}):\n(Deixe em branco para remover)`, currentAlias);
    if (newAlias === null) return;

    if (newAlias.trim()) {
      currentConfig.profile_aliases[pid] = newAlias.trim();
    } else {
      delete currentConfig.profile_aliases[pid];
    }
    saveLocalConfig();

    try {
      await fetch('/api/profiles/alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: pid, alias: newAlias.trim() })
      });
    } catch (e) {}

    await loadProfiles();
    renderMobileProfilesManager();
  }

  // 6. File Browser Mobile
  async function loadMobileDirectory() {
    const currPath = pathInput.value;
    mobileFileList.innerHTML = `<li class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Carregando arquivos...</li>`;

    try {
      const consoleKey = activePane === 'a' ? 'console_a' : 'console_b';
      const res = await fetch('/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ console: consoleKey, path: currPath })
      });

      const data = await res.json();
      if (!data.success) {
        mobileFileList.innerHTML = `<li class="empty-state text-danger">⚠️ ${data.error}</li>`;
        return;
      }

      mobileFileList.innerHTML = '';
      if (!data.items || data.items.length === 0) {
        mobileFileList.innerHTML = `<li class="empty-state">Pasta vazia</li>`;
        return;
      }

      data.items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'mobile-file-item';

        const gameTitle = getGameTitle(item.name);
        let nameDisplay = item.display_name || item.name;
        if (gameTitle) {
          nameDisplay = gameTitle.startsWith('👤') || gameTitle.startsWith('📦') ? `${gameTitle} (${item.name})` : `🎮 ${gameTitle} (${item.name})`;
        }

        const iconHtml = item.is_dir ? '<i class="fa-solid fa-folder folder"></i>' : '<i class="fa-solid fa-file-code file"></i>';

        li.innerHTML = `
          <div class="file-info">
            ${iconHtml}
            <div class="file-names">
              <strong>${nameDisplay}</strong>
              <span>${item.is_dir ? 'Diretório' : (item.size / 1024).toFixed(1) + ' KB'}</span>
            </div>
          </div>
        `;

        if (item.is_dir) {
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => {
            const newPath = currPath.replace(/\/$/, '') + '/' + item.name;
            pathInput.value = newPath;
            loadMobileDirectory();
          });
        }

        mobileFileList.appendChild(li);
      });

    } catch (e) {
      mobileFileList.innerHTML = `<li class="empty-state text-danger">Erro de conexão: ${e.message}</li>`;
    }
  }

  btnGo?.addEventListener('click', loadMobileDirectory);
  btnRefreshFile?.addEventListener('click', loadMobileDirectory);
  btnUp?.addEventListener('click', () => {
    let curr = pathInput.value.replace(/\/$/, '');
    const parts = curr.split('/');
    if (parts.length > 1) {
      parts.pop();
      pathInput.value = parts.join('/') + '/';
      loadMobileDirectory();
    }
  });

  // 7. Gestor de Perfis Mobile
  function renderMobileProfilesManager() {
    mobileProfilesList.innerHTML = '';
    const aliases = currentConfig.profile_aliases || {};

    const knownPids = Object.keys(aliases);
    if (!knownPids.includes('EE24390EB39C0968')) knownPids.push('EE24390EB39C0968');

    knownPids.forEach(pid => {
      const alias = aliases[pid] || (pid === 'EE24390EB39C0968' ? 'ReedyHades4024' : 'Sem Apelido');
      const card = document.createElement('div');
      card.className = 'profile-mobile-card';

      card.innerHTML = `
        <div class="pm-info">
          <i class="fa-solid fa-user"></i>
          <div class="pm-details">
            <strong>${alias}</strong>
            <code>${pid}</code>
          </div>
        </div>
        <button class="btn-icon-square btn-edit-mobile-alias" data-pid="${pid}">
          <i class="fa-solid fa-pen"></i>
        </button>
      `;

      card.querySelector('.btn-edit-mobile-alias').addEventListener('click', () => {
        editProfileAlias(pid);
      });

      mobileProfilesList.appendChild(card);
    });
  }

  btnRefreshProfileManager?.addEventListener('click', renderMobileProfilesManager);

  // 8. Abrir Perfil Direto no Browser Mobile
  btnOpenProfileInBrowser?.addEventListener('click', () => {
    const selectedPid = profileSelect.value;
    if (!selectedPid || selectedPid === 'ALL') {
      alert('Selecione um perfil específico antes de abrir.');
      return;
    }

    switchView('browser');
    pathInput.value = selectedPid === '0000000000000000' ? 'Hdd1/Content/0000000000000000' : `Hdd1/Content/${selectedPid}`;
    loadMobileDirectory();
  });

});
