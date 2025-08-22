---
title: Note 1 Transformation
toc: true
date: 2025-08-19 15:10:28
tags:
categories:
  - 公开课
  - GAMES101
  - Notes
---

# 2D Transformation

在二维空间中，我们能用二维矩阵表示所有的线性变换。但二维空间中的平移在二维空间中不是线性变换，因此我们希望找到另一个空间，并将二维空间嵌入，让二维平移在这个空间中变为线性变换。把笛卡尔坐标扩展为齐次坐标，就得到了这样的空间。

对二维空间的一点 $(x,y)$，三元组 $(xZ,yZ,Z)$ 即为该点的齐次坐标。如 $(1,2)$ 可表示为 $(1,2,1)$ 或 $(100,200,100)$. 换句话说，二维空间的任何点都能表示为齐次坐标 $(X,Y,Z)$，其中 $Z\neq 0$.

另外，如果我们把无穷远点也考虑进来，我们就可以用 $(x,y,0)$ 表示无穷远点。

叽里咕噜说什么呢，快告诉我怎么用线性变换表示平移！

对二维空间的一点 $(x,y)$，首先将它转化为齐次坐标得到 $(x,y,1)$，然后与下面的矩阵相乘

$$
M = \begin{bmatrix}
1 & 0 & t_x \\
0 & 1 & t_y \\
0 & 0 & 1
\end{bmatrix}
$$

就得到了 $(x+t_x,y+t_y,1)$. 然后再转换回笛卡尔坐标，就得到了 $(x+t_x,y+t_y)$.

这样一来，旋转、平移就能统一成下面的形式：

$$
M = \begin{bmatrix}
\cos \theta & -\sin \theta & t_x \\
\sin \theta & \cos \theta & t_y \\
0 & 0 & 1
\end{bmatrix}
$$

# 3D Transformation

与二维的情况类似，我们也把三维空间嵌入一个新空间。

对三维空间的一点 $(x,y,z)$，三元组 $(xS,yS,zS,S)$ 即为该点的齐次坐标。如 $(1,2,3)$ 可表示为 $(1,2,3,1)$ 或 $(100,200,300,100)$. 换句话说，三维空间的任何点都能表示为齐次坐标 $(X,Y,Z,S)$，其中 $S\neq 0$.

我们这里讨论右手坐标系，下面给出按右手定则旋转 $\theta$ 角度的矩阵：

$$
R_x(\theta) = \begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & \cos \theta & -\sin \theta & 0 \\ 0 & \sin \theta & \cos \theta & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}
$$

$$
R_y(\theta) = \begin{bmatrix} \cos \theta & 0 & \sin \theta & 0 \\ 0 & 1 & 0 & 0 \\ -\sin \theta & 0 & \cos \theta & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}
$$

$$
R_z(\theta) = \begin{bmatrix} \cos \theta & -\sin \theta & 0 & 0 \\ \sin \theta & \cos \theta & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}
$$

你会注意到沿 $y$ 轴旋转的矩阵和别的不一样，但这是完全正确的，认真算一算就好了。

（我没感觉这里有什么“深刻含义”，但感觉即使有也应该不会很有用……）

（不过不知道如果推广到 $n$ 维旋转会不会有用）

（可我们生活在三次元！）

值得注意的是，**旋转矩阵都是正交矩阵**，所以它的转置就是它的逆。

世界上还存在一个叫做 **Rodrigues 旋转公式**的东西，它给出了向量 $v$ 绕单位向量 $k$ 旋转 $\theta$ 角度得到的结果。（按右手定则旋转）

$$
\mathbf{v}_{\text{rot}} = \mathbf{v} \cos\theta + (\mathbf{k} \times \mathbf{v}) \sin\theta + 
\\
\mathbf{k}(\mathbf{k} \cdot \mathbf{v})(1 - \cos\theta)
$$

![](/images/learning/open-course/GAMES101/Notes/note1/rodrigues.png)

当然也可以把这个旋转矩阵写出来：

$$
\mathbf{R}(\mathbf{k}, \theta) = \cos(\theta)\mathbf{I} + (1 - \cos(\theta))\mathbf{k}\mathbf{k}^T + \sin(\theta)\begin{bmatrix} 0 & -k_z & k_y \\ k_z & 0 & -k_x \\ -k_y & k_x & 0 \end{bmatrix}
$$

最右边那个矩阵是 $k$ 的叉乘矩阵啦~

# Viewing transformation

2D 和 3D transformation 都是基础变换，接下来我们研究游戏里的画面是如何渲染到屏幕上的。

![](/images/learning/open-course/GAMES101/Notes/note1/map-seq.png)

