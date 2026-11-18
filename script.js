// =====================================================
// 729 蓋章政策回饋 v1.0
// 回饋存在 Firebase Firestore，設定在 firebase-config.js
// =====================================================

// ---------------- 題目（要改題目，改這裡就好） ----------------
// type：rate = 1～6 星評分（必填）、choice = 單選＋其他（必填）、text = 文字（選填）
const PARTS = [
  {
    no: 1, color: '--p1', title: '目前政策評分', lo: '最不符合', hi: '最符合',
    items: [
      {id:'clear',    type:'rate', q:'規則清楚、容易看懂'},
      {id:'fair',     type:'rate', q:'加扣章的標準公平'},
      {id:'manager',  type:'rate', q:'管理者處理事情公正'},
      {id:'record',   type:'rate', q:'登記方式方便、不容易出錯'},
      {id:'chance',   type:'rate', q:'加章的機會夠多'},
      {id:'punish',   type:'rate', q:'懲罰的輕重合理'},
      {id:'reward',   type:'rate', q:'獎勵讓我有動力表現好'},
      {id:'appeal',   type:'rate', q:'被亂扣章時，申訴有用'},
      {id:'order',    type:'rate', q:'這個政策讓班上秩序變好'},
    ],
  },
  {
    no: 2, color: '--p2', title: '文字意見',
    items: [
      {id:'best',    type:'text', q:'你覺得目前政策最好的地方是什麼？'},
      {id:'worst',   type:'text', q:'最需要改進的地方是什麼？'},
      {id:'unfair',  type:'text', q:'有沒有哪一條規則你覺得不合理？為什麼？'},
      {id:'story',   type:'text', q:'你遇過不公平的狀況嗎？請描述發生什麼事（不要寫名字）。'},
      {id:'addItem', type:'text', q:'你希望增加哪些可以加章的事情？'},
      {id:'prize',   type:'text', q:'你希望有什麼獎勵？'},
      {id:'other',   type:'text', q:'還有什麼想說的？', max:500},
    ],
  },
  {
    no: 3, color: '--p3', title: '新政策：班級遊戲', lo: '不喜歡', hi: '很喜歡',
    items: [
      {id:'g_overall', type:'rate', q:'把蓋章改成全班一起玩的遊戲'},
      {id:'g_team',    type:'rate', q:'全班分組，同組的人一起合作'},
      {id:'g_points',  type:'rate', q:'表現好得到分數，用分數換遊戲裡的行動'},
      {id:'g_break',   type:'rate', q:'每組輪流在下課時間，用大屏玩'},
      {id:'g_penalty', type:'rate', q:'違規太多，在遊戲裡會受到處罰（例如暫停一回合）'},
      {id:'g_luck',    type:'rate', q:'遊戲裡有運氣成分（例如擲骰、抽卡）'},
      {id:'g_compete', type:'rate', q:'組與組之間互相競爭排名'},
      {id:'g_trade',   type:'rate', q:'可以用分數交換或競標道具'},
      {id:'g_fund',    type:'rate', q:'全班一起完成目標，達標後全班都有獎勵'},
      {id:'g_board',   type:'choice', q:'你最喜歡什麼桌遊？', options:['大富翁', 'UNO', '狼人殺', '拉密', '德國心臟病', '誰是牛頭王', '妙語說書人', '卡坦島'], other:true},
      {id:'g_like',    type:'text', q:'你希望遊戲裡有什麼？'},
      {id:'g_worry',   type:'text', q:'你擔心會發生什麼問題？'},
      {id:'g_idea',    type:'text', q:'有沒有想加進遊戲的點子？'},
    ],
  },
];

// 座號（福和國中 729，沒有 19 號）
const SEATS = Array.from({length:30}, (_, i) => i + 1).filter(n => n !== 19);

const COLORS = ['#c63c4f', '#dc6b55', '#e3a04f', '#8fbb6c', '#4fa86d', '#2a8a55'];
const SIZES  = [50, 43, 36, 36, 43, 50];
const OTHER = '其他';

