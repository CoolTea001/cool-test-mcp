// Zero-dependency report server script. Copied to .cooltest/report-server.mjs and launched by cooltest_open_report.
// Usage: node report-server.mjs <suite.json> <port>
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import * as path from "node:path";

const [, , jsonPathArg, portArg] = process.argv;
if (!jsonPathArg || !portArg) {
  console.error("Usage: node report-server.mjs <suite.json> <port>");
  process.exit(1);
}
const jsonPath = path.resolve(jsonPathArg);
const port = Number(portArg);

async function readSuite() {
  const raw = await fs.readFile(jsonPath, "utf-8");
  return JSON.parse(raw);
}

const CSS = [
  ":root{--bg:#0b1120;--bg-elevated:#111827;--bg-muted:#1f2937;--border:#374151;",
  "--text:#e5e7eb;--text-muted:#9ca3af;--text-dimmed:#6b7280;",
  "--primary:#00DC82;--success:#00DC82;--error:#f87171;--warning:#fbbf24;--info:#60a5fa;}",
  ":root[data-theme='light']{--bg:#f8fafc;--bg-elevated:#ffffff;--bg-muted:#f1f5f9;--border:#e2e8f0;",
  "--text:#0f172a;--text-muted:#475569;--text-dimmed:#94a3b8;",
  "--primary:#059669;--success:#16a34a;--error:#dc2626;--warning:#d97706;--info:#2563eb;}",
  "*{box-sizing:border-box;margin:0;}",
  "body{font-family:'Public Sans',-apple-system,'PingFang SC',sans-serif;background:var(--bg);color:var(--text);padding:32px;line-height:1.5;}",
  "h1{font-size:24px;font-weight:600;}",
  ".topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}",
  ".lang-toggle{display:flex;gap:4px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:999px;padding:3px;}",
  ".lang-toggle button{background:transparent;color:var(--text-muted);border:none;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:600;cursor:pointer;}",
  ".lang-toggle button.active{background:var(--primary);color:#04261a;}",
  ".prefs{display:flex;align-items:center;gap:8px;}",
  ".theme-toggle{display:flex;gap:4px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:999px;padding:3px;}",
  ".theme-toggle button{background:transparent;color:var(--text-muted);border:none;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:600;cursor:pointer;}",
  ".theme-toggle button.active{background:var(--primary);color:#04261a;}",
  ".sub{color:var(--text-muted);font-size:14px;margin:4px 0 24px;}",
  ".filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}",
  ".filters button{background:transparent;color:var(--text-muted);border:1px solid var(--border);border-radius:999px;padding:6px 16px;font-size:13px;cursor:pointer;transition:all .15s ease;}",
  ".filters button .cnt{font-weight:400;margin-left:8px;color:inherit;}",
  ".filters button .cnt .sep{font-size:15px;font-weight:600;line-height:1;margin-right:6px;opacity:.8;}",
  ".filters button .cnt .num{font-size:13px;}",
  ".filters button:not(.active):hover{color:var(--text);border-color:var(--text-muted);}",
  ".filters button.active{color:#04261a;border-color:var(--primary);font-weight:600;background:var(--primary);}",
  ".filters button.tag-passed.active{color:#04261a;border-color:var(--success);background:var(--success);}",
  ".filters button.tag-failed.active{color:#450a0a;border-color:var(--error);background:var(--error);}",
  ".filters button.tag-review.active{color:#451a03;border-color:var(--warning);background:var(--warning);}",
  ".filters button.tag-pending.active{color:#082f49;border-color:var(--info);background:var(--info);}",
  ".filters button.tag-passed:not(.active):hover{color:var(--success);border-color:var(--success);}",
  ".filters button.tag-failed:not(.active):hover{color:var(--error);border-color:var(--error);}",
  ".filters button.tag-review:not(.active):hover{color:var(--warning);border-color:var(--warning);}",
  ".filters button.tag-pending:not(.active):hover{color:var(--info);border-color:var(--info);}",
  "table{width:100%;table-layout:fixed;border-collapse:collapse;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;overflow:hidden;}",
  "th,td{text-align:left;padding:12px 16px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle;}",
  "th{color:var(--text-muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.03em;}",
  "tr:last-child td{border-bottom:none;}",
  ".st{display:inline-block;font-size:12px;font-weight:600;line-height:1;padding:5px 10px;border-radius:999px;}",
  ".st.passed{color:#04261a;background:var(--success);}",
  ".st.failed{color:#450a0a;background:var(--error);}",
  ".st.review{color:#451a03;background:var(--warning);}",
  ".st.pending{color:#082f49;background:var(--info);}",
  ".cell-note{white-space:pre-wrap;word-break:break-word;}",
  ".cell-note.none{color:var(--text-dimmed);}",
  ".case-title{font-weight:600;}",
  ".case-time{color:var(--text-muted);font-size:12px;margin-top:4px;}",
  ".btn-text{background:none;border:none;color:var(--primary);font-size:13px;font-weight:600;padding:2px 4px;cursor:pointer;}",
  ".btn-text:hover{text-decoration:underline;}",
  ".empty{color:var(--text-muted);font-size:14px;padding:12px 0;text-align:center;}",
  ".modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:10;}",
  ".modal.open{display:flex;}",
  ".modal-box{background:var(--bg-elevated);border:1px solid var(--border);border-radius:12px;width:520px;max-width:92vw;padding:24px;}",
  ".modal-box h3{font-size:16px;font-weight:600;margin-bottom:4px;}",
  ".modal-box .m-sub{color:var(--text-muted);font-size:13px;margin-bottom:16px;}",
  ".field{margin-bottom:14px;}",
  ".field label{display:block;font-size:12px;color:var(--text-muted);margin-bottom:6px;}",
  ".field select,.field textarea{width:100%;background:var(--bg-muted);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;}",
  ".field textarea{min-height:80px;resize:vertical;font-family:inherit;}",
  ".modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px;}",
  ".group h2{font-size:16px;font-weight:600;margin-bottom:12px;}",
  ".group h2 .count{color:var(--text-muted);font-size:14px;font-weight:400;}",
  "button{background:var(--primary);color:#04261a;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;}",
  "button.ghost{background:transparent;color:var(--text-muted);border:1px solid var(--border);}",
  ":root[data-theme='light'] .filters button.active,",
  ":root[data-theme='light'] .lang-toggle button.active,",
  ":root[data-theme='light'] .theme-toggle button.active,",
  ":root[data-theme='light'] .st.passed,",
  ":root[data-theme='light'] .st.failed,",
  ":root[data-theme='light'] .st.review,",
  ":root[data-theme='light'] .st.pending,",
  ":root[data-theme='light'] button[data-action='save']{color:#ffffff;}",
].join("");

