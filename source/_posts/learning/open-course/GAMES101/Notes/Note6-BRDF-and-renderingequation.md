---
title: Note 6 BRDF and Rendering Eequation
toc: true
date: 2025-10-10 21:45:28
tags:
categories:
  - 公开课
  - GAMES101
  - Notes
---

我们之前已经学过了 Blinn-Phong 光照模型，但它只是一个启发式模型，在物理上是不正确的。接下来我们看看物理上正确的光照是怎样的，以及如何用计算机近似求解接近正确的光照。

# 辐射度量学

在了解光照的物理模型之前，我们先来看看一些物理量。最关键的物理量有四个，分别是

1. Radiant flux/power $\Phi$，单位 $W$.
2. Radiant intensity $I$，单位 $\frac{W}{\text{sr}}$.
3. Irradiance $E$，单位 $\frac{W}{m^2}$.
4. Radiance $L$，单位 $\frac{W}{\text{sr}\cdot m^2}$.

接下来让我们看看它们的具体定义。

## Radiant flux/power $\Phi$

Radiant flux/power 符号 $\Phi$，单位 $W$.

定义为

$$
\Phi = \frac{dQ}{dt}
$$

## Radiant intensity $I$

Radiant Intensity 符号 $I$，单位 $\frac{W}{\text{sr}}$，表示某个定点接收/穿过/发出的，在指定方向 $\vec{\omega}$ 上的，单位立体角的 Power.

定义为

$$
I(\vec{\omega})=\frac{d\Phi}{d\omega}
$$

这里的符号略显混乱。左边的参数 $\vec{\omega}$ 是一个方向向量，右边的 $d\omega$ 则是这个方向上立体角的微分。

我们知道方向向量 $\vec{\omega}$ 也能在球坐标下被表示为 $(\theta,\varphi)$。对给定的 $(\theta,\varphi)$，我们可以算出其在球面上的面积微分，也能进一步求出立体角微分 $d\omega$，如下所示

$$
\begin{align*}
&dA=r^2 \sin \theta \space d\theta \space d\varphi
\\
&d\omega=\frac{dA}{r^2}=\sin \theta \space d\theta \space d\varphi
\end{align*}
$$

下图是对  Solid angle 和 Radiant Intensity 两个概念的图解

![](/images/learning/open-course/GAMES101/Notes/note6/solid_angle_and_intensity.png)

## Irradiance $E$

Irradiance 符号 $E$，单位 $\frac{W}{m^2}$.

表示点 $x$ 周围单位面积接收/穿过/发出的 Power，定义为

$$
E(x)=\frac{d\Phi}{dA}
$$

下图计算并对比了平行光穿过两个不同截面时的 irradiance：垂直截面 $A$，以及与垂直方向成 $\theta$ 角的倾斜截面 $A'$。

其中 $\Phi=\Phi'$ 是因为能量守恒，光束穿过任何一个完整截面的功率是固定的。

![](/images/learning/open-course/GAMES101/Notes/note6/irradiance.png)

## Radiance $L$

Radiance $L$ 的单位是 $\frac{W}{\text{sr}\cdot \space m^2}$，表示表面某点 $x$ 周围单位投影面积接收/穿过/发出的，在指定方向 $\vec{w}$ 上的，单位立体角的 radiant flux.

定义为

$$
L(x,\vec{\omega})=\frac{d^2\Phi}{d\omega ds}=\frac{d^2\Phi}{d\omega ds_{0}\cos\theta}
$$

这里的 $ds$ 是投影前面积，$ds_0 \cos\theta$ 是投影面积。

下图是对 Irradiance 和 Radiance的图解

![](/images/learning/open-course/GAMES101/Notes/note6/irradiance_and_radiance.png)

# BRDF和材质

现在我们可以看看光照的物理模型了，其中最关键的是 BRDF，即双向反射分布函数。它定义了从方向 $\vec{\omega_i}$ 射入的光线打到某个表面上反射到 $\vec{\omega_r}$ 方向的强度：

$$
f_r(p,\vec{\omega_i}, \vec{\omega_r}) = \frac{dL_r(p,\vec{\omega_r})}{dE_i(p,\vec{\omega_i})}
$$

你可能会疑惑为什么之前我们说 $E$ 是关于 $x$ 的函数，现在却除了坐标 $p$ 外还多了一个方向参数 $\omega_i$，这是因为 BRDF 里的 $E$ 是微分。具体可以看看下面这个式子：

$$
E(x) = \int_{\Omega} L_i(x,\vec{\omega_i}) \cos\theta_i d\omega_i
\\
dE_i(x, \vec{\omega_i}) = L_i(x, \vec{\omega_i}) \cos\theta_i d\omega_i

$$

你可能还会疑惑，为什么分母用 $E$ 呢？和分母一样统一用 $L$ 不是更优雅吗？

据 https://www.zhihu.com/question/28476602/answer/41003204 这个答案所说，测量出射的 Radiance $L$ 很方便，但测量入射的 Irradiance $L$ 很困难，而测量入射的 $dE$ 挺方便，因此我们就使用了 $\frac{dL}{dE}$.

我们把上面的 $dE_i(x,\vec{\omega_i})$ 代入 BRDF，就得到了

$$
f_r(p,\vec{\omega_i}, \vec{\omega_r}) = \frac{dL_r(p,\vec{\omega_r})}{L_i(x,\vec{w_i})\cos\theta_i dw_i}
$$