如下图所示，我们有一个摄像机、两个方块，那么我们是怎么计算出摄像机拍摄的画面的呢（参考右下角）？

![](/images/learning/open-course/GAMES101/Notes/note1/godot-camera.png)


我们按照下面的流程进行操作：

## Camera transformation

首先，我们变换空间让摄像机位于坐标原点，且面向 $z$ 轴负方向，头顶朝 $y$ 轴正方向。对上图来说，就是把 $w$ 变换为 $z$ 轴，把 $v$ 变换为 $y$ 轴。

对应的矩阵是

$$
\text{M}_{\text{cam}} =
\begin{bmatrix}
u_x & u_y & u_z & 0 \\
v_x & v_y & v_z & 0 \\
w_x & w_y & w_z & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
\times
\begin{bmatrix}
1 & 0 & 0 & -\text{cam}_x \\
0 & 1 & 0 & -\text{cam}_y \\
0 & 0 & 1 & -\text{cam}_z \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

这里的小技巧是，旋转矩阵的逆是其转置，所以我们先算出 $xyz$ 轴变换到 $uvw$ 轴的旋转矩阵，再对其转置，就得到了把 $uvw$ 变换到 $xyz$ 的矩阵。

## Projection transformation

然后，我们把相机拍摄的区域变换到 $[-1,1]^3$ 中，这是一个规范化，为未来把区域放到屏幕上做准备。在此之前，我们要先确定相机能够拍摄的区域的范围。这里涉及到的变量主要有 fov、aspect ratio、near、far. 

下图能清晰地解释 fov 和 aspect ratio。fov 即 field of view，表示用角度衡量的可见范围；aspect ratio 则是显示区域的宽高比。

![](/images/learning/open-course/GAMES101/Notes/note1/fov-and-aspect-ratio.png)

near 和 far 则定义了剔除边界，我们只渲染满足 $z \in [\text{near}, \text{far}]$ 的东西。原点、近平面和原平面共同划分出了一块有限的空间，这就是摄像机拍摄的区域（视锥），我们会把他变换到 $[-1,1]^3$ 中。

![](/images/learning/open-course/GAMES101/Notes/note1/near-far.png)

变换分为两步，第一步是把视锥变换为长方体，第二步把长方体变换为 $[-1,1]^3$ 的正方体。

在第一步变换时，我们希望满足以下两点：

1. near 和 far 平面上的点的 $z$ 值不变
2. 近大远小，且缩放比例符合相似三角形的规律

结合齐次坐标，我们就能得到以下矩阵：

$$
\begin{align*}
\text{M}_\text{per}

&=

\begin{bmatrix}
\frac{2}{r-l} & 0 & 0 & -\frac{r+l}{r-l} \\
0 & \frac{2}{t-b} & 0 & -\frac{t+b}{t-b} \\
0 & 0 & \frac{2}{n-f} & -\frac{n+f}{n-f} \\
0 & 0 & 0 & 1
\end{bmatrix}
\times
\begin{bmatrix}
n & 0 & 0 & 0 \\
0 & n & 0 & 0 \\
0 & 0 & n+f & -nf \\
0 & 0 & 1 & 0
\end{bmatrix}
\\
&=

\begin{bmatrix}
\frac{2n}{r-l} & 0 & -\frac{r+l}{r-l} & 0 \\
0 & \frac{2n}{t-b} & -\frac{t+b}{t-b} & 0 \\
0 & 0 & \frac{n+f}{n-f} & -\frac{2nf}{n-f} \\
0 & 0 & 1 & 0
\end{bmatrix}
\end{align*}
$$

第一个等号右边的式子中，右边的矩阵把视锥压缩为一个长方体，左边的矩阵把这个长方体变换到 $[-1,1]^3$.

![](/images/learning/open-course/GAMES101/Notes/note1/rectangle.png)

我们可以根据 $\text{near},\text{fov},\text{aspectRatio
}$ 求出 $l,t,r,b$.

$$
\begin{align*}
&\text{t} = -n \times \tan\left(\frac{\text{fov}}{2}\right)
\\
&\text{b} = -\text{t}
\\
&\text{r} = \text{t} \times \text{aspectRatio}
\\
&\text{l} = -\text{r}

\end{align*}
$$

![](/images/learning/open-course/GAMES101/Notes/note1/fov-ltrb.png)

也就是说，我们可以把投影矩阵写为：

$$
\large
\text{M}_\text{per} =
\begin{bmatrix}
-\frac{1}{\text{aspect} \times \tan(\frac{\text{fov}}{2})} & 0 & 0 & 0 \\
0 & -\frac{1}{\tan(\frac{\text{fov}}{2})} & 0 & 0 \\
0 & 0 & \frac{n+f}{n-f} & -\frac{2nf}{n-f} \\
0 & 0 & 1 & 0
\end{bmatrix}
$$

