export const DASHBOARD_PRELOAD = `
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("logitechApi", {
  getState: () => ipcRenderer.invoke("dashboard:get-state"),
  updateSettings: (settings) => ipcRenderer.invoke("dashboard:update-settings", settings),
  refresh: () => ipcRenderer.invoke("dashboard:refresh"),
  reconnect: () => ipcRenderer.invoke("dashboard:reconnect"),
  checkUpdate: () => ipcRenderer.invoke("dashboard:check-update"),
  restartUpdate: () => ipcRenderer.invoke("dashboard:restart-update"),
  clearHistory: () => ipcRenderer.invoke("dashboard:clear-history"),
  openLog: () => ipcRenderer.invoke("dashboard:open-log"),
  copyDiagnostics: () => ipcRenderer.invoke("dashboard:copy-diagnostics"),
  onState: (callback) => ipcRenderer.on("dashboard:state", (_event, state) => callback(state)),
});
`;

export function createDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
  <title>Logitech Battery API</title>
  <style>
    :root { color-scheme: dark; --bg:#09090b; --panel:#18181b; --line:#2f2f35; --text:#f4f4f5; --muted:#a1a1aa; --green:#22c55e; --yellow:#eab308; --orange:#f97316; --red:#ef4444; --blue:#38bdf8; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:13px/1.45 Inter,Segoe UI,sans-serif; }
    button,select { font:inherit; }
    header { height:58px; padding:0 20px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); background:#111113; }
    h1 { margin:0; font-size:16px; font-weight:650; }
    #status { color:var(--muted); font-size:12px; }
    nav { display:flex; gap:4px; padding:10px 16px; border-bottom:1px solid var(--line); overflow:auto; }
    nav button { border:0; background:transparent; color:var(--muted); padding:7px 10px; border-radius:6px; cursor:pointer; white-space:nowrap; }
    nav button.active { background:#27272a; color:var(--text); }
    main { padding:18px; max-width:900px; margin:auto; }
    section { display:none; }
    section.active { display:block; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; }
    .row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .stack { display:grid; gap:10px; }
    .muted { color:var(--muted); }
    .battery { display:flex; align-items:center; gap:10px; }
    .dot { width:14px; height:14px; border-radius:50%; flex:none; box-shadow:0 0 0 1px #ffffff55 inset; }
    .percent { font-size:22px; font-weight:700; }
    .button { border:1px solid #3f3f46; background:#27272a; color:var(--text); padding:7px 11px; border-radius:6px; cursor:pointer; }
    .button:hover { background:#323238; }
    .button.primary { border-color:#16803a; background:#166534; }
    .button.danger { border-color:#7f1d1d; color:#fecaca; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    .setting { padding:12px 0; border-bottom:1px solid var(--line); }
    .setting:last-child { border-bottom:0; }
    input[type=checkbox] { width:17px; height:17px; accent-color:var(--green); }
    select { color:var(--text); background:#27272a; border:1px solid #3f3f46; padding:6px 8px; border-radius:6px; }
    .chart { width:100%; height:150px; margin-top:12px; background:#111113; border-radius:6px; overflow:hidden; }
    .chart svg { width:100%; height:100%; }
    pre { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; color:#d4d4d8; font:12px/1.5 Consolas,monospace; }
    .empty { padding:30px; text-align:center; color:var(--muted); }
    .badge { padding:3px 7px; border-radius:999px; background:#27272a; color:var(--muted); font-size:11px; }
    @media (max-width:600px) { main { padding:12px; } header { padding:0 14px; } }
  </style>
</head>
<body>
  <header><div><h1>Logitech Battery API</h1><div id="status"></div></div><span id="version" class="badge"></span></header>
  <nav id="tabs"></nav>
  <main>
    <section id="overview" class="active"><div id="devices" class="grid"></div><div class="actions"><button class="button" data-action="refresh"></button><button class="button" data-action="reconnect"></button></div></section>
    <section id="history"><div id="history-list" class="stack"></div><div class="actions"><button class="button danger" data-action="clear-history"></button></div></section>
    <section id="updates"><div id="update-card" class="card"></div></section>
    <section id="diagnostics"><div class="card"><pre id="diagnostics-text"></pre><div class="actions"><button class="button" data-action="copy-diagnostics"></button><button class="button" data-action="open-log"></button></div></div></section>
    <section id="settings"><div class="card stack" id="settings-list"></div></section>
  </main>
  <script>
    const api = window.logitechApi;
    const words = {
      tr:{overview:'Genel Bakış',history:'Pil Geçmişi',updates:'Güncellemeler',diagnostics:'Tanılama',settings:'Ayarlar',connected:'G HUB bağlı',disconnected:'G HUB bağlantısı bekleniyor',refresh:'Şimdi yenile',reconnect:'Yeniden bağlan',noDevices:'Pil destekli cihaz bulunamadı',charging:'Şarj oluyor',lastUpdate:'Son güncelleme',clearHistory:'Geçmişi temizle',noHistory:'Henüz pil geçmişi yok',checkUpdate:'Güncellemeleri denetle',restart:'Güncellemeyi uygula ve yeniden başlat',updateState:'Durum',commit:'Commit',message:'Değişiklik',checkedAt:'Son kontrol',copyDiagnostics:'Tanılamayı kopyala',openLog:'Log dosyasını aç',launchAtStartup:'Windows ile otomatik başlat',notifyDisconnect:'Bağlantı kesilince bildir',historyEnabled:'Pil geçmişini kaydet',language:'Dil',turkish:'Türkçe',english:'English',idle:'Güncel',checking:'Denetleniyor',ready:'Yeniden başlatmaya hazır',error:'Hata',copied:'Panoya kopyalandı'},
      en:{overview:'Overview',history:'Battery History',updates:'Updates',diagnostics:'Diagnostics',settings:'Settings',connected:'G HUB connected',disconnected:'Waiting for G HUB',refresh:'Refresh now',reconnect:'Reconnect',noDevices:'No battery-powered devices found',charging:'Charging',lastUpdate:'Last update',clearHistory:'Clear history',noHistory:'No battery history yet',checkUpdate:'Check for updates',restart:'Apply update and restart',updateState:'Status',commit:'Commit',message:'Change',checkedAt:'Last checked',copyDiagnostics:'Copy diagnostics',openLog:'Open log file',launchAtStartup:'Start automatically with Windows',notifyDisconnect:'Notify when connection is lost',historyEnabled:'Record battery history',language:'Language',turkish:'Türkçe',english:'English',idle:'Up to date',checking:'Checking',ready:'Ready to restart',error:'Error',copied:'Copied to clipboard'}
    };
    let state;
    let activeTab = 'overview';
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const color = (value) => value == null ? '#71717a' : value <= 5 ? '#ef4444' : value <= 20 ? '#f97316' : value <= 50 ? '#eab308' : '#22c55e';
    const date = (value) => value ? new Intl.DateTimeFormat(state.settings.language,{dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : '—';
    const t = (key) => words[state?.settings?.language || 'tr'][key] || key;

    function renderTabs() {
      const tabs = ['overview','history','updates','diagnostics','settings'];
      document.getElementById('tabs').innerHTML = tabs.map(id => '<button data-tab="'+id+'" class="'+(id===activeTab?'active':'')+'">'+t(id)+'</button>').join('');
      document.querySelectorAll('main section').forEach(el => el.classList.toggle('active',el.id===activeTab));
    }
    function renderDevices() {
      const el = document.getElementById('devices');
      el.innerHTML = state.devices.length ? state.devices.map(device => '<article class="card"><div class="row"><div class="battery"><span class="dot" style="background:'+color(device.percentage)+'"></span><div><strong>'+esc(device.name)+'</strong><div class="muted">'+esc(device.model)+'</div></div></div><span class="percent">'+(device.percentage == null?'—':device.percentage+'%')+'</span></div><div class="row" style="margin-top:12px"><span class="muted">'+(device.charging?t('charging'):device.connected?t('connected'):t('disconnected'))+'</span><span class="muted">'+date(device.updatedAt)+'</span></div></article>').join('') : '<div class="empty">'+t('noDevices')+'</div>';
    }
    function makeChart(points) {
      if (!points.length) return '';
      const min = points[0].timestamp, max = points.at(-1).timestamp || min + 1;
      const coords = points.map((p,i) => ((max===min ? i/Math.max(1,points.length-1) : (p.timestamp-min)/(max-min))*100)+','+(95-p.percentage*.9)).join(' ');
      const last = points.at(-1);
      return '<div class="chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="95" x2="100" y2="95" stroke="#3f3f46"/><line x1="0" y1="50" x2="100" y2="50" stroke="#27272a"/><polyline points="'+coords+'" fill="none" stroke="'+color(last.percentage)+'" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div>';
    }
    function renderHistory() {
      const entries = Object.values(state.history);
      document.getElementById('history-list').innerHTML = entries.length ? entries.map(series => { const last=series.points.at(-1); return '<article class="card"><div class="row"><strong>'+esc(series.name)+'</strong><span class="badge">'+(last?last.percentage+'%':'—')+'</span></div>'+makeChart(series.points)+'</article>'; }).join('') : '<div class="empty">'+t('noHistory')+'</div>';
    }
    function renderUpdate() {
      const u=state.update;
      document.getElementById('update-card').innerHTML='<div class="stack"><div class="row"><span>'+t('updateState')+'</span><strong>'+t(u.phase)+'</strong></div><div class="row"><span class="muted">'+t('commit')+'</span><span>'+esc(u.commit||'—')+'</span></div><div class="row"><span class="muted">'+t('message')+'</span><span>'+esc(u.message||u.detail||'—')+'</span></div><div class="row"><span class="muted">'+t('checkedAt')+'</span><span>'+date(u.checkedAt)+'</span></div></div><div class="actions"><button class="button" data-action="check-update">'+t('checkUpdate')+'</button>'+(u.phase==='ready'?'<button class="button primary" data-action="restart-update">'+t('restart')+'</button>':'')+'</div>';
    }
    function renderDiagnostics() {
      const d=state.diagnostics;
      document.getElementById('diagnostics-text').textContent=['App: '+state.app.name+' '+state.app.version,'Platform: '+d.platform+' '+d.arch,'Electron: '+d.electron,'Node: '+d.node,'G HUB: '+(state.connection.connected?'connected':'disconnected'),'Last connected: '+date(state.connection.lastConnectedAt),'Last disconnected: '+date(state.connection.lastDisconnectedAt),'Last error: '+(state.connection.lastError||'—'),'Devices: '+state.devices.length,'Update: '+state.update.phase,'User data: '+d.userData,'Log: '+d.logPath].join('\n');
    }
    function renderSettings() {
      const s=state.settings;
      document.getElementById('settings-list').innerHTML='<label class="setting row"><span>'+t('launchAtStartup')+'</span><input type="checkbox" data-setting="launchAtStartup" '+(s.launchAtStartup?'checked':'')+'></label><label class="setting row"><span>'+t('notifyDisconnect')+'</span><input type="checkbox" data-setting="notifyDisconnect" '+(s.notifyDisconnect?'checked':'')+'></label><label class="setting row"><span>'+t('historyEnabled')+'</span><input type="checkbox" data-setting="historyEnabled" '+(s.historyEnabled?'checked':'')+'></label><label class="setting row"><span>'+t('language')+'</span><select data-setting="language"><option value="tr" '+(s.language==='tr'?'selected':'')+'>'+t('turkish')+'</option><option value="en" '+(s.language==='en'?'selected':'')+'>'+t('english')+'</option></select></label>';
    }
    function render(next) {
      state=next;
      document.documentElement.lang=state.settings.language;
      document.getElementById('status').textContent=state.connection.connected?t('connected'):t('disconnected');
      document.getElementById('version').textContent='v'+state.app.version;
      renderTabs(); renderDevices(); renderHistory(); renderUpdate(); renderDiagnostics(); renderSettings();
      document.querySelector('[data-action="refresh"]').textContent=t('refresh');
      document.querySelector('[data-action="reconnect"]').textContent=t('reconnect');
      document.querySelector('[data-action="clear-history"]').textContent=t('clearHistory');
      document.querySelector('[data-action="copy-diagnostics"]').textContent=t('copyDiagnostics');
      document.querySelector('[data-action="open-log"]').textContent=t('openLog');
    }
    document.addEventListener('click', async event => {
      const tab=event.target.closest('[data-tab]'); if(tab){activeTab=tab.dataset.tab;renderTabs();return;}
      const action=event.target.closest('[data-action]')?.dataset.action;
      if(action==='refresh') await api.refresh();
      if(action==='reconnect') await api.reconnect();
      if(action==='check-update') await api.checkUpdate();
      if(action==='restart-update') await api.restartUpdate();
      if(action==='clear-history') await api.clearHistory();
      if(action==='open-log') await api.openLog();
      if(action==='copy-diagnostics'){await api.copyDiagnostics();event.target.textContent=t('copied');}
    });
    document.addEventListener('change', async event => {
      const key=event.target.dataset.setting; if(!key)return;
      await api.updateSettings({[key]:event.target.type==='checkbox'?event.target.checked:event.target.value});
    });
    api.onState(render);
    api.getState().then(render);
  </script>
</body>
</html>`;
}
