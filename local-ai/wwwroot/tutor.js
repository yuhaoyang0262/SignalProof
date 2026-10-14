(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  let questions = [], current, source = 'attempt', selected = 1, configured = false, pending = null;
  function math(target, latex, displayMode = true) {
    // The shared question bank escapes formatter backslashes twice.
    katex.render(String(latex || '').replace(/\\\\/g, '\\'), target, {displayMode, throwOnError:false, trust:false, strict:'ignore'});
  }
  function clearAnswer() {
    $('#answer').replaceChildren();
    $('#answer-error').hidden = true; $('.conversation').hidden = true;
  }
  function stopRequest() { if (pending) { pending.abort(); pending = null; } setBusy(false); }
  function setBusy(busy) {
    $('#explain').disabled = $('#hint').disabled = busy || !configured || !current;
    $('#cancel').hidden = !busy; $('#progress').hidden = !busy;
    $('.conversation').setAttribute('aria-busy', String(busy));
  }
  function selectQuestion(question) { stopRequest(); current = question; selected = 1; clearAnswer(); renderList(); renderQuestion(); }
  function renderList() {
    const term = $('#search').value.trim().toLowerCase(), category = $('#category').value;
    const matches = questions.filter(q => (!category || q.category === category) && `${q.number} ${q.id} ${q.title} ${q.category}`.toLowerCase().includes(term));
    $('#count').textContent = `${matches.length}`; $('#questions').replaceChildren();
    for (const item of matches) {
      const button = document.createElement('button'); button.className = 'question'; button.type = 'button'; button.dataset.id = item.id;
      button.setAttribute('aria-pressed', String(item.id === current?.id));
      const title = document.createElement('strong'); title.textContent = item.title;
      const meta = document.createElement('small'); meta.textContent = `${String(item.number).padStart(3,'0')} · ${item.category} · ${item.difficulty}`;
      button.append(title,meta); button.addEventListener('click', () => selectQuestion(item)); $('#questions').append(button);
    }
    if (!matches.length) { const p = document.createElement('p'); p.className='no-results'; p.textContent='没有匹配的题目'; $('#questions').append(p); }
  }
  function renderQuestion() {
    $('#question-title').textContent = current.title; $('#question-meta').textContent = `${current.category} · ${current.difficulty}`;
    $('#question-number').textContent = `#${String(current.number).padStart(3,'0')}`;
    $('#given').replaceChildren(); $('#given').hidden = !current.given?.length;
    for (const given of current.given || []) { const row=document.createElement('div'); math(row, typeof given === 'string' ? given : given.latex); $('#given').append(row); }
    $('#steps').replaceChildren();
    const rows = source === 'reference' ? current.solution : current.formatted;
    rows.forEach((row, i) => {
      const button = document.createElement('button'); button.type='button'; button.className='step'; button.dataset.step=i+1;
      button.setAttribute('aria-label', `选择第 ${i+1} 行推导`); button.setAttribute('aria-pressed', String(i+1 === selected));
      const number = document.createElement('span'); number.className='line-number'; number.textContent=String(i+1).padStart(2,'0');
      const formula = document.createElement('div'); formula.className='formula'; const equation=document.createElement('div');
      math(equation,row.latex); formula.append(equation);
      if (row.rocLatex) { const roc=document.createElement('div'); roc.className='roc'; math(roc,row.rocLatex,false); formula.append(roc); }
      button.append(number,formula); button.addEventListener('click', () => { stopRequest(); selected=i+1; clearAnswer(); renderQuestion(); }); $('#steps').append(button);
    });
    setBusy(!!pending);
  }
  // Model output is always text, with only bounded math delimiters rendered by KaTeX.
  function renderAnswer(text) {
    const root = $('#answer'); root.replaceChildren();
    const pattern = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$)/g;
    let start=0;
    for (const match of text.matchAll(pattern)) {
      root.append(document.createTextNode(text.slice(start,match.index)));
      const block=match[0].startsWith('\\[')||match[0].startsWith('$$'), el=document.createElement(block?'div':'span');
      katex.render(match[0].slice(2,-2),el,{displayMode:block,throwOnError:false,trust:false,strict:'ignore'}); root.append(el); start=match.index+match[0].length;
    }
    root.append(document.createTextNode(text.slice(start)));
  }
  async function ask(mode) {
    if (pending || !configured || !current) return;
    const controller = new AbortController(); pending = controller; clearAnswer(); $('.conversation').hidden = false; setBusy(true);
    try {
      const response = await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json','X-SignalProof-Request':'1'},body:JSON.stringify({questionId:current.id,step:selected,mode,source}),signal:controller.signal});
      const result = await response.json(); if (!response.ok) throw new Error(result.error || `请求失败（${response.status}）`);
      if (pending !== controller) return;
      renderAnswer(result.answer);
    } catch (error) {
      if (pending !== controller) return;
      if (error.name === 'AbortError') $('#answer').textContent='已停止。';
      else { $('#answer-error').textContent=error.message || '请求失败，请重试。'; $('#answer-error').hidden=false; }
    } finally { if (pending === controller) { pending=null; setBusy(false); } }
  }
  $('#search').addEventListener('input',renderList); $('#category').addEventListener('change',renderList);
  document.querySelectorAll('[data-source]').forEach(button=>button.addEventListener('click',()=>{
    if (!current || source === button.dataset.source) return;
    stopRequest(); source=button.dataset.source; selected=1; clearAnswer();
    document.querySelectorAll('[data-source]').forEach(b=>b.setAttribute('aria-pressed',String(b===button))); renderQuestion();
  }));
  $('#explain').addEventListener('click',()=>ask('explain')); $('#hint').addEventListener('click',()=>ask('hint'));
  $('#cancel').addEventListener('click',()=>{ if(pending) pending.abort(); });
  Promise.all([fetch('/api/status').then(r=>{if(!r.ok)throw new Error('状态读取失败');return r.json();}),fetch('/api/questions').then(r=>{if(!r.ok)throw new Error('题库读取失败');return r.json();})]).then(([status,data])=>{
    configured=status.configured;
    if(!configured){$('#load-error').textContent='助教暂不可用。';$('#load-error').hidden=false;}
    questions=data.cases;
    for(const category of new Set(questions.map(q=>q.category))){const option=document.createElement('option');option.value=option.textContent=category;$('#category').append(option);}
    selectQuestion(questions.find(q=>q.id==='Q101')||questions[0]);
  }).catch(()=>{$('#load-error').textContent='暂时无法载入，请刷新重试。';$('#load-error').hidden=false;});
})();