// ---------------- 狀態與資料 ----------------
let answers = {};
let who = null;            // {seat, name}
let lastRecord = null;
// ---------------- Firebase ----------------
const SUBMITTED = 'submitted_v1';   // 只記錄哪些座號填過（任何人都能查）
const RESPONSES = 'responses_v1';   // 完整回饋（只有管理員能看）
const MY_KEY = 'class729_feedback_mine_v1';   // 這台裝置自己的填寫紀錄
let db = null, auth = null;
const configured = window.FIREBASE_CONFIG && !String(window.FIREBASE_CONFIG.apiKey || '').startsWith('請填');
if (window.firebase && configured){
  firebase.initializeApp(window.FIREBASE_CONFIG);
  db = firebase.firestore();
  auth = firebase.auth();
}
function myRecord(){ try { return JSON.parse(localStorage.getItem(MY_KEY) || 'null'); } catch (e) { return null; } }
function saveMine(rec){ try { localStorage.setItem(MY_KEY, JSON.stringify(rec)); } catch (e) {} }
async function seatSubmitted(seat){
  const doc = await db.collection(SUBMITTED).doc(String(seat)).get();
  return doc.exists;
}

// ---------------- 小工具 ----------------
const $ = s => document.querySelector(s);
const app = $('#app');
function h(tag, attrs = {}, ...kids){
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)){
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids) if (c != null) e.append(c);
  return e;
}
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2000); }
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const required = part => part.items.filter(i => i.type === 'rate' || i.type === 'choice');
const setColor = c => document.documentElement.style.setProperty('--part', c);

// 單選題：選「其他」時要有填文字才算完成
function isAnswered(item, ans = answers){
  if (item.type === 'choice') return !!ans[item.id] && (ans[item.id] !== OTHER || !!(ans[item.id + '_other'] || '').trim());
  if (item.type === 'rate') return !!ans[item.id];
  return !!(ans[item.id] || '').trim();
}
function choiceText(item, ans){
  return ans[item.id] === OTHER ? `${OTHER}：${ans[item.id + '_other'] || ''}` : ans[item.id];
}

function updateBar(){
  const all = PARTS.flatMap(required);
  $('#bar').style.width = (all.filter(i => isAnswered(i)).length / all.length * 100) + '%';
}

// ---------------- 畫面切換 ----------------
function go(view){
  window.scrollTo(0, 0);
  app.innerHTML = '';
  $('.progress').style.visibility = (view >= 1 && view <= 3) ? 'visible' : 'hidden';
  if (view === 'start') renderStart();
  else if (view === 'already') renderAlready();
  else if (view >= 1 && view <= 3) renderPart(PARTS[view - 1]);
  else if (view === 'thanks') renderThanks();
  else if (view === 'mine') renderMine();
  else if (view === 'admin') renderAdmin();
}
$('#adminLink').addEventListener('click', e => { e.preventDefault(); go('admin'); });

// ---------------- 開始頁 ----------------
function renderStart(){
  setColor('var(--p1)');
  const seat = h('select', {class:'field'}, h('option', {value:''}, '請選擇座號'), ...SEATS.map(n => h('option', {value:String(n)}, `${n} 號`)));
  const name = h('input', {type:'text', class:'field', maxlength:'10', placeholder:'請輸入姓名', autocomplete:'off'});
  const err = h('div', {class:'err'});
  const btn = h('button', {class:'btn wide'}, '開始填寫');
  const check = () => btn.classList.toggle('dim', !seat.value || !name.value.trim());
  seat.addEventListener('change', () => { err.textContent = ''; check(); });
  name.addEventListener('input', () => { err.textContent = ''; check(); });
  btn.addEventListener('click', async () => {
    if (!seat.value){ err.textContent = '請選擇座號'; return; }
    if (!name.value.trim()){ err.textContent = '請輸入姓名'; return; }
    if (!db){ err.textContent = '網站還沒有設定好資料庫，請通知負責的同學。'; return; }
    const n = Number(seat.value);
    btn.textContent = '確認中…'; btn.disabled = true;
    try {
      if (await seatSubmitted(n)){ err.textContent = `${n} 號已經填寫過了，不能再次填寫。`; return; }
      who = {seat:n, name:name.value.trim()};
      answers = {};
      go(1);
    } catch (e) {
      err.textContent = '連線失敗，請確認網路後再試一次。';
    } finally {
      btn.textContent = '開始填寫'; btn.disabled = false;
    }
  });
  check();
  app.append(h('div', {class:'start'},
    h('div', {class:'start-card'},
      h('h2', {}, '729 蓋章政策回饋'),
      h('label', {}, '座號'), seat,
      h('label', {}, '姓名'), name,
      err, btn)));
}

function renderAlready(){
  setColor('var(--p1)');
  const rec = myRecord();
  lastRecord = rec || null;
  app.append(h('div', {class:'result'},
    h('div', {class:'thanks-card'},
      h('h2', {}, '你已經填寫過了'),
      h('p', {}, rec ? `${rec.seat} 號 ${rec.name}，每個人只能填寫一次。` : '每個人只能填寫一次。'),
      rec ? h('div', {class:'btn-row'}, h('button', {class:'btn', onclick:() => go('mine')}, '查看我的填寫結果')) : null)));
}

