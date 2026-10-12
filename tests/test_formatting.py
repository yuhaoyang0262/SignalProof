"""Readable convolution notation, preserving grouping and bound variables."""
import unittest
from engine.formatting import format_steps


class ConvolutionNotationTests(unittest.TestCase):
    def render(self, source):
        row = format_steps([source])['lines'][0]
        self.assertEqual(row['error'], '')
        return row['latex']

    def test_shifted_operands_keep_time_arguments(self):
        tex = self.render('Conv(2*x(t),delta(t-2),t)')
        self.assertIn(r'x\left(t\right)', tex)
        self.assertIn(r'\delta\left(t - 2\right)', tex)
        self.assertNotIn(r'\cdot', tex)
        self.assertNotIn(r'\right]\left(t\right)', tex)

    def test_derivatives_keep_the_operand_argument(self):
        for source in ('D(Conv(x(t),h(t),t),t)',
                       'Conv(D(x(t),t),h(t),t)'):
            tex = self.render(source)
            self.assertIn(r'x\left(t\right)', tex)
            self.assertIn(r'h\left(t\right)', tex)
            self.assertIn(r'\mathrm{d}t', tex)
            self.assertNotIn(r'\right]\left(t\right)', tex)

    def test_nesting_and_addition_keep_grouping(self):
        nested = self.render('Conv(Conv(x(t),h(t),t),g(t),t)')
        self.assertEqual(nested.count(r'\ast'), 2)
        self.assertIn(r'\right]\ast g\left(t\right)', nested)
        added = self.render('Conv(x(t)+h(t),g(t),t)')
        self.assertIn(r'\right)\ast', added)

    def test_discrete_and_integral_variables_stay_consistent(self):
        discrete = self.render('Conv(x(n),h(n),n)')
        self.assertIn(r'x\left[n\right]', discrete)
        self.assertIn(r'h\left[n\right]', discrete)
        integral = self.render('Int0(Conv(x(t),h(t),t),t)')
        self.assertIn(r'x\left(\tau\right)', integral)
        self.assertIn(r'h\left(\tau\right)', integral)
        self.assertIn(r'\mathrm{d}\tau', integral)


class FormulaScopeTests(unittest.TestCase):
    def render(self, source):
        row = format_steps([source])['lines'][0]
        self.assertEqual(row['error'], '')
        return row['latex']

    def test_transform_arguments_stay_inside_braces(self):
        for source, trailing in [('LT(x(t),t,s)', r'\right\}\!\left(s\right)'),
                                 ('ZT(x(n),n,z)', r'\right\}\!\left(z\right)')]:
            self.assertNotIn(trailing, self.render(source))

    def test_unary_minus_is_a_sign_not_a_factor(self):
        tex = self.render('-X(-w/2)/2')
        self.assertNotIn(r'\left(-1\right)', tex)
        self.assertTrue(tex.startswith('- '))
        self.assertIn(r'X\left(- \frac{\omega}{2}\right)', tex)

    def test_compound_derivative_has_explicit_scope(self):
        tex = self.render('D(x(t)*h(t),t)')
        self.assertIn(r'\frac{\mathrm{d}}{\mathrm{d}t}\left[', tex)
        self.assertIn(r'x\left(t\right) h\left(t\right)', tex)

    def test_display_does_not_cancel_original_denominators(self):
        tex = self.render('x(t)/x(t)')
        self.assertIn(r'\frac{x\left(t\right)}{x\left(t\right)}', tex)
        self.assertNotEqual(tex, '1')

    def test_reciprocal_powers_render_without_recursion(self):
        for source in ('1/s', '1/(s+1)^2', 'x(n-1/2)', '(1/2)^n*u(n)'):
            self.assertTrue(self.render(source))


if __name__ == '__main__':
    unittest.main()
