// Main application navigation and shared UI helpers.
const pages = {
  dashboard: { title: '儀表板', render: renderDashboard },
  facilities: { title: '工程設施管理', render: renderFacilities },
  'design-library': { title: '工程設計書架', render: renderEngineeringBookshelf },
  fish: { title: '魚類資料庫', render: renderFish },
  habitat: { title: '二維水理模擬棲地環境', render: renderHabitat },
  'inspection-data': { title: '巡查資料管理', render: renderInspectionMgmtPage },
  inspection: { title: '維護管理資料', render: renderInspection },
  'deru-assessment': { title: 'DER&U 設施評估', render: renderDeruPage },
  'gis-enhanced': { title: 'GIS整合地圖', render: renderGISEnhanced },
  chapter4: { title: '溪流生態調查', render: renderChapter4Ecology },
  reports: { title: '報表分析', render: renderReports },
  'ai-tech': { title: 'AI技術分析', render: renderAITechnology },
  'quality-dashboard': { title: 'RAG 質量儀表板', render: renderQualityDashboard }
};

let currentPage = 'dashboard';

function navigateTo(page) {
  if (!pages[page]) return;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  currentPage = page;
  document.getElementById('pageTitle').textContent = pages[page].title;
  pages[page].render();
}

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mainContent').classList.toggle('expanded');
});

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(el.dataset.page);
  });
});

function openModal() {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.style.zIndex = '20000';
  if (modal) {
    modal.style.position = 'relative';
    modal.style.zIndex = '20001';
  }
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.maxWidth = '';
    modal.style.width = '';
    modal.style.maxHeight = '';
  }
}

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

function showToast(msg, type = 'info') {
  const icons = { success: 'check-circle', error: 'times-circle', info: 'info-circle', warning: 'exclamation-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'}`;
  toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${msg}`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function updateDate() {
  const now = new Date();
  document.getElementById('dateDisplay').textContent = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}

function exportData() {
  const json = DB.export();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `橫流溪管理資料_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('資料已匯出', 'success');
}

function importData() {
  document.getElementById('importFile').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      DB.import(e.target.result);
      showToast('資料已匯入', 'success');
      navigateTo(currentPage);
    } catch {
      showToast('匯入失敗，請確認檔案格式', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

updateDate();
setInterval(updateDate, 60000);
navigateTo('dashboard');
initAIChat();