// ---------------- 作答頁 ----------------
function renderPart(part){
  setColor(`var(${part.color})`);
  app.append(h('section', {class:'part-head'}, h('div', {class:'no'}, `第 ${part.no} 部分 / 共 3 部分`), h('h2', {}, part.title)));
  const list = h('div', {class:'questions'});
  for (const item of part.items){
    if (item.type === 'rate') list.append(rateItem(item, part));
    else if (item.type === 'choice') list.append(choiceItem(item));
    else list.append(textItem(item, part));
  }
  app.append(list);

  const isLast = part.no === PARTS.length;
  const next = h('button', {class:'btn', onclick:() => {
    const missing = required(part).find(i => !isAnswered(i));
    if (missing){
      toast(missing.type === 'choice' && answers[missing.id] === OTHER ? '選了「其他」，請填寫桌遊名稱' : '還有題目沒有回答');
      const el = document.getElementById('q-' + missing.id);
      el.classList.add('missing');
      el.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    if (isLast) submit(); else go(part.no + 1);
  }}, isLast ? '送出' : '下一部分');
  if (!who) return go('start');
  const back = part.no > 1 ? h('button', {class:'btn ghost', onclick:() => go(part.no - 1)}, '上一部分') : h('span', {class:'spacer'});
  app.append(h('div', {class:'page-nav'}, back, next));

  const refresh = () => { next.classList.toggle('dim', required(part).some(i => !isAnswered(i))); updateBar(); };
  list.addEventListener('answered', refresh);
  refresh();
}

function markAnswered(wrap){
  wrap.classList.add('answered');
  wrap.classList.remove('missing');
  wrap.dispatchEvent(new Event('answered', {bubbles:true}));
}

function rateItem(item, part){
  const wrap = h('div', {class:'qitem' + (answers[item.id] ? ' answered' : ''), id:'q-' + item.id});
  const row = h('div', {class:'scale'});
  for (let n = 1; n <= 6; n++){
    const c = h('button', {type:'button', class:'circle' + (answers[item.id] === n ? ' on' : ''), 'aria-label':`${n} 星`, style:`--c:${COLORS[n - 1]};--s:${SIZES[n - 1]}px`}, String(n));
    c.addEventListener('click', () => {
      const first = !answers[item.id];
      answers[item.id] = n;
      row.querySelectorAll('.circle').forEach((b, i) => b.classList.toggle('on', i === n - 1));
      markAnswered(wrap);
      const nextEl = wrap.nextElementSibling;
      if (first && nextEl) setTimeout(() => nextEl.scrollIntoView({behavior:'smooth', block:'center'}), 200);
    });
    row.append(c);
  }
  wrap.append(h('p', {class:'qtext'}, item.q), row,
    h('div', {class:'ends'}, h('span', {class:'lo'}, part.lo), h('span', {class:'hi'}, part.hi)));
  return wrap;
}

function choiceItem(item){
  const wrap = h('div', {class:'qitem' + (isAnswered(item) ? ' answered' : ''), id:'q-' + item.id});
  const box = h('div', {class:'choices'});
  const other = h('input', {type:'text', class:'other-input', maxlength:'30', placeholder:'請填寫桌遊名稱'});
  other.value = answers[item.id + '_other'] || '';
  const showOther = () => other.style.display = answers[item.id] === OTHER ? 'block' : 'none';
  const opts = item.other ? [...item.options, OTHER] : item.options;
  for (const o of opts){
    const b = h('button', {type:'button', class:'opt' + (answers[item.id] === o ? ' on' : '')}, o);
    b.addEventListener('click', () => {
      answers[item.id] = o;
      box.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b));
      showOther();
      if (o === OTHER) other.focus();
      if (isAnswered(item)) markAnswered(wrap); else { wrap.classList.remove('answered'); wrap.dispatchEvent(new Event('answered', {bubbles:true})); }
    });
    box.append(b);
  }
  other.addEventListener('input', () => {
    answers[item.id + '_other'] = other.value;
    if (isAnswered(item)) markAnswered(wrap); else { wrap.classList.remove('answered'); wrap.dispatchEvent(new Event('answered', {bubbles:true})); }
  });
  showOther();
  wrap.append(h('p', {class:'qtext'}, item.q), box, other);
  return wrap;
}

