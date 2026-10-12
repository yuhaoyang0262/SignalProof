/* Reference pairs use angular-frequency Fourier, unilateral Laplace, bilateral Z. */
(function (root) {
  'use strict';
  const groups = {
    fourier: {
      title: '傅里叶变换', symbol: String.raw`\mathcal{F}`, input: '时域', output: '频域',
      definition: String.raw`X(\omega)=\int_{-\infty}^{\infty}x(t)e^{-j\omega t}\,\mathrm{d}t`,
      note: '角频率约定；含冲激的变换对在广义函数意义下成立。',
      notation: String.raw`j^2=-1,\quad \operatorname{sinc}(v)=\frac{\sin v}{v},\quad \operatorname{sinc}(0)=1`,
      entries: [
        ['单位冲激', String.raw`\delta(t)`, '1', '', ''],
        ['延迟冲激', String.raw`\delta(t-t_0)`, String.raw`e^{-j\omega t_0}`, String.raw`t_0\in\mathbb{R}`, ''],
        ['常数', '1', String.raw`2\pi\delta(\omega)`, '', '广义函数'],
        ['复指数', String.raw`e^{j\omega_0t}`, String.raw`2\pi\delta(\omega-\omega_0)`, String.raw`\omega_0\in\mathbb{R}`, '广义函数'],
        ['余弦', String.raw`\cos(\omega_0t)`, String.raw`\pi[\delta(\omega-\omega_0)+\delta(\omega+\omega_0)]`, String.raw`\omega_0>0`, '广义函数'],
        ['正弦', String.raw`\sin(\omega_0t)`, String.raw`\frac{\pi}{j}[\delta(\omega-\omega_0)-\delta(\omega+\omega_0)]`, String.raw`\omega_0>0`, '广义函数'],
        ['因果衰减指数', String.raw`e^{-at}u(t)`, String.raw`\frac{1}{a+j\omega}`, 'a>0', ''],
        ['双边衰减指数', String.raw`e^{-a|t|}`, String.raw`\frac{2a}{a^2+\omega^2}`, 'a>0', ''],
        ['矩形脉冲', String.raw`\operatorname{rect}\!\left(\frac{t}{T}\right)`, String.raw`T\operatorname{sinc}\!\left(\frac{\omega T}{2}\right)`, 'T>0', 'rect(v)：|v| < 1/2 时为 1，|v| > 1/2 时为 0。'],
        ['三角脉冲', String.raw`\max\!\left(1-\frac{|t|}{T},0\right)`, String.raw`T\operatorname{sinc}^{2}\!\left(\frac{\omega T}{2}\right)`, 'T>0', ''],
        ['高斯信号', String.raw`e^{-at^2}`, String.raw`\sqrt{\frac{\pi}{a}}\,e^{-\omega^2/(4a)}`, 'a>0', ''],
        ['单位阶跃', 'u(t)', String.raw`\pi\delta(\omega)+\operatorname{PV}\frac{1}{j\omega}`, '', 'PV 为柯西主值；必须保留冲激项。']
      ]
    },
    laplace: {
      title: '拉普拉斯变换', symbol: String.raw`\mathcal{L}_{0^-}`, input: '时域', output: '复频域',
      definition: String.raw`X(s)=\int_{0^-}^{\infty}x(t)e^{-st}\,\mathrm{d}t`,
      note: '单边变换从 0⁻ 起算，完整计入原点冲激。下列信号均为因果信号。',
      notation: String.raw`u(t):\text{单位阶跃},\quad a>0,\quad \omega_0>0`,
      entries: [
        ['单位冲激', String.raw`\delta(t)`, '1', String.raw`s\in\mathbb{C}`, ''],
        ['延迟冲激', String.raw`\delta(t-t_0)`, String.raw`e^{-st_0}`, String.raw`s\in\mathbb{C},\quad t_0\geq0`, ''],
        ['单位阶跃', 'u(t)', String.raw`\frac{1}{s}`, String.raw`\operatorname{Re}s>0`, ''],
        ['斜坡', 'tu(t)', String.raw`\frac{1}{s^2}`, String.raw`\operatorname{Re}s>0`, ''],
        ['幂函数', 't^m u(t)', String.raw`\frac{m!}{s^{m+1}}`, String.raw`\operatorname{Re}s>0,\quad m\in\mathbb{Z}_{\geq0}`, ''],
        ['衰减指数', String.raw`e^{-at}u(t)`, String.raw`\frac{1}{s+a}`, String.raw`\operatorname{Re}s>-a`, ''],
        ['指数加权斜坡', String.raw`te^{-at}u(t)`, String.raw`\frac{1}{(s+a)^2}`, String.raw`\operatorname{Re}s>-a`, ''],
        ['正弦', String.raw`\sin(\omega_0t)u(t)`, String.raw`\frac{\omega_0}{s^2+\omega_0^2}`, String.raw`\operatorname{Re}s>0`, ''],
        ['余弦', String.raw`\cos(\omega_0t)u(t)`, String.raw`\frac{s}{s^2+\omega_0^2}`, String.raw`\operatorname{Re}s>0`, ''],
        ['衰减正弦', String.raw`e^{-at}\sin(\omega_0t)u(t)`, String.raw`\frac{\omega_0}{(s+a)^2+\omega_0^2}`, String.raw`\operatorname{Re}s>-a`, ''],
        ['衰减余弦', String.raw`e^{-at}\cos(\omega_0t)u(t)`, String.raw`\frac{s+a}{(s+a)^2+\omega_0^2}`, String.raw`\operatorname{Re}s>-a`, ''],
        ['延迟阶跃', 'u(t-t_0)', String.raw`\frac{e^{-st_0}}{s}`, String.raw`\operatorname{Re}s>0,\quad t_0\geq0`, '']
      ]
    },
    z: {
      title: 'Z 变换', symbol: String.raw`\mathcal{Z}`, input: '序列', output: 'Z 域',
      definition: String.raw`X(z)=\sum_{n=-\infty}^{\infty}x[n]z^{-n}`,
      note: '双边 Z 变换；同一个代数式可以对应不同序列，需同时查看收敛域。ROC 以下按有限复平面列出。',
      notation: String.raw`u[0]=1,\quad a\in\mathbb{C}\setminus\{0\},\quad 0<\theta<\pi,\quad r>0`,
      entries: [
        ['单位冲激', String.raw`\delta[n]`, '1', String.raw`z\in\mathbb{C}`, ''],
        ['延迟冲激', String.raw`\delta[n-k]`, 'z^{-k}', String.raw`z\ne0,\quad k\in\mathbb{Z}_{>0}`, ''],
        ['单位阶跃', 'u[n]', String.raw`\frac{z}{z-1}`, '|z|>1', '右边序列'],
        ['左边阶跃', '-u[-n-1]', String.raw`\frac{z}{z-1}`, '|z|<1', '同一代数式，不同收敛域'],
        ['右边指数', 'a^n u[n]', String.raw`\frac{z}{z-a}`, '|z|>|a|', '右边序列'],
        ['左边指数', '-a^n u[-n-1]', String.raw`\frac{z}{z-a}`, '|z|<|a|', '同一代数式，不同收敛域'],
        ['斜坡序列', 'n u[n]', String.raw`\frac{z}{(z-1)^2}`, '|z|>1', ''],
        ['指数加权斜坡', 'n a^n u[n]', String.raw`\frac{az}{(z-a)^2}`, '|z|>|a|', ''],
        ['正弦序列', String.raw`\sin(\theta n)u[n]`, String.raw`\frac{z\sin\theta}{z^2-2z\cos\theta+1}`, '|z|>1', ''],
        ['余弦序列', String.raw`\cos(\theta n)u[n]`, String.raw`\frac{z(z-\cos\theta)}{z^2-2z\cos\theta+1}`, '|z|>1', ''],
        ['指数加权正弦', String.raw`r^n\sin(\theta n)u[n]`, String.raw`\frac{rz\sin\theta}{z^2-2rz\cos\theta+r^2}`, '|z|>r', ''],
        ['指数加权余弦', String.raw`r^n\cos(\theta n)u[n]`, String.raw`\frac{z(z-r\cos\theta)}{z^2-2rz\cos\theta+r^2}`, '|z|>r', '']
      ]
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = groups;
  else root.TransformLibrary = groups;
})(typeof window === 'undefined' ? globalThis : window);
