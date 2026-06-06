const STORAGE_KEY = 'guitarsuite-sidebar-collapsed';

export function initFretboardSidebar() {
  const sidebar = document.getElementById('fretboard-sidebar');
  const hideBtn = document.getElementById('sidebar-hide');
  const showBtn = document.getElementById('sidebar-show');
  if (!sidebar || !hideBtn || !showBtn) return;

  function setCollapsed(collapsed) {
    sidebar.classList.toggle('is-collapsed', collapsed);
    hideBtn.hidden = collapsed;
    showBtn.hidden = !collapsed;
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch (_) { /* ignore */ }
  }

  hideBtn.addEventListener('click', () => setCollapsed(true));
  showBtn.addEventListener('click', () => setCollapsed(false));

  let startCollapsed = false;
  try {
    startCollapsed = localStorage.getItem(STORAGE_KEY) === '1';
  } catch (_) { /* ignore */ }

  setCollapsed(startCollapsed);
}