物体的材质就用 BSDF（反射的BRDF+折射的BTDF）表示。我们这里只聊 BRDF，因为 BTDF 和 BRDF 接近。BRDF 的获取包括但不限于这两种方式：

1. 现实测量。我们可以找到许多包含大量 BRDF 测量数据的数据集，比如 MERL 数据集。
2. 微表面模型。用粗糙度、金属度等参数来构建启发式的 BRDF 函数。

还值得一提的是，由 Helmholtz Reciprocity Principle，有

$$
f_r(p,\vec{\omega_i}, \vec{\omega_o}) = f_r(p,\vec{\omega_o}, \vec{\omega_i})
$$

也就是说交换入射出射方向，BRDF 函数 $f_r$ 不变。

# 渲染方程

现在我们先看看反射方程，再看看渲染方程。

反射方程是通过 BRDF 求出 $L_r$ 的方程，对 BRDF 的公式积分一下就行：

$$
L_r(p, \vec{\omega_r}) = \int_{\Omega} f_r(p, \vec{\omega_i}, \vec{\omega_r}) L_i(p, \vec{\omega_i}) (\vec{\omega_i} \cdot \vec{n}) d\omega_i

$$

其中 $\vec{n}$ 是点 $p$ 处的法线方向，$\vec{\omega_i} \cdot \vec{n}$ 是 BRDF 定义里的 $\cos\theta_i$.

而渲染方程，不考虑折射，只是比反射方程多了一个自发光项：

$$
L_o(p, \vec{\omega_o}) = L_e(p, \vec{\omega_o}) + \int_{\Omega} f_r(p, \vec{\omega_i}, \vec{\omega_o}) L_i(p, \vec{\omega_i}) (\vec{\omega_i} \cdot n) d\omega_i
$$

你可能会好奇右侧的 $L_i(p,\vec{\omega_i}
)$ 怎么求出来。由能量守恒，我们可以从 $p$ 出发顺着 $-\vec{\omega_i}$ 找到第一个交点 $q$，然后就有

$$
L_i(p,\vec{\omega_i})=L_o(q,-\vec{\omega_i})
$$

# 实际算法

由上可知，我们要求解下面的方程：

$$
L_o(p, \vec{\omega_o}) = L_e(p, \vec{\omega_o}) + \int_{\Omega} f_r(p, \vec{\omega_i}, \vec{\omega_o}) L_o(\text{raycast}(p, -\vec{\omega_i}), -\vec{\omega_i}) (\vec{\omega_i} \cdot n) d\vec{\omega_i}
$$

这是一个积分，还是一个递归，我们先用蒙特卡罗算法近似积分，得到

$$
L_o(p, \vec{\omega_o}) \approx L_e(p, \vec{\omega_o}) + 
\frac{1}{N}\sum_{k=1}^{N}\frac{f_r(p, \vec{\omega_i}^{(k)}, \vec{\omega_o}) L_o(\text{raycast}(p, -\vec{\omega_i}^{(k)}), -\vec{\omega_i}^{(k)}) (\vec{\omega_i} ^{(k)}\cdot n) }
{p(\vec{\omega_i}^{(k)})}
$$

其中 $\vec{\omega_i}^{(k)}$ 是随机采样的方向向量，$p(\vec{\omega_i}^{(k)})$ 是采样到它的概率。

有了这个求和，我们就可以开始递归了，大致算法如下：

1. 从 $p$ 射出朝随机方向 $\vec{\omega_i}
^{(k)}$ 的射线，打到 $q^{(k)}$.
2. 计算 $L_o(q,-w_i^{(k)})$，然后代入式子，求得 $L_o(p,\vec{\omega_o})$。

等等，这不是无限递归吗？确实如此。所以我们会假设如果射线打到了光源就只返回自发光项 $L_e$.

但这不还是很复杂吗，假设我们对每个点发射 $10$ 条射线，弹射以后就要发射 $10^2$ 个，再弹射就要 $10^3$ 个！

没错，所以我们只对每个点发出 $1$ 条射线并计算其弹射后的完整路径，然后对每个点追踪多条路径并取平均。虽然这不完全符合上面的公式，但很有效。

让我们来看看新的算法吧：

1. 如果点 $p$ 是光源，直接返回其自发光项。
2. 随机采样一个方向 $w_i$，从 $p$ 发出一条朝向 $w_i$ 的射线，打到点 $q$.
3. 计算点 $q$ 的 $L_o(q,-w_i)$，代入公式，求得 $L_o(p,w_o)$.
4. 对求得的多个 $L_o(p,w_o)$ 取平均。

这个算法当然可以进一步优化，比如说上面还是有潜在的无限弹射风险，所以要用俄罗斯轮盘赌来在每次弹射时都有随机概率停止弹射（这被称作RR）；又比如上面打到光源的概率太低，所以可以从光源采样射线（这被称作NEE）。不过这些东西就留到作业 7 的解析里再说吧。

# 参考资料

Stanford CS348B, Spring 2022：https://gfxcourses.stanford.edu/cs348b/spring22

多伦多大学图形学讲义：https://www.dgp.toronto.edu/public_user/elf/2522/light.pdf

Introduction to Radiometry and Photometry

UE4 的 BRDF 实现：https://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf