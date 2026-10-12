const fs=require('fs');const k=require(process.cwd()+'/katex/katex.min.js');const groups=require(process.cwd()+'/transform-library.js');const bank=JSON.parse(fs.readFileSync('data/question-bank.json'));let count=0;
function check(tex){if(!tex)return;k.renderToString(tex,{throwOnError:true,strict:'error',trust:false});count++;}
for(const c of bank.cases){for(const row of [...c.formatted,...c.solution]){check(row.latex);check(row.rocLatex);}for(const tex of c.given)check(tex);}
for(const g of Object.values(groups)){check(g.definition);check(g.notation);for(const e of g.entries){check(e[1]);check(e[2]);check(e[3]);}}
for(const t of Object.values(JSON.parse(fs.readFileSync('data/rule-latex.json'))))check(t);
console.log(JSON.stringify({strictLatexChecks:count,questionCount:bank.cases.length,ruleCount:51}));
