// ⚠️ Code.gs를 '웹 앱'으로 배포한 뒤 나오는 URL을 여기에 붙여넣으세요.
// (배포 > 새 배포 > 유형: 웹 앱 > 액세스 권한: 모든 사용자)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNAV7DcmU8hk-zdwkcyiRa4FGVCXDNaCbNVHhWFLZe9gn_E4IyD-XMEhMoCh1_0wg5/exec';

const form = document.getElementById('submit-form');
const submitBtn = document.getElementById('submit-btn');
const submitMsg = document.getElementById('submit-msg');

const searchBtn = document.getElementById('search-btn');
const resultsEl = document.getElementById('results');
const resultsBody = document.getElementById('results-body');
const emptyMsg = document.getElementById('empty-msg');

// ---------- 공통 유틸 ----------

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function showMsg(text, color) {
  submitMsg.textContent = text;
  submitMsg.style.color =
    color === 'red' ? '#dc2626' :
    color === 'green' ? '#16a34a' : '#6b7280';
  submitMsg.hidden = false;
  setTimeout(() => { submitMsg.hidden = true; }, 3000);
}

function setLoading(btn, isLoading) {
  const label = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = isLoading;
  spinner.hidden = !isLoading;
  label.style.visibility = isLoading ? 'hidden' : 'visible';
  spinner.style.position = 'absolute';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Apps Script 통신 ----------

async function apiCreate(payload) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // CORS 우회를 위해 text/plain 사용
    body: JSON.stringify({ action: 'create', data: payload })
  });
  if (!res.ok) throw new Error('network error');
  return res.json();
}

async function apiList(filters) {
  const params = new URLSearchParams({ action: 'list', ...filters });
  const res = await fetch(`${SCRIPT_URL}?${params.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error('network error');
  return res.json();
}

// ---------- 접수 ----------

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const gradeVal = document.getElementById('grade').value;
  const clsVal = document.getElementById('cls').value;
  const tabletVal = document.getElementById('tablet').value.trim();
  const detailVal = document.getElementById('detail').value.trim();

  if (!gradeVal || !clsVal || !detailVal) {
    showMsg('학년, 반, 상세장애내용은 필수입니다.', 'red');
    return;
  }

  setLoading(submitBtn, true);

  try {
    const result = await apiCreate({
      학년: gradeVal,
      반: clsVal,
      테블릿번호: tabletVal,
      상세장애내용: detailVal,
      접수일: today()
    });

    if (result && result.ok) {
      showMsg('접수가 완료되었습니다.', 'green');
      form.reset();
    } else {
      showMsg('오류가 발생했습니다. 다시 시도해주세요.', 'red');
    }
  } catch (err) {
    showMsg('오류가 발생했습니다. 다시 시도해주세요.', 'red');
  } finally {
    setLoading(submitBtn, false);
  }
});

// ---------- 조회 ----------

searchBtn.addEventListener('click', async () => {
  const grade = document.getElementById('search-grade').value;
  const cls = document.getElementById('search-class').value;

  setLoading(searchBtn, true);

  try {
    const result = await apiList({ grade, cls });
    const rows = (result && result.ok && Array.isArray(result.data)) ? result.data : [];
    renderResults(rows);
  } catch (err) {
    resultsEl.hidden = true;
    emptyMsg.hidden = false;
    emptyMsg.textContent = '조회 중 오류가 발생했습니다.';
  } finally {
    setLoading(searchBtn, false);
  }
});

function renderResults(rows) {
  if (rows.length === 0) {
    resultsEl.hidden = true;
    emptyMsg.hidden = false;
    emptyMsg.textContent = '검색 결과가 없습니다.';
    return;
  }

  emptyMsg.hidden = true;
  resultsEl.hidden = false;
  resultsBody.innerHTML = '';

  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(r['학년'])}</td>
      <td>${escHtml(r['반'])}</td>
      <td>${escHtml(r['테블릿번호'])}</td>
      <td class="col-detail">${escHtml(r['상세장애내용'])}</td>
      <td>${escHtml(r['접수일'])}</td>
      <td>${statusBadge(r['상태'])}</td>
    `;
    resultsBody.appendChild(tr);
  });
}

function statusBadge(status) {
  const val = (status || '접수').trim();
  const map = {
    '접수': 'status-received',
    '처리중': 'status-progress',
    '완료': 'status-done'
  };
  const cls = map[val] || 'status-default';
  return `<span class="status-badge ${cls}">${escHtml(val)}</span>`;
}
