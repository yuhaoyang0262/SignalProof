"""Independent checks for concrete transform pairs, step/impulse evidence and bank labels."""
import json,hashlib,unittest
from pathlib import Path
import sympy as S
from engine.service import verify
from engine.diagnostics import impulse_counterexample, sample_counterexample
from engine.syntax import parse,t,w,n,s,z
ROOT=Path(__file__).resolve().parents[1]
class SimpleFunctionTests(unittest.TestCase):
    def test_sine_sign_cosine_sum_and_angular_frequency_normalization(self):
        pairs=[('FT(sin(2*t),t,w)','pi/I*(delta(w-2)-delta(w+2))'),('FT(cos(3*t),t,w)','pi*(delta(w-3)+delta(w+3))'),('FT(1,t,w)','2*pi*delta(w)')]
        for a,b in pairs:
            with self.subTest(a=a):self.assertEqual(verify([a,b])['status'],'correct')
        self.assertEqual(verify(['FT(sin(2*t),t,w)','pi/I*(delta(w+2)-delta(w-2))'])['status'],'wrong')
    def test_laplace_pairs_against_direct_integrals(self):
        for frequency in (1,2,3):
            for wave,numerator in ((S.sin,frequency),(S.cos,s)):
                # An independent Laplace integral at Re(s)>0.
                expected=S.integrate(wave(frequency*t)*S.exp(-3*t),(t,0,S.oo))
                self.assertEqual(S.simplify(expected-(numerator/(s*s+frequency**2)).subs(s,3)),0)
                before=f'LT({wave.__name__}({frequency}*t)*u(t),t,s)'
                after=f'{frequency if wave==S.sin else "s"}/(s^2+{frequency**2}); ROC: re(s)>0'
                self.assertEqual(verify([before,after])['status'],'correct')
    def test_z_pairs_against_summed_sequences(self):
        for theta in (S.pi/2,S.pi/3):
            for wave in (S.sin,S.cos):
                theta_input='pi/2' if theta==S.pi/2 else 'pi/3'
                denominator=z*z-2*z*S.cos(theta)+1
                expression=z*S.sin(theta)/denominator if wave==S.sin else z*(z-S.cos(theta))/denominator
                numeric=sum(wave(theta*k)/S.Integer(2)**k for k in range(70))
                self.assertLess(abs(float(S.N(numeric-expression.subs(z,2)))),1e-15)
                before=f'ZT({wave.__name__}(({theta_input})*n)*u(n),n,z)'
                after=str(expression).replace('**','^')+'; ROC: abs(z)>1'
                self.assertEqual(verify([before,after])['status'],'correct')
    def test_unilateral_impulse_does_not_include_negative_time(self):
        for signal,result in [('delta(t)','1'),('delta(t-2)','exp(-2*s)'),('delta(t+1)','0')]:
            self.assertEqual(verify([f'LT({signal},t,s)',result])['status'],'correct')
    def test_nested_constant_product_and_left_sided_sign(self):
        for pair in [('LT(4*exp(-t)*u(t),t,s)','4/(s+1); ROC: re(s)>-1'),('LT(3*sin(t)*u(t),t,s)','3/(s^2+1); ROC: re(s)>0'),('ZT(-(1/3)^n*u(-n-1),n,z)','z/(z-1/3); ROC: abs(z)<1/3'),('ZT((1/3)^n*u(-n-1),n,z)','-z/(z-1/3); ROC: abs(z)<1/3')]:
            self.assertEqual(verify(list(pair))['status'],'correct')
    def test_impulses_use_test_functions_and_reject_unsupported_products(self):
        a=parse('delta(w-2)')[0];b=parse('delta(w+2)')[0]
        evidence=impulse_counterexample(a,b,{})
        self.assertEqual(evidence[0]['kind'],'distribution')
        self.assertFalse(sample_counterexample(a,b,{}))
        self.assertFalse(impulse_counterexample(parse('delta(w+2)')[0],S.Integer(0),{'positive':['w']}))
        self.assertFalse(impulse_counterexample(parse('delta(w)')[0],S.Integer(0),{'nonzero':['w']}))
        self.assertFalse(impulse_counterexample(parse('delta(w)^2')[0],a,{}))
        self.assertFalse(impulse_counterexample(parse('delta(n)')[0],parse('delta(n-1)')[0],{}))
    def test_no_false_extension_to_chirps_or_ungated_z_sinusoids(self):
        for steps in [('FT(sin(t^2),t,w)','pi/I*(delta(w-1)-delta(w+1))'),('ZT(sin(pi*n/2),n,z)','z/(z^2+1); ROC: abs(z)>1')]:
            self.assertNotEqual(verify(list(steps))['status'],'correct')
    def test_concrete_bank_matches_authored_labels_and_has_no_duplicate_chains(self):
        rows=json.loads((ROOT/'data/practice.json').read_text(encoding='utf-8'))['cases']
        self.assertEqual(len(rows),100)
        self.assertEqual(sum(c['expected']=='correct' for c in rows),50)
        self.assertEqual(len({tuple(c['steps']) for c in rows}),100)
        for c in rows:
            with self.subTest(id=c['id']):
                r=verify(c['steps'],c['context'])
                self.assertEqual(r['status'],c['expected'])
                self.assertEqual(r['firstError'],c['expectedFirstError'])
                self.assertEqual([v['localStatus'] for v in r['steps']],c['expectedLocalStatuses'])
    def test_question_bank_matches_canonical_inputs(self):
        bank=json.loads((ROOT/'data/question-bank.json').read_text(encoding='utf-8'))
        self.assertEqual(len(bank['cases']),200)
        self.assertEqual(len({(tuple(c['steps']),json.dumps(c['context'],sort_keys=True)) for c in bank['cases']}),200)
        for file,digest in bank['sourceHashes'].items():self.assertEqual(hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),digest)
        for c in bank['cases']:
            self.assertEqual(len(c['formatted']),len(c['steps']))
            self.assertTrue(all(not row.get('error') for row in c['formatted']+c['solution']))
