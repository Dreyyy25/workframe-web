(function(){
  var WFApp = window.WFApp = {};
  var root = document.documentElement;

  // ---------- ICONS (Lucide-style, 24x24 stroke) ----------
  var ICONS = {
    sun:'<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
    moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    building:'<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01"/>',
    grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.7 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 5 13.6H5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 6.3 6.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 12 3.3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    check:'<path d="M20 6L9 17l-5-5"/>',
    x:'<path d="M18 6L6 18M6 6l12 12"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z"/>',
    chevron:'<path d="M6 9l6 6 6-6"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    trash:'<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  };
  WFApp.icon = function(name,cls){
    var p = ICONS[name]||'';
    return '<svg class="'+(cls||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
  };

  // ---------- HELPERS ----------
  WFApp.qs = function(name){ return new URLSearchParams(location.search).get(name); };
  WFApp.escapeHtml = function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  WFApp.money = function(min,max,type){
    var suffix = type==='hourly'?'/hr':type==='monthly'?'/mo':'/yr';
    var fmt=function(n){ return type==='hourly'? '$'+n : '$'+(n/1000)+'k'; };
    return fmt(min)+'–'+fmt(max)+' '+suffix;
  };
  WFApp.company = function(id){ return (WF.companies||[]).filter(function(c){return c.id===id;})[0]; };
  WFApp.job = function(id){ return (WF.jobs||[]).filter(function(j){return j.id===id;})[0]; };
  WFApp.statusBadge = function(status){
    var icon = status==='accepted'?'check':status==='rejected'?'x':status==='reviewed'?'search':status==='withdrawn'?'x':'clock';
    var label = status.charAt(0).toUpperCase()+status.slice(1);
    return '<span class="badge badge--'+status+'">'+WFApp.icon(icon)+label+'</span>';
  };

  // ---------- SESSION STATE (in-memory, resets on reload) ----------
  WFApp.state = { applications: (WF.applications||[]).slice(), applicants:(WF.applicants||[]).slice() };

  // ---------- THEME ----------
  WFApp.initTheme = function(){
    try{ var t = localStorage.getItem('wf-theme')|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); root.setAttribute('data-theme',t);}catch(e){}
  };
  WFApp.toggleTheme = function(){
    var t = root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',t);
    try{ localStorage.setItem('wf-theme',t); }catch(e){}
    [].forEach.call(document.querySelectorAll('.theme-toggle'),function(btn){ btn.innerHTML = WFApp.icon(t==='dark'?'sun':'moon'); });
  };
  function themeToggleHtml(){ var t=root.getAttribute('data-theme'); return '<button class="theme-toggle" aria-label="Toggle dark mode" onclick="WFApp.toggleTheme()">'+WFApp.icon(t==='dark'?'sun':'moon')+'</button>'; }

  // ---------- SHELL RENDERING ----------
  var B; // base prefix
  function link(href){ return B+href; }

  function marketingNav(){
    var auth=document.body.getAttribute('data-auth');
    var active=document.body.getAttribute('data-active');
    function navlink(key,href,label){ return '<a href="'+link(href)+'"'+(active===key?' aria-current="page"':'')+'>'+label+'</a>'; }
    var right = auth==='guest'
      ? '<a class="btn btn--ghost btn--sm" href="'+link('login.html')+'">Log in</a><a class="btn btn--primary btn--sm" href="'+link('register.html')+'">Sign up</a>'
      : '<div class="dropdown"><button class="avatar" aria-label="Account menu" aria-haspopup="true" onclick="WFApp._dd(this)">'+(auth==='company'?'NL':'MO')+'</button>'+
        '<div class="dropdown__menu" hidden>'+
          (auth==='seeker'
            ? '<a href="'+link('seeker/dashboard.html')+'">'+WFApp.icon('grid')+'Dashboard</a><a href="'+link('seeker/applications.html')+'">'+WFApp.icon('inbox')+'My Applications</a><a href="'+link('seeker/profile.html')+'">'+WFApp.icon('user')+'Profile</a>'
            : '<a href="'+link('company/dashboard.html')+'">'+WFApp.icon('grid')+'Dashboard</a>')+
          '<a href="'+link('account/settings.html')+'">'+WFApp.icon('settings')+'Settings</a>'+
          '<button onclick="location.href=\''+link('index.html')+'\'">'+WFApp.icon('logout')+'Log out</button>'+
        '</div></div>';
    return '<header class="topnav"><div class="container topnav__inner">'+
      '<a class="brand" href="'+link('index.html')+'"><span class="brand__mark"></span>WORKFRAME</a>'+
      '<nav class="topnav__links" aria-label="Primary">'+navlink('jobs','jobs.html','Find Jobs')+navlink('companies','companies.html','Companies')+navlink('employers','for-employers.html','For Employers')+'</nav>'+
      '<div class="topnav__right">'+themeToggleHtml()+right+
        '<button class="btn btn--ghost btn--sm nav-toggle" aria-label="Menu" onclick="document.querySelector(\'.topnav__links\').classList.toggle(\'open\')">'+WFApp.icon('menu')+'</button>'+
      '</div></div></header>';
  }

  function consoleShell(){
    var active=document.body.getAttribute('data-active');
    function s(key,href,icon,label){ return '<a class="sidebar__link'+(active===key?' sidebar__link--active':'')+'" href="'+link(href)+'">'+WFApp.icon(icon)+label+'</a>'; }
    var side='<aside class="sidebar" id="sidebar"><a class="brand" href="'+link('company/dashboard.html')+'"><span class="brand__mark"></span>WORKFRAME</a>'+
      s('dashboard','company/dashboard.html','grid','Dashboard')+
      s('posts','company/jobs.html','briefcase','Job Posts')+
      s('post-job','company/post-job.html','plus','Post a Job')+
      s('applicants','company/applicants.html','inbox','Applicants')+
      s('company-profile','company/profile.html','building','Company Profile')+
      s('settings','account/settings.html','settings','Settings')+'</aside>';
    var topbar='<div class="console-topbar"><button class="btn btn--ghost btn--sm nav-toggle" aria-label="Menu" onclick="document.getElementById(\'sidebar\').classList.toggle(\'open\')">'+WFApp.icon('menu')+'</button>'+
      '<strong style="font-family:var(--font-display)">Northwind Labs</strong>'+
      '<div class="cluster">'+themeToggleHtml()+'<a class="btn btn--ghost btn--sm" href="'+link('index.html')+'">'+WFApp.icon('logout')+'Log out</a></div></div>';
    return {side:side, topbar:topbar};
  }

  function footer(){
    return '<footer class="footer"><div class="container footer__inner">'+
      '<div><a class="brand" href="'+link('index.html')+'" style="margin-bottom:12px"><span class="brand__mark"></span>WORKFRAME</a><p class="muted" style="max-width:280px">Find work that works for you. A two-sided job marketplace prototype.</p></div>'+
      '<div><strong>For Seekers</strong><a href="'+link('jobs.html')+'">Browse jobs</a><a href="'+link('companies.html')+'">Companies</a></div>'+
      '<div><strong>For Companies</strong><a href="'+link('for-employers.html')+'">Post a job</a><a href="'+link('register.html')+'">Sign up</a></div>'+
      '<div><strong>Workframe</strong><a href="'+link('index.html')+'">Home</a><a href="'+link('for-employers.html')+'">About</a></div>'+
      '</div></footer>';
  }

  WFApp._dd = function(btn){ var m=btn.parentNode.querySelector('.dropdown__menu'); m.hidden=!m.hidden; };
  document.addEventListener('click',function(e){ if(!e.target.closest('.dropdown')) { var o=document.querySelector('.dropdown__menu:not([hidden])'); if(o)o.hidden=true; } });

  WFApp.renderShell = function(){
    B = document.body.getAttribute('data-base')||'';
    var shell=document.body.getAttribute('data-shell');
    var top=document.getElementById('shell-top'), side=document.getElementById('shell-side'), foot=document.getElementById('shell-foot');
    if(shell==='marketing'){ if(top)top.innerHTML=marketingNav(); if(foot)foot.innerHTML=footer(); }
    else if(shell==='console'){
      var c=consoleShell();
      if(side)side.innerHTML=c.side;
      window.__consoleTopbar=c.topbar;
      var mt=document.getElementById('console-topbar-mount'); if(mt) mt.innerHTML=c.topbar;
    }
    // auth shell: nothing injected
  };

  // ---------- TABS ----------
  WFApp.initTabs = function(scope){
    scope=scope||document; var tabs=scope.querySelectorAll('.tab');
    [].forEach.call(tabs,function(t){ t.addEventListener('click',function(){
      var group=t.closest('.tabs'); [].forEach.call(group.querySelectorAll('.tab'),function(x){x.classList.remove('tab--active');x.setAttribute('aria-selected','false');});
      t.classList.add('tab--active'); t.setAttribute('aria-selected','true');
      var key=t.getAttribute('data-tab');
      [].forEach.call(document.querySelectorAll('[data-tabpanel]'),function(p){ p.hidden = p.getAttribute('data-tabpanel')!==key; });
    }); });
  };

  // ---------- MODAL ----------
  WFApp.openModal = function(html){
    var r=document.getElementById('modal-root');
    r.innerHTML='<div class="modal__scrim" onclick="if(event.target===this)WFApp.closeModal()"><div class="modal__panel" role="dialog" aria-modal="true">'+html+'</div></div>';
    document.addEventListener('keydown',escClose);
    var f=r.querySelector('input,textarea,select,button'); if(f)f.focus();
  };
  WFApp.closeModal = function(){ document.getElementById('modal-root').innerHTML=''; document.removeEventListener('keydown',escClose); };
  function escClose(e){ if(e.key==='Escape')WFApp.closeModal(); }

  // ---------- APPLY FLOW (Task 19, folded into foundation) ----------
  WFApp.applyModal = function(jobId){
    var j = WFApp.job(jobId); if(!j) return;
    WFApp.openModal(
      '<h2>Apply — '+WFApp.escapeHtml(j.title)+'</h2>'+
      '<p class="muted">A short cover letter helps your application stand out.</p>'+
      '<div class="field"><label class="field__label" for="cl">Cover letter <span class="req">*</span></label>'+
      '<textarea class="textarea" id="cl" placeholder="Why are you a great fit?"></textarea>'+
      '<div class="field__error" id="cl-err" hidden>'+WFApp.icon('x')+'Please add a short cover letter.</div></div>'+
      '<div class="cluster" style="justify-content:flex-end;margin-top:8px">'+
      '<button class="btn btn--ghost" onclick="WFApp.closeModal()">Cancel</button>'+
      '<button class="btn btn--primary" onclick="WFApp._submitApply(\''+jobId+'\')">Submit application</button></div>'
    );
  };
  WFApp._submitApply = function(jobId){
    var ta=document.getElementById('cl'); var err=document.getElementById('cl-err');
    if(!ta.value.trim()){ err.hidden=false; ta.focus(); return; }
    WFApp.state.applications.unshift({id:'a'+Date.now(),jobId:jobId,status:'pending',applied:'2026-06-01',cover:ta.value.trim()});
    WFApp.closeModal(); WFApp.toast('Application submitted');
    var btn=document.getElementById('apply-btn'); if(btn){ btn.outerHTML='<button class="btn btn--secondary" id="apply-btn" disabled>'+WFApp.icon('check')+'Applied</button>'; }
  };

  // ---------- TOAST ----------
  WFApp.toast = function(msg,kind){
    var r=document.getElementById('toast-root'); if(!r) return;
    var el=document.createElement('div'); el.className='toast';
    el.innerHTML=WFApp.icon(kind==='error'?'x':'check')+'<span>'+WFApp.escapeHtml(msg)+'</span>'; r.appendChild(el);
    setTimeout(function(){ el.remove(); },3500);
  };

  // ---------- BOOT ----------
  WFApp.initTheme();
  document.addEventListener('DOMContentLoaded',function(){ WFApp.renderShell(); WFApp.initTabs(); });
})();
