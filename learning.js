/* Isolated teaching views; lookup and animation are available while Worker loads. */
(function(){
'use strict';
const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const types=window.TransformLibrary;
let category='fourier';
function renderPairs(){
 const group=types[category],term=q('#pair-search').value.trim().toLowerCase();
 const rows=group.entries.map((entry,index)=>({entry,index})).filter(({entry})=>entry.join(' ').toLowerCase().includes(term));
 q('#pair-convention').innerHTML=`<div class="math-scroll">${math(group.definition)}</div><p>${esc(group.note)}</p><div class="pair-notation math-scroll">${math(group.notation,'',false)}</div>`;
 q('#pair-count').textContent=`${group.title} · ${rows.length} / ${group.entries.length} 组`;
 q('#pair-list').innerHTML=rows.length?rows.map(({entry:e,index:i})=>`<article class="pair-row"><div class="pair-row-head"><h2><span class="pair-index">${String(i+1).padStart(2,'0')}</span>${esc(e[0])}</h2><button class="pair-copy" data-pair="${i}" aria-label="复制${esc(e[0])}变换对的 LaTeX">复制 LaTeX ↗</button></div><div class="pair-equation"><div><div class="pair-label">${group.input}</div><div class="math-scroll">${math(e[1])}</div></div><span class="pair-arrow" aria-hidden="true">⟷</span><div><div class="pair-label">${group.output}</div><div class="math-scroll">${math(e[2])}</div></div></div>${e[3]||e[4]?`<div class="pair-condition"><span>${category==='fourier'?'条件':'ROC / 条件'}</span>${e[3]?`<div class="math-scroll">${math(e[3],'',false)}</div>`:''}${e[4]?`<p>${esc(e[4])}</p>`:''}</div>`:''}</article>`).join(''):'<div class="empty-hint">没有找到匹配项，试试“指数”或“正弦”。</div>';
 all('[data-pair]').forEach(button=>button.addEventListener('click',async()=>{
  const e=group.entries[Number(button.dataset.pair)];
  const text=`% ${group.title}：${e[0]}\n% ${group.note}\n% ${e[4]}\n\\begin{gathered}\n${group.definition}\\\\\n${group.notation}\\\\\n${e[1]} \\xleftrightarrow{${group.symbol}} ${e[2]}${e[3]?'\\\\\n'+e[3]:''}\n\\end{gathered}`;
  try{await navigator.clipboard.writeText(text);toast('已复制变换对、约定与条件。');}
  catch{let area=button.closest('.pair-row').querySelector('textarea');if(!area){area=document.createElement('textarea');area.className='pair-copy-source';area.readOnly=true;area.setAttribute('aria-label','可手动复制的 LaTeX');button.closest('.pair-row').append(area);}area.value=text;area.focus();area.select();toast('请按 Ctrl+C 或 ⌘C 复制选中的 LaTeX。');}
 }));
}
all('[data-transform]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.transform;all('[data-transform]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));renderPairs();}));
q('#pair-search').addEventListener('input',renderPairs);renderPairs();

})();
