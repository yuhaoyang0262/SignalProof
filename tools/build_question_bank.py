"""Build display-only bank from frozen authored cases, never infer labels from answers."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.service import format_steps
from engine.formatting import signal_latex
from engine.syntax import parse

def build():
    baseline=json.loads((ROOT/'data/tests.json').read_text(encoding='utf-8-sig'))
    additional=json.loads((ROOT/'data/practice.json').read_text())['cases']
    oracles={x['id']:x for x in json.loads((ROOT/'data/step-oracles.json').read_text())['cases']}
    by_id={x['id']:x for x in baseline}
    output=[]
    for i,raw in enumerate(baseline+additional):
        c=dict(raw);c['number']=i+1;c['source']='baseline' if i<100 else 'concrete'
        c['title']=c['title'].replace(' · 正确','').replace(' · 错误','').replace('四行推导末步代数错误','四步代数化简').replace('两级冲激移位与错误传播','两级冲激移位')
        c.setdefault('difficulty','进阶' if len(c['steps'])>2 else '基础')
        c.setdefault('tags',['性质与推导'])
        solution=c.get('solutionSteps') or by_id[c['id'].replace('-ERR','-OK')]['steps']
        c['formatted']=format_steps(c['steps'])['lines'];c['solution']=format_steps(solution)['lines']
        c['given']=[]
        for key,value in c['context'].get('definitions',{}).items():c['given'].append(signal_latex(parse(key)[0])+'='+signal_latex(parse(value)[0]))
        for key,value in c['context'].get('initial',{}).items():c['given'].append(signal_latex(parse(key)[0])+'='+signal_latex(parse(str(value))[0]))
        for key in c['context'].get('positive',[]):c['given'].append(signal_latex(parse(key)[0])+'>0')
        for key in c['context'].get('nonzero',[]):c['given'].append(signal_latex(parse(key)[0])+r'\ne0')
        if i<100:c['expectedLocalStatuses']=oracles[c['id']]['expectedLocalStatuses']
        for row in c['formatted']+c['solution']:
            if row.get('error'):raise ValueError((c['id'],row['error']))
        output.append(c)
    return {'schemaVersion':1,'sourceHashes':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['data/tests.json','data/practice.json']},'cases':output}
if __name__=='__main__':
    result=build();(ROOT/'data/question-bank.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(len(result['cases']),'questions rendered')
