---
title: Note 5 RayTracing
toc: true
date: 2025-09-25 21:48:28
tags:
categories:
  - 公开课
  - GAMES101
  - Notes
---

渲染可以分为两个大类：object-order rendering 和 Image-order rendering. 前者以场景中的物体（通常是如三角形）为基本单位进行迭代，遍历场景中的每一个物体，然后确定该物体会影响屏幕上的哪些像素；后者以屏幕上的像素为基本单位进行迭代，遍历输出图像中的每一个像素，然后对于每个像素，它会找出场景中的哪个物体或物体的哪个部分决定了该像素的颜色。

我们之前学的光栅化是前者，而我们接下来要介绍的光线追踪就是后者。

# 光线追踪

## 基本思想

光线追踪的思想基于光路可逆——既然光路可逆，那么打到摄像机里的光就可以看作从摄像机发出的射线，我们只要打出射线然后计算射线打到的点的颜色就好了。

其实基本思路真的就是这么简单！如下图所示，我们从眼睛里发出经过每个像素的射线，然后射线打到物体上就得到了物体的基本颜色。而射线还会反射、折射，我们计算反射、折射后的射线打到的颜色，再加到基本颜色上，就得到了这个像素的颜色。

![](/images/learning/open-course/GAMES101/Notes/note5/ray_tracing.png)

光线追踪也自然地生成了阴影——如果射线打中的点和光源的连线间有物体遮挡，这点就是阴影，否则就不是阴影。

## 碰撞检测

既然如此，我们只要检测射线和三角形的碰撞就好了。我们可以用下面的 Möller Trumbore Algorithm 来做检测，其思路是解 “直线上的点 = 三角形重心坐标表示” 这个方程：

考虑射线 $\vec{O} + t\vec{D}$ 和三角形 $P_0, P_1, P_2$，我们要解方程

$$
\vec{O} + t\vec{D} = (1-b_1-b_2)\vec{P_0} + b_1\vec{P_1} + b_2\vec{P_2}
$$

这是一个线性方程组，解为

$$
\begin{bmatrix} t \\ b_1 \\ b_2 \end{bmatrix} = \frac{1}{\vec{S_1} \cdot \vec{E_1}} \begin{bmatrix} \vec{S_2} \cdot \vec{E_2} \\ \vec{S_1} \cdot \vec{S} \\ \vec{S_2} \cdot \vec{D} \end{bmatrix}
$$

其中

$$
\begin{aligned}
\vec{E_1} &= \vec{P_1} - \vec{P_0} \\
\vec{E_2} &= \vec{P_2} - \vec{P_0} \\
\vec{S} &= \vec{O} - \vec{P_0} \\
\vec{S_1} &= \vec{D} \times \vec{E_2} \\
\vec{S_2} &= \vec{S} \times \vec{E_1}
\end{aligned}
$$

# 性能优化

在做射线和三角形的碰撞检测时，简单地遍历场景里的每个三角形显然太慢了，所以我们用包围盒来优化。如果一个射线没有碰到包围盒，自然就不会碰到盒子里的物体；如果碰到了，再和盒子里的物体做碰撞检测。

## 常见包围盒

包围盒有两种思路，一种是基于空间的划分，另一种是基于物体的划分。前者的代表包括四叉树、八叉树；后者的代表是 BVH.

四叉树、八叉树把空间进行平分，当一个区域里还剩较多物体时就再在这个区域里平分一次。

![](/images/learning/open-course/GAMES101/Notes/note5/octree.png)

BVH 为每组物体建立包围盒，然后再把父包围盒划分成子包围盒。

![](/images/learning/open-course/GAMES101/Notes/note5/bvh.png)

## 射线和包围盒的碰撞检测

包围盒有六个面，我们可以把相对的面划分成一组从而得到三组面。计算射线 $\vec{O} + t\vec{D}$ 与这三组面的交点后，我们会得到 $[t_{x, \text{enter}}, t_{x, \text{exit}}],[t_{y, \text{enter}}, t_{y, \text{exit}}],[t_{z, \text{enter}}, t_{z, \text{exit}}]$，之后计算下面的交集：

$$
[t_\text{raymin},t_\text{raymax}]\cap[t_{x, \text{enter}}, t_{x, \text{exit}}]\cap[t_{y, \text{enter}}, t_{y, \text{exit}}]\cap[t_{z, \text{enter}}, t_{z, \text{exit}}]
$$

如果交集为空则无交点，否则有交点。

为了方便计算，包围盒一般是与坐标轴平行的。