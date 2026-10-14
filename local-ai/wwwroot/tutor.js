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
    const p = document.createElement('p'); p.className = 'empty'; p.textContent = '选中推导后，获取解释或一条提示。'; $('#answer').append(p);
    $('#answer-meta').hidden = true; $('#answer-error').hidden = true;
    $('#answer-context').textContent = '从一个小问题开始。';
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
    $('#source-note').textContent = source === 'attempt' ? '原推导可能包含错误。选择想讨论的一行。' : '题库参考推导。选择一行，理解所用的性质与条件。';
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
    $('#selection').textContent = `已选择第 ${selected} 行`; setBusy(!!pending);
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
    const controller = new AbortController(); pending = controller; clearAnswer(); $('#answer').replaceChildren(); setBusy(true);
    $('#answer-context').textContent = `${current.title} · ${source === 'reference' ? '参考推导' : '原推导'}第 ${selected} 行 · ${mode === 'hint' ? '提示' : '解释'}`;
    const started=Date.now(), update=()=> { $('#progress-text').textContent=`Astra 正在思考 · ${Math.floor((Date.now()-started)/1000)} 秒`; }; update();
    const timer=setInterval(update,1000);
    try {
      const response = await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json','X-SignalProof-Request':'1'},body:JSON.stringify({questionId:current.id,step:selected,mode,source}),signal:controller.signal});
      const result = await response.json(); if (!response.ok) throw new Error(result.error || `请求失败（${response.status}）`);
      if (pending !== controller) return;
      renderAnswer(result.answer); $('#answer-meta').hidden=false;
      $('#answer-meta').textContent=`${result.model} · ${result.reasoningEffort} · ${(result.elapsedMs/1000).toFixed(1)} 秒${result.usage?.total_tokens ? ` · ${result.usage.total_tokens} tokens` : ''}`;
    } catch (error) {
      if (pending !== controller) return;
      if (error.name === 'AbortError') $('#answer').textContent='已停止。可以重新选择或再次提问。';
      else { $('#answer-error').textContent=error.message || '请求失败，请重试。'; $('#answer-error').hidden=false; }
    } finally { clearInterval(timer); if (pending === controller) { pending=null; setBusy(false); } }
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
    configured=status.configured; $('#connection').textContent=configured?'本地服务已就绪':'等待配置 API Key';
    $('#model').textContent=`${status.model} · ${status.reasoningEffort}`;
    if(!configured){$('#load-error').textContent='请在 local-ai/.env 中填写 API Key，然后重启本地服务并刷新页面。';$('#load-error').hidden=false;}
    questions=data.cases;
    for(const category of new Set(questions.map(q=>q.category))){const option=document.createElement('option');option.value=option.textContent=category;$('#category').append(option);}
    selectQuestion(questions.find(q=>q.id==='Q101')||questions[0]);
  }).catch(()=>{$('#load-error').textContent='无法载入本地助教。请确认 C# 服务已启动，再刷新页面。';$('#load-error').hidden=false;$('#connection').textContent='连接未完成';});
})();
