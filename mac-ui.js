/* Navigation and visual chrome only. The mathematical engine and particle canvas stay independent. */
(() => {
  'use strict';
  const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const isLab = !!q('#main-content');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    home:'M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9',
    verify:'m4 16 4-8 4 12 4-16 4 8M3 12h3m12 0h3',
    cases:'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
    tests:'M8 4H5v17h14V4h-3M8 3h8v4H8zm0 9 2 2 5-5m-7 9h8',
    transforms:'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',
    rules:'M12 4v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2z',
    search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
    chevron:'m9 5 7 7-7 7',
    sidebar:'M3 4h18v16H3zM9 4v16',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
  const entries = [
    {id:'home',title:'项目首页',desc:'回到粒子曲面与项目入口',keys:'home 首页'},
    {id:'verify',title:'推导验证',desc:'逐步检查推导，定位第一个错误',keys:'workbench verify 工作台'},
    {id:'cases',title:'案例广场',desc:'从典型问题理解变换与性质',keys:'examples cases 教学 案例'},
    {id:'tests',title:'交互题库',desc:'选择题目，作答并核对推导',keys:'practice tests 练习 题库'},
    {id:'transforms',title:'常用变换表',desc:'查阅傅里叶、拉普拉斯与 Z 变换',keys:'fourier laplace z 变换 公式'},
    {id:'rules',title:'规则图谱',desc:'查阅验证规则与适用条件',keys:'rules 规则 依据'},
  ];
  const groups = [
    {id:'work',title:'工作空间',note:'从推导到练习',items:['verify','cases','tests']},
    {id:'reference',title:'参考资料',note:'让每一步都有依据',items:['transforms','rules']},
  ];
  const entry = id => entries.find(e => e.id === id);
  const url = id => id === 'home' ? 'index.html' : `lab.html#${id}`;
  let current = isLab ? (typeof state !== 'undefined' ? state.view : 'verify') : 'home';
  const platformKey = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  document.body.classList.add('mac-ui', isLab ? 'mac-lab' : 'mac-home');

  const header = document.createElement('header');
  header.className = 'mac-header';
  header.innerHTML = `<div class="mac-header-inner"><a class="mac-brand" href="index.html">${icon('verify')}<span>SignalProof</span></a><nav class="mac-topnav" aria-label="全局导航"><span class="mac-top-highlight" aria-hidden="true"></span><a href="index.html" data-top-home>概览</a>${groups.map(g => `<button type="button" data-menu="${g.id}" aria-expanded="false" aria-controls="mac-mega">${g.title}<span class="mac-menu-chevron">⌄</span></button>`).join('')}</nav><button class="mac-search-trigger" type="button" aria-label="搜索与跳转（${platformKey}+K）">${icon('search')}<span>搜索与跳转</span><kbd>${platformKey} K</kbd></button></div><div class="mac-mega" id="mac-mega" hidden><div class="mac-mega-inner"></div></div>`;
  if (isLab) document.body.prepend(header); else q('.site-header').replaceWith(header);
  const mega = q('#mac-mega');
  let openMenu = null, closeTimer;
  function moveHighlight(container, target, selector) {
    const highlight = container.querySelector(selector);
    if (!target) { highlight.style.opacity = '0'; return; }
    const box = container.getBoundingClientRect(), rect = target.getBoundingClientRect();
    Object.assign(highlight.style, {opacity:'1',width:`${rect.width}px`,height:`${rect.height}px`,transform:`translate(${rect.left-box.left+container.scrollLeft}px, ${rect.top-box.top+container.scrollTop}px)`});
  }
  function topHighlight() {
    const group = groups.find(g => g.items.includes(current));
    moveHighlight(q('.mac-topnav'), q(openMenu ? `[data-menu="${openMenu}"]` : group ? `[data-menu="${group.id}"]` : '[data-top-home]'), '.mac-top-highlight');
  }
  function showMenu(id) {
    clearTimeout(closeTimer);
    if (openMenu === id) return;
    openMenu = id;
    const group = groups.find(g => g.id === id);
    q('.mac-mega-inner').innerHTML = `<div class="mac-mega-heading"><span>${group.title}</span><p>${group.note}</p></div><div class="mac-mega-links">${group.items.map(id => {const e=entry(id);return `<a href="${url(id)}" data-route="${id}">${icon(id)}<div><strong>${e.title}</strong><p>${e.desc}</p></div><span aria-hidden="true">↗</span></a>`;}).join('')}</div>`;
    mega.hidden = false;
    all('[data-menu]').forEach(b => b.setAttribute('aria-expanded', String(b.dataset.menu === id)));
    topHighlight();
  }
  function closeMenu() {
    clearTimeout(closeTimer); openMenu = null; mega.hidden = true;
    all('[data-menu]').forEach(b => b.setAttribute('aria-expanded','false')); topHighlight();
  }
  all('[data-menu]').forEach(button => {
    button.addEventListener('pointerenter', e => { if(e.pointerType === 'mouse') showMenu(button.dataset.menu); });
    button.addEventListener('click', e => {
      // A mouse click follows pointerenter; keep the panel open instead of immediately closing it.
      if(e.pointerType === 'mouse') showMenu(button.dataset.menu);
      else openMenu === button.dataset.menu ? closeMenu() : showMenu(button.dataset.menu);
    });
    button.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {e.preventDefault();showMenu(button.dataset.menu);mega.querySelector('a').focus();}
    });
  });
  header.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  header.addEventListener('pointerleave', () => {closeTimer=setTimeout(closeMenu,180);});
  header.addEventListener('focusout', () => {setTimeout(()=>{if(!header.contains(document.activeElement))closeMenu();},0);});
  document.addEventListener('pointerdown', e => {if(!header.contains(e.target))closeMenu();});
  document.addEventListener('keydown', e => {if(e.key === 'Escape' && openMenu){const button=q(`[data-menu="${openMenu}"]`);closeMenu();button.focus();}});

  let tree;
  if (isLab) {
    const aside = q('.sidebar'), examples = q('#side-examples');
    aside.innerHTML = `<div class="mac-sidebar-heading"><span>资料库</span><span class="mac-sidebar-symbol">${icon('sidebar')}</span></div><nav class="mac-tree" aria-label="工作台导航"><span class="mac-side-highlight" aria-hidden="true"></span>${groups.map((g,i)=>`<section class="mac-group"><button class="mac-group-toggle" aria-controls="mac-group-${g.id}" aria-expanded="${i===0}">${icon('chevron')}<span>${g.title}</span></button><div id="mac-group-${g.id}" class="mac-group-content" ${i?'hidden':''}><div class="mac-subitems">${g.items.map((id,n)=>`<a class="mac-side-link" href="${url(id)}" data-route="${id}" style="--order:${n}">${icon(id)}<span>${entry(id).title}</span><span class="mac-indicators" data-indicator="${id}" hidden><i class="mac-status-dot" aria-hidden="true"></i><span class="mac-number"></span></span></a>`).join('')}</div></div></section>`).join('')}</nav><div class="mac-sidebar-heading mac-featured-label">继续探索</div><div class="mac-featured"></div><div class="mac-sidebar-foot">${icon('verify')}<span>把注意力留给推导。</span></div>`;
    q('.mac-featured').append(examples);
    tree = q('.mac-tree');
    all('.mac-group-toggle').forEach(button => button.addEventListener('click',()=>expandGroup(button.getAttribute('aria-expanded')!=='true'?button:null)));
    // Retain the live engine status and breadcrumb already owned by app.js.
    q('.breadcrumb a').textContent='工作台';
  }
  const groupAnimations = new WeakMap();
  function expandGroup(button) {
    all('.mac-group-toggle').forEach(b=>{
      const expanded=b===button, wasExpanded=b.getAttribute('aria-expanded')==='true';
      b.setAttribute('aria-expanded',String(expanded));
      const content=q('#'+b.getAttribute('aria-controls'));
      if(expanded===wasExpanded)return;
      const start=content.hidden?0:content.getBoundingClientRect().height;
      groupAnimations.get(content)?.cancel();
      content.inert=!expanded;
      if(reduce.matches){content.hidden=!expanded;return;}
      content.hidden=false;content.style.overflow='hidden';
      const animation=content.animate([{height:`${start}px`,opacity:wasExpanded?1:0},{height:`${expanded?content.scrollHeight:0}px`,opacity:expanded?1:0}],{duration:230,easing:'cubic-bezier(.2,.75,.25,1)'});
      groupAnimations.set(content,animation);
      animation.finished.then(()=>{content.hidden=!expanded;content.style.overflow='';groupAnimations.delete(content);sideHighlight();}).catch(()=>{});
    });
    sideHighlight();
  }
  function sideHighlight() {
    if(!tree)return;
    const active=tree.querySelector(`[data-route="${current}"]`);
    const groupButton=active?.closest('.mac-group').querySelector('button');
    const target=groupButton?.getAttribute('aria-expanded')==='false'?groupButton:active;
    moveHighlight(tree,target,'.mac-side-highlight');
  }
  const dock=document.createElement('nav');dock.className='mac-dock';dock.setAttribute('aria-label','快捷停靠栏');
  dock.innerHTML=entries.map(e=>`<a href="${url(e.id)}" class="mac-dock-item" data-route="${e.id}" aria-label="${e.title}"><span class="mac-dock-tooltip">${e.title}</span><span class="mac-dock-icon mac-icon-${e.id}">${icon(e.id)}</span><span class="mac-dock-dot" aria-hidden="true"></span></a>`).join('');document.body.append(dock);
  const dockItems=[...dock.children];
  function magnify(index) {dockItems.forEach((item,i)=>item.style.setProperty('--zoom',index<0?'1':String(Math.max(1,1.42-Math.abs(i-index)*.24))));}
  dockItems.forEach((item,i)=>{
    item.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')magnify(i);});
    item.addEventListener('focus',()=>magnify(i));
  });
  dock.addEventListener('pointerleave',()=>magnify(-1));dock.addEventListener('focusout',()=>magnify(-1));

  const dialog=document.createElement('dialog');dialog.className='mac-command';
  dialog.setAttribute('aria-labelledby','mac-command-title');
  dialog.innerHTML=`<h2 id="mac-command-title" class="mac-sr-only">搜索与跳转</h2><div class="mac-command-search">${icon('search')}<input id="mac-command-input" role="combobox" aria-label="搜索页面" aria-autocomplete="list" aria-expanded="true" aria-controls="mac-command-results" placeholder="想去哪里？搜索页面或功能…" autocomplete="off"><button class="mac-command-close" aria-label="关闭命令面板">Esc</button></div><div class="mac-command-label">快速前往</div><div id="mac-command-results" role="listbox" aria-label="匹配页面"></div><p class="mac-command-empty" hidden>没有匹配的页面，试试“题库”或“变换”。</p><div class="mac-command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span><span><kbd>esc</kbd> 关闭</span><span id="mac-command-count" role="status"></span></div>`;
  document.body.append(dialog);
  const input=q('#mac-command-input'); let filtered=entries,selected=0,returnFocus;
  function highlight(text,term) {
    const index=text.toLowerCase().indexOf(term.toLowerCase());
    if(!term||index<0)return escape(text);
    return `${escape(text.slice(0,index))}<mark>${escape(text.slice(index,index+term.length))}</mark>${escape(text.slice(index+term.length))}`;
  }
  function renderCommands() {
    const term=input.value.trim(); filtered=entries.filter(e=>`${e.title} ${e.desc} ${e.keys}`.toLowerCase().includes(term.toLowerCase()));selected=0;
    q('#mac-command-results').innerHTML=filtered.map((e,i)=>`<div role="option" aria-selected="${i===0}" id="mac-option-${i}" data-command="${e.id}">${icon(e.id)}<div><strong>${highlight(e.title,term)}</strong><p>${highlight(e.desc,term)}</p></div><span class="mac-command-enter" aria-hidden="true">↵</span></div>`).join('');
    q('.mac-command-empty').hidden=!!filtered.length;
    q('#mac-command-count').textContent=`${filtered.length} 个结果`; selectCommand(0);
  }
  function selectCommand(index) {
    selected=index;all('[data-command]').forEach((el,i)=>el.setAttribute('aria-selected',String(i===selected)));
    if(filtered.length){input.setAttribute('aria-activedescendant',`mac-option-${index}`);q(`#mac-option-${index}`).scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');
  }
  function openCommand() {if(dialog.open)return;closeMenu();returnFocus=document.activeElement;input.value='';dialog.showModal();document.body.classList.add('mac-command-open');renderCommands();input.focus();}
  function closeCommand(){dialog.close();}
  dialog.addEventListener('close',()=>{document.body.classList.remove('mac-command-open');if(returnFocus?.isConnected)returnFocus.focus();});
  q('.mac-search-trigger').addEventListener('click',openCommand);
  q('.mac-command-close').addEventListener('click',closeCommand);
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCommand();}});
  input.addEventListener('input',renderCommands);
  input.addEventListener('keydown',e=>{
    if(e.isComposing)return;
    if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(filtered.length)selectCommand((selected+(e.key==='ArrowDown'?1:-1)+filtered.length)%filtered.length);}
    if(e.key==='Enter'&&filtered.length){e.preventDefault();const id=filtered[selected].id;closeCommand();navigate(id,true);}
  });
  q('#mac-command-results').addEventListener('click',e=>{const option=e.target.closest('[data-command]');if(option){closeCommand();navigate(option.dataset.command,true);}});
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dialog.open?closeCommand():openCommand();}});

  function navigate(id,focus=false) {
    closeMenu();
    if(isLab&&id!=='home'){switchView(id);if(focus){const heading=q(`#${id}-view h1`);heading.tabIndex=-1;heading.focus({preventScroll:true});}}
    else location.href=url(id);
  }
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-route]');if(!link||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;
    if(isLab&&link.dataset.route!=='home'){e.preventDefault();navigate(link.dataset.route);}
  });
  const contentInfo=new Map();
  function readSeen(){try{const d=JSON.parse(localStorage.getItem('signalproof-seen-content-v1')||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}}
  let seen=readSeen();
  function markSeen(id) {
    const info=contentInfo.get(id);if(!info)return;seen[id]=info.version;
    try{localStorage.setItem('signalproof-seen-content-v1',JSON.stringify(seen));}catch{}
    all(`[data-indicator="${id}"]`).forEach(el=>{
      if(!el.hidden&&!reduce.matches){el.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.3)'}],{duration:180}).finished.then(()=>{el.hidden=true;}).catch(()=>{});}else el.hidden=true;
    });
  }
  function updateBadges() {
    for(const [id,info] of contentInfo){
      all(`[data-indicator="${id}"]`).forEach(el=>{
        const unseen=seen[id]!==info.version&&current!==id;
        el.hidden=!unseen;el.title=`${info.count} ${info.unit} · 尚未浏览当前内容`;
        el.setAttribute('aria-label',el.title);
        const number=el.querySelector('.mac-number');
        if(number.dataset.count!==String(info.count)){
          const old=number.dataset.count||'';number.dataset.count=String(info.count);
          number.innerHTML=`<span class="mac-number-value">${info.count}</span>`;
          if(!reduce.matches){
            const incoming=number.firstElementChild;
            incoming.animate([{transform:'translateY(100%)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:320,easing:'ease-out'});
            if(old){const outgoing=document.createElement('span');outgoing.className='mac-number-old';outgoing.textContent=old;outgoing.setAttribute('aria-hidden','true');number.append(outgoing);outgoing.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-100%)',opacity:0}],{duration:320,easing:'ease-out'}).finished.then(()=>outgoing.remove()).catch(()=>outgoing.remove());}
          }
        }
      });
    }
  }
  async function loadCount(id,path,extract,unit){
    try{const response=await fetch(path);if(!response.ok)return;const text=await response.text();const count=extract(JSON.parse(text));
      const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
      contentInfo.set(id,{count,unit,version:Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('')});
      if(current===id)markSeen(id);updateBadges();
    }catch{/* Navigation remains usable when offline or storage is unavailable. */}
  }
  function sync(view=current) {
    current=view;
    all('[data-route]').forEach(el=>{if(el.dataset.route===current)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    if(isLab){const active=tree.querySelector(`[data-route="${current}"]`);if(active)expandGroup(active.closest('.mac-group').querySelector('.mac-group-toggle'));}
    q('[data-top-home]').toggleAttribute('aria-current',current==='home');
    if(current==='home')q('[data-top-home]').setAttribute('aria-current','page');
    topHighlight();sideHighlight();markSeen(current);
  }
  window.addEventListener('signalproof:view',e=>sync(e.detail));
  window.addEventListener('storage',e=>{if(e.key==='signalproof-seen-content-v1'){seen=readSeen();updateBadges();}});
  new ResizeObserver(()=>{topHighlight();sideHighlight();}).observe(header);
  if(tree)new ResizeObserver(sideHighlight).observe(tree);
  sync();
  if(isLab){
    loadCount('cases','data/examples.json',d=>d.length,'个案例');
    loadCount('tests','data/question-bank.json',d=>d.cases.length,'道题目');
    loadCount('rules','data/rule-latex.json',d=>Object.keys(d).length,'条规则');
  }
})();