function textItem(item, part){
  const max = item.max || 200;
  const ta = h('textarea', {maxlength:String(max)});
  if (part.items.length === 1) ta.classList.add('tall');
  ta.value = answers[item.id] || '';
  const cnt = h('div', {class:'count'}, `${ta.value.length} / ${max}`);
  ta.addEventListener('input', () => { answers[item.id] = ta.value; cnt.textContent = `${ta.value.length} / ${max}`; });
  return h('div', {class:'qitem text', id:'q-' + item.id}, h('p', {class:'qtext'}, item.q, h('span', {class:'opt-tag'}, '選填')), ta, cnt);
}

// ---------------- 送出 ----------------
let sending = false;
async function submit(){
  if (sending) return;
  sending = true;
  toast('送出中…');
  const rec = {seat:who.seat, name:who.name, answers:structuredClone(answers)};
  try {
    const batch = db.batch();
    const time = firebase.firestore.FieldValue.serverTimestamp();
    batch.set(db.collection(SUBMITTED).doc(String(who.seat)), {time});
    batch.set(db.collection(RESPONSES).doc(String(who.seat)), {...rec, time});
    await batch.commit();
    lastRecord = {...rec, time:new Date().toISOString()};
    saveMine(lastRecord);
    go('thanks');
  } catch (e) {
    // 被資料庫規則擋下來，代表這個座號已經有人送出過
    if (e && e.code === 'permission-denied'){ toast(`${who.seat} 號已經填寫過了`); go('start'); }
    else toast('送出失敗，請確認網路後再按一次送出');
  } finally {
    sending = false;
  }
}

// ---------------- 感謝頁 ----------------
function renderThanks(){
  setColor('var(--p1)');
  app.append(h('div', {class:'result'},
    h('div', {class:'thanks-card'},
      h('h2', {}, '感謝你的填寫'),
      h('p', {}, '你的回饋已經送出，會作為之後調整政策的參考。'),
      h('div', {class:'btn-row'},
        h('button', {class:'btn', onclick:() => go('mine')}, '查看我的填寫結果')))));
}

// ---------------- 我的填寫結果 ----------------
function renderMine(){
  setColor('var(--p1)');
  lastRecord = lastRecord || myRecord();
  const ans = lastRecord ? lastRecord.answers : answers;
  const box = h('div', {class:'result'}, h('h2', {class:'page-title'}, '我的填寫結果'),
    lastRecord ? h('p', {class:'note', style:'margin:-8px 0 16px'}, `${lastRecord.seat} 號 ${lastRecord.name}`) : null);
  for (const part of PARTS){
    const card = h('div', {class:'review-card', style:`--pc:var(${part.color})`}, h('h3', {}, `第 ${part.no} 部分：${part.title}`));
    for (const item of part.items){
      let value;
      if (item.type === 'rate'){
        const n = ans[item.id];
        value = h('div', {class:'review-rate'},
          ...[1, 2, 3, 4, 5, 6].map(i => h('span', {class:'pip' + (i <= n ? ' on' : ''), style: i <= n ? `background:${COLORS[n - 1]}` : ''})),
          h('b', {style:`color:${COLORS[n - 1] || 'inherit'}`}, n ? `${n} 星` : '未填'));
      } else if (item.type === 'choice'){
        value = h('div', {class:'review-text'}, ans[item.id] ? choiceText(item, ans) : '未填');
      } else {
        const v = (ans[item.id] || '').trim();
        value = h('div', {class:'review-text' + (v ? '' : ' none')}, v || '（沒有填寫）');
      }
      card.append(h('div', {class:'review-row'}, h('div', {class:'review-q'}, item.q), value));
    }
    box.append(card);
  }
  box.append(h('div', {class:'btn-row'}, h('button', {class:'btn ghost', onclick:() => go(myRecord() ? 'already' : 'start')}, '返回')));
  app.append(box);
}