const PAGE_JS = [
  "const DATA = window.__DATA;",
  "const I18N = {",
  "  en: { fAll:'All', fPassed:'Passed', fFailed:'Failed', fReview:'Review', fPending:'Pending',",
  "    sPassed:'Passed', sFailed:'Failed', sReview:'Review', sPending:'Pending',",
  "    hId:'ID', hCase:'Case', hNotes:'Notes', hStatus:'Status', hActions:'Actions',",
  "    none:'None', reviewNote:'Needs human review', notRun:'Not run', edit:'Edit',",
  "    saveFailed:'Save failed', lStatus:'Status', lNotes:'Notes',",
  "    phNotes:'Record review comments, reasons…', bCancel:'Cancel', bSave:'Save',",
  "    thLight:'Light', thDark:'Dark' },",
  "  zh: { fAll:'全部', fPassed:'通过', fFailed:'失败', fReview:'待审', fPending:'待测',",
  "    sPassed:'通过', sFailed:'失败', sReview:'待审', sPending:'待测',",
  "    hId:'ID', hCase:'用例', hNotes:'备注', hStatus:'状态', hActions:'操作',",
  "    none:'暂无', reviewNote:'需人工审查', notRun:'未运行', edit:'编辑',",
  "    saveFailed:'保存失败', lStatus:'状态', lNotes:'备注',",
  "    phNotes:'记录审查意见、原因等…', bCancel:'取消', bSave:'保存',",
  "    thLight:'浅色', thDark:'深色' }",
  "};",
  "function loadPrefs(){try{var m=document.cookie.match(/(?:^|; )cooltest-prefs=([^;]*)/);var p=JSON.parse(decodeURIComponent(m&&m[1]?m[1]:'null'));return p&&typeof p==='object'?p:{};}catch(e){return {};}}",
  "function savePrefs(){try{document.cookie='cooltest-prefs='+encodeURIComponent(JSON.stringify({lang:lang,theme:THEME}))+';path=/;max-age=31536000';}catch(e){}}",
  "var p=loadPrefs();",
  "var lang=p.lang==='zh'?'zh':'en';",
  "var THEME=p.theme==='light'?'light':'dark';",
  "function t(k){ return (I18N[lang] && I18N[lang][k]) || I18N.en[k]; }",
  "var STATUS = {passed:{label:function(){return t('sPassed');}},failed:{label:function(){return t('sFailed');}},review:{label:function(){return t('sReview');}},pending:{label:function(){return t('sPending');}}};",
  "const ORDER = ['passed','failed','review','pending'];",
  "let cases = DATA.cases;",
  "function esc(s){return String(s).replace(/[&<>\"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[ch];});}",
  "function applyStatic(){",
  "  document.querySelectorAll('[data-i18n]').forEach(function(el){el.textContent = t(el.dataset.i18n);});",
  "  var ph = document.querySelector('[data-i18n-ph]'); if(ph) ph.placeholder = t(ph.dataset.i18nPh);",
  "  document.querySelectorAll('#lang-toggle button').forEach(function(b){b.classList.toggle('active', b.dataset.lang === lang);});",
  "  document.querySelectorAll('#theme-toggle button').forEach(function(b){b.classList.toggle('active', b.dataset.theme === THEME);});",
  "  document.documentElement.lang = lang;",
  "}",
  "function applyTheme(){",
  "  document.documentElement.dataset.theme = THEME;",
  "}",
  "function render(){",
  "  var filter = document.querySelector('.filters button.active').dataset.filter;",
  "  var list = cases.filter(function(c){return filter === 'all' || c.status === filter;});",
  "  var stats = {passed:0,failed:0,review:0,pending:0};",
  "  for (var i=0;i<cases.length;i++) stats[cases[i].status]++;",
  "  stats.all = cases.length;",
  "  for (var k in stats) document.querySelector('[data-count='+k+']').innerHTML = '<span class=\"sep\">·</span><span class=\"num\">'+stats[k]+'</span>';",
  "  var g = document.getElementById('groups'); g.innerHTML = '';",
  "  var tbl = document.createElement('table');",
  "  tbl.innerHTML = \"<thead><tr><th style='width:110px'>\"+t('hId')+\"</th><th style='width:30%'>\"+t('hCase')+\"</th><th style='width:30%'>\"+t('hNotes')+\"</th><th style='width:90px'>\"+t('hStatus')+\"</th><th style='width:70px'>\"+t('hActions')+\"</th></tr></thead>\";",
  "  var tb = document.createElement('tbody');",
  "  if (!list.length) {",
  "    tb.innerHTML = \"<tr><td colspan='5' class='empty'>\"+t('none')+\"</td></tr>\";",
  "  } else {",
  "    for (var i=0;i<list.length;i++) {",
  "      var c = list[i];",
  "      var tr = document.createElement('tr');",
  "      var note = c.notes;",
  "      if (!note) note = c.status === 'review' ? t('reviewNote') : '';",
  "      var tm = c.lastRunAt ? fmtTime(c.lastRunAt) : t('notRun');",
  "      tr.innerHTML = ",
      "        \"<td class='case-id'>\"+esc(String(c.id||'--').toUpperCase())+\"</td>\"+",
  "        \"<td><div class='case-title'>\"+esc(c.title||'--')+\"</div><div class='case-time'>\"+esc(tm||'--')+\"</div></td>\"+",
  "        \"<td><div class='cell-note\"+(note?'':' none')+\"'>\"+esc(note||'--')+\"</div></td>\"+",
  "        \"<td><span class='st \"+c.status+\"'>\"+STATUS[c.status].label()+\"</span></td>\"+",
  "        \"<td><button class='btn-text' data-id='\"+c.id+\"' data-action='edit'>\"+t('edit')+\"</button></td>\";",
  "      tb.appendChild(tr);",
  "    }",
  "  }",
  "  tbl.appendChild(tb); g.appendChild(tbl);",
  "  applyStatic();",
  "}",
  "function fmtTime(iso){",
  "  var d = new Date(iso); if (isNaN(d.getTime())) return iso;",
  "  var p = function(n){return String(n).padStart(2,'0');};",
  "  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());",
  "}",
  "function openEdit(c){",
  "  document.getElementById('m-title').textContent = c.title;",
  "  document.getElementById('m-id').textContent = c.id;",
  "  document.getElementById('m-status').innerHTML = ORDER.map(function(o){return \"<option value='\"+o+\"'\"+(o===c.status?' selected':'')+\">\"+STATUS[o].label()+\"</option>\";}).join('');",
  "  document.getElementById('m-notes').value = c.notes || '';",
  "  document.getElementById('modal').classList.add('open');",
  "}",
  "function save(id,status,notes){",
  "  fetch('/api/case',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,status:status,notes:notes})})",
  "    .then(function(r){return r.json();})",
  "    .then(function(res){",
  "      if(!res.ok){alert(res.error||t('saveFailed'));return;}",
  "      var found = cases.find(function(x){return x.id===id;});",
  "      if(found){found.status=status;found.notes=notes;}",
  "      render();",
  "    });",
  "}",
  "document.addEventListener('click',function(e){",
  "  var tgt = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;",
  "  var langBtn = tgt.closest('[data-lang]');",
  "  if(langBtn){lang = langBtn.dataset.lang; savePrefs(); render(); return;}",
  "  var thBtn = tgt.closest('#theme-toggle [data-theme]');",
  "  if(thBtn){THEME=thBtn.dataset.theme; savePrefs(); applyTheme(); render(); return;}",
  "  var edit = tgt.closest('[data-action=edit]');",
  "  if(edit){var c=cases.find(function(x){return x.id===edit.dataset.id;});if(c)openEdit(c);return;}",
  "  if(tgt.closest('[data-action=save]')){",
  "    save(document.getElementById('m-id').textContent,document.getElementById('m-status').value,document.getElementById('m-notes').value);",
  "    document.getElementById('modal').classList.remove('open');return;",
  "  }",
  "  if(tgt.closest('[data-action=cancel]')){document.getElementById('modal').classList.remove('open');return;}",
"  var f = tgt.closest('[data-filter]');",
"  if(f){document.querySelectorAll('.filters button').forEach(function(b){b.classList.toggle('active',b===f);});render();}",
"});",
"applyTheme();",
"render();",
].join("");

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function htmlFor(suite) {
  return (
    "<!doctype html><html lang='en'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<script>try{var _m=(document.cookie.match(/(?:^|; )cooltest-prefs=([^;]*)/)||[])[1];var _p=_m?JSON.parse(decodeURIComponent(_m)):{};document.documentElement.dataset.theme=_p.theme==='light'?'light':'dark';}catch(e){}</script>" +
    "<title>Cool Test</title><style>" + CSS + "</style></head><body>" +
    "<div class='topbar'><h1>Cool Test</h1><div class='prefs'>" +
    "<div class='theme-toggle' id='theme-toggle'>" +
    "<button data-theme='dark'><span data-i18n='thDark'>Dark</span></button>" +
    "<button data-theme='light'><span data-i18n='thLight'>Light</span></button>" +
    "</div>" +
    "<div class='lang-toggle' id='lang-toggle'>" +
    "<button data-lang='en' class='active'>EN</button>" +
    "<button data-lang='zh'>中文</button>" +
    "</div></div></div>" +
    "<div class='sub'>" + suite.suite.source + " · " + formatTime(suite.suite.updatedAt) + "</div>" +
    "<div class='filters'>" +
    "<button class='active' data-filter='all'><span data-i18n='fAll'>All</span><span class='cnt' data-count='all'></span></button>" +
    "<button data-filter='passed' class='tag-passed'><span data-i18n='fPassed'>Passed</span><span class='cnt' data-count='passed'></span></button>" +
    "<button data-filter='failed' class='tag-failed'><span data-i18n='fFailed'>Failed</span><span class='cnt' data-count='failed'></span></button>" +
    "<button data-filter='review' class='tag-review'><span data-i18n='fReview'>Review</span><span class='cnt' data-count='review'></span></button>" +
    "<button data-filter='pending' class='tag-pending'><span data-i18n='fPending'>Pending</span><span class='cnt' data-count='pending'></span></button>" +
    "</div>" +
    "<div id='groups'></div>" +
    "<div class='modal' id='modal'><div class='modal-box'>" +
    "<h3 id='m-title'></h3><div class='m-sub'>ID: <span id='m-id'></span></div>" +
    "<div class='field'><label data-i18n='lStatus'>Status</label><select id='m-status'></select></div>" +
    "<div class='field'><label data-i18n='lNotes'>Notes</label><textarea id='m-notes' data-i18n-ph='phNotes' placeholder='Record review comments, reasons…'></textarea></div>" +
    "<div class='modal-actions'><button class='ghost' data-action='cancel'><span data-i18n='bCancel'>Cancel</span></button><button data-action='save'><span data-i18n='bSave'>Save</span></button></div>" +
    "</div></div>" +
    "<script>window.__DATA = " + JSON.stringify({ cases: suite.cases }) + ";</script>" +
    "<script>" + PAGE_JS + "</script>" +
    "</body></html>"
  );
}

const server = createServer(async function (req, res) {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "POST" && url.pathname === "/api/case") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const patch = JSON.parse(body || "{}");
      const suite = await readSuite();
      const item = suite.cases.find(function (c) { return c.id === patch.id; });
      if (!item) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "case not found" }));
        return;
      }
      if (patch.status !== undefined) item.status = patch.status;
      if (patch.notes !== undefined) item.notes = patch.notes;
      suite.suite.updatedAt = new Date().toISOString();
      await fs.writeFile(jsonPath, JSON.stringify(suite, null, 2), "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, id: item.id, status: item.status }));
      return;
    }
    const suite = await readSuite();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlFor(suite));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: String(err) }));
  }
});

server.listen(port, "127.0.0.1", function () {
  console.log("COOLTEST_REPORT_READY " + port);
});