## Viewport transformation

最后，我们会把 $[-1,1]^3$ 的内容的宽高映射为屏幕大小。在这个变换中 $z$ 坐标不变，因此变换矩阵为：

$$
\large
\text{M}_\text{viewport}=
\begin{bmatrix}
\frac{width}{2} & 0 & 0 & \frac{width}{2} \\
0 & \frac{height}{2} & 0 & \frac{height}{2} \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

## 总结

总而言之，我们的变换矩阵为

$$
\begin{align*}
&\text{M}=\text{M}_\text{viewport}\text{M}_\text{per}\text{M}_\text{cam}
\end{align*}
$$

其中

$$
\begin{align*}
&\text{M}_{\text{cam}} =
\begin{bmatrix}
u_x & u_y & u_z & 0 \\
v_x & v_y & v_z & 0 \\
w_x & w_y & w_z & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
\times
\begin{bmatrix}
1 & 0 & 0 & -\text{cam}_x \\
0 & 1 & 0 & -\text{cam}_y \\
0 & 0 & 1 & -\text{cam}_z \\
0 & 0 & 0 & 1
\end{bmatrix}
\\
\large
&\text{M}_\text{per} =
\begin{bmatrix}
-\frac{1}{\text{aspect} \times \tan(\frac{\text{fov}}{2})} & 0 & 0 & 0 \\
0 & -\frac{1}{\tan(\frac{\text{fov}}{2})} & 0 & 0 \\
0 & 0 & \frac{n+f}{n-f} & -\frac{2nf}{n-f} \\
0 & 0 & 1 & 0
\end{bmatrix}
\\
&\large
\text{M}_\text{viewport}=
\begin{bmatrix}
\frac{width}{2} & 0 & 0 & \frac{width}{2} \\
0 & \frac{height}{2} & 0 & \frac{height}{2} \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}

\end{align*}
$$

要注意的是，我们讨论的 $n$ 和 $f$ 被定义为坐标值，它们是小于 0 的。一些地方把 $n$ 和 $f$ 定义为到近/远平面的距离，这是大于 0 的，这会引起投影矩阵的变化。另外，不同的坐标系约定也会引起矩阵的变化。

比如在OpenGL中， $n$ 和 $f$ 被定义为到近/远平面的距离，这是大于 0 的，而且他们的 projection transformation 把拍摄内容从右手坐标系的视图空间映射到左手坐标系的标准设备坐标（NDC）空间。特别地，$z$ 轴的 $[ -n,-f]$ 被映射到 $[-1,1]$ （这似乎说明在 NDC 空间中，$z$ 值较小的内容渲染更靠前？）

他们的 $\text{M}_\text{their-per}$ 为：

$$
\large
\text{M}_\text{their-per} =
\begin{bmatrix}
\frac{1}{\text{aspect} \times \tan(\frac{\text{fov}}{2})} & 0 & 0 & 0 \\
0 & \frac{1}{\tan(\frac{\text{fov}}{2})} & 0 & 0 \\
0 & 0 & -\frac{f+n}{f-n} & -\frac{2fn}{f-n} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

Godot 使用和 OpenGL 一样的矩阵，下面是他们设置 $\text{M}_\text{per}$ 的代码。还要注意的是，他们使用 column-major 的方法存储数据，即

$$
M =
\begin{pmatrix}
\text{columns}[0][0] & \text{columns}[1][0] \\
\text{columns}[0][1] & \text{columns}[1][1]
\end{pmatrix}
$$

```cpp
void Projection::set_perspective(real_t p_fovy_degrees, real_t p_aspect, real_t p_z_near, real_t p_z_far, bool p_flip_fov) {
	if (p_flip_fov) {
		p_fovy_degrees = get_fovy(p_fovy_degrees, 1.0 / p_aspect);
	}

	real_t sine, cotangent, deltaZ;
	real_t radians = Math::deg_to_rad(p_fovy_degrees / 2.0);

	deltaZ = p_z_far - p_z_near;
	sine = Math::sin(radians);

	if ((deltaZ == 0) || (sine == 0) || (p_aspect == 0)) {
		return;
	}
	cotangent = Math::cos(radians) / sine;

	set_identity();

	columns[0][0] = cotangent / p_aspect;
	columns[1][1] = cotangent;
	columns[2][2] = -(p_z_far + p_z_near) / deltaZ;
	columns[2][3] = -1;
	columns[3][2] = -2 * p_z_near * p_z_far / deltaZ;
	columns[3][3] = 0;
}
```