// ---------------- 統計頁（管理員） ----------------
async function renderAdmin(){
  setColor('var(--p1)');
  const box = h('div', {class:'admin'}, h('h2', {}, '統計'));
  app.append(box);
  const back = h('button', {class:'btn ghost', onclick:() => go(myRecord() ? 'already' : 'start')}, '回到問卷');
  if (!db){ box.append(h('div', {class:'empty'}, '還沒有設定 Firebase，請先填寫 firebase-config.js。'), h('div', {class:'btn-row', style:'justify-content:flex-start'}, back)); return; }

  // 等 Firebase 讀完登入狀態，避免重新整理後被當成未登入
  const user = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
  if (!user){
    const err = h('div', {class:'err'});
    const login = h('button', {class:'btn'}, '用 Google 帳號登入');
    login.addEventListener('click', async () => {
      try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); go('admin'); }
      catch (e) { err.textContent = '登入失敗：' + (e.message || e.code); }
    });
    box.append(h('p', {class:'note'}, '只有管理員可以查看統計。'), h('div', {class:'btn-row', style:'justify-content:flex-start'}, login, back), err);
    return;
  }

  let store = [];
  try {
    const snap = await db.collection(RESPONSES).get();
    store = snap.docs.map(d => d.data()).sort((a, b) => a.seat - b.seat);
  } catch (e) {
    const logout = h('button', {class:'btn ghost', onclick: async () => { await auth.signOut(); go('admin'); }}, '登出');
    box.append(h('div', {class:'empty'}, `${user.email} 沒有查看權限。`), h('div', {class:'btn-row', style:'justify-content:flex-start'}, logout, back));
    return;
  }
  box.append(h('p', {class:'note'}, `已登入：${user.email}`));
  const logout = h('button', {class:'btn ghost', onclick: async () => { await auth.signOut(); go('admin'); }}, '登出');

  // 填寫名單
  const filled = new Map(store.map(r => [r.seat, r.name]));
  const roster = h('div', {class:'roster'}, ...SEATS.map(n => h('span', {class:'seat' + (filled.has(n) ? ' on' : ''), title: filled.get(n) || '未填'}, String(n))));
  box.append(h('div', {class:'res-card'}, h('h3', {}, `填寫名單（${filled.size} / ${SEATS.length}）`), roster,
    h('p', {class:'note'}, '有顏色的座號代表已經填寫，滑鼠移上去可以看到姓名。')));
  const n = store.length;
  if (!n){ box.append(h('div', {class:'empty'}, '還沒有回饋。'), h('div', {class:'btn-row', style:'justify-content:flex-start'}, back, logout)); return; }
  const all = store.map(r => r.answers);
  const rateAvg = part => avg(all.flatMap(a => part.items.filter(i => i.type === 'rate').map(i => a[i.id]).filter(Boolean)));
  box.append(h('div', {class:'kpi'},
    h('div', {}, h('b', {}, String(n)), h('span', {}, '份回饋')),
    h('div', {}, h('b', {}, rateAvg(PARTS[0]).toFixed(1)), h('span', {}, '目前政策平均（6 星）')),
    h('div', {}, h('b', {}, rateAvg(PARTS[2]).toFixed(1)), h('span', {}, '新政策平均（6 星）'))));

  const barCard = (title, rows, max, color) => {
    const c = h('div', {class:'res-card'}, h('h3', {}, title));
    for (const [label, val, text] of rows)
      c.append(h('div', {class:'res-row'}, h('div', {class:'top'}, h('span', {}, label), h('span', {}, text)),
        h('div', {class:'res-bar'}, h('i', {style:`background:${color};width:${max ? val / max * 100 : 0}%`}))));
    box.append(c);
  };
  for (const part of PARTS){
    const rates = part.items.filter(i => i.type === 'rate');
    if (rates.length) barCard(`第 ${part.no} 部分：${part.title}`, rates.map(i => { const v = avg(all.map(a => a[i.id]).filter(Boolean)); return [i.q, v, v.toFixed(1) + ' 星']; }), 6, `var(${part.color})`);
    for (const i of part.items.filter(x => x.type === 'choice')){
      const counts = {};
      for (const a of all) if (a[i.id]){ const k = a[i.id] === OTHER ? `${OTHER}：${(a[i.id + '_other'] || '').trim()}` : a[i.id]; counts[k] = (counts[k] || 0) + 1; }
      barCard(i.q, Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([k, c]) => [k, c, `${c} 人`]), n, `var(${part.color})`);
    }
  }
  for (const part of PARTS) for (const i of part.items.filter(x => x.type === 'text')){
    const list = store.filter(r => r.answers[i.id] && r.answers[i.id].trim());
    const c = h('div', {class:'res-card'}, h('h3', {}, `${i.q}（${list.length}）`));
    if (!list.length) c.append(h('div', {class:'note'}, '還沒有人寫。'));
    for (const r of list) c.append(h('div', {class:'res-text'}, `${r.seat} 號 ${r.name}：${r.answers[i.id]}`));
    box.append(c);
  }
  box.append(h('div', {class:'btn-row', style:'justify-content:flex-start'},
    h('button', {class:'btn', onclick: async () => { try { await navigator.clipboard.writeText(JSON.stringify(store, null, 2)); toast('已複製'); } catch (e) { toast('複製失敗'); } }}, '複製全部資料'),
    back, logout));
}

// ---------------- 開始 ----------------
go(myRecord() ? 'already' : 'start');
