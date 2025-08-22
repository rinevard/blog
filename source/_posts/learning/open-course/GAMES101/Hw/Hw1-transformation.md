---
title: Assignment 1 Transformation
toc: true
date: 2025-08-22 11:00:58
tags:
categories:
  - 学习
  - 公开课
  - GAMES101
  - Assignments
---

本次作业要求我们实现旋转矩阵、投影矩阵。我们先简单看下作业是怎么做的，再看看代码框架里的几个有趣的地方。

# 作业实现

## 两个旋转矩阵

绕 $z$ 轴的旋转矩阵实现起来很简单，把课上的内容翻译成代码就好。在使用 std 的 sin 和 cos 时要注意把角度转换成弧度。

```cpp
Eigen::Matrix4f get_model_matrix(float rotation_angle)
{
    Eigen::Matrix4f model = Eigen::Matrix4f::Identity();

    float angle_rad = rotation_angle * MY_PI / 180.0;
    Eigen::Matrix4f rotate;
    float sine = std::sin(angle_rad);
    float cosine = std::cos(angle_rad);
    rotate << cosine, -sine, 0, 0,
            sine, cosine, 0, 0, 
            0, 0, 1, 0, 
            0, 0, 0, 1;
    model = rotate * model;

    return model;
}
```

提高项里的旋转矩阵用课上讲的 Rodrigues' rotation formula 就行：

```cpp
/*
    Computes the 4x4 rotation matrix representing a rotation of rotation_angle (in degree) 
    around a given normalized axis vector that passes through the origin, 
    using Rodrigues' rotation formula.
*/
Eigen::Matrix4f get_rotation(Vector3f axis, float rotation_angle) {
    float angle_rad = rotation_angle * MY_PI / 180.0;
    
    Eigen::Matrix3f rot_mat = std::cos(angle_rad) * Eigen::Matrix3f::Identity();
    rot_mat += (1 - std::cos(angle_rad)) * axis * axis.transpose();
    
    Eigen::Matrix3f cross_product_mat;
    cross_product_mat << 0, -axis.z(), axis.y(),
                        axis.z(), 0, -axis.x(), 
                        -axis.y(), axis.x(), 0;
    rot_mat += std::sin(angle_rad) * cross_product_mat;

    Eigen::Matrix4f trans_mat = Eigen::Matrix4f::Identity();
    trans_mat.topLeftCorner<3, 3>() = rot_mat;

    return trans_mat;
}
```

## 投影矩阵

投影矩阵就相对复杂一些了，先上代码

```cpp
Eigen::Matrix4f get_projection_matrix(float eye_fov, float aspect_ratio,
                                      float zNear, float zFar)
{
    // Students will implement this function

    Eigen::Matrix4f projection = Eigen::Matrix4f::Identity();

    Eigen::Matrix4f perspective;
    float cotangent = 1.0 / std::tan(eye_fov / 2.0);
    float z_delta = zFar - zNear;
    perspective << cotangent / aspect_ratio, 0, 0, 0, 
                    0, cotangent, 0, 0, 
                    0, 0, -(zFar + zNear) / z_delta, -2 * zFar * zNear / z_delta,
                    0, 0, -1, 0;
    projection = perspective * projection;

    return projection;
}
```

首先我们会发现输入的 zNear 和 zFar 都是正数，他们表示近平面和远平面到原点的距离，这与课上讲的不同。课上讲的 $n$ 和 $f$ 表示近平面和远平面在 $z$ 轴的坐标，他们是负数。

然后我们分析 rasterizer.cpp 里的 draw 函数，下面这段代码里，v 是三角形的三个顶点构成的数组，三个顶点都已经被变换到了 $[-1,1]^3$ 的正方体中。

注意 `vert.z() = vert.z() * f1 + f2` 这行代码，把 $-1$ 代入右边得到 $-n$，$1$ 代入右边得到 $-f$，因此我们有理由猜测 $[-n,-f]$ 被映射到了 $[-1,1]$. 

```cpp
float f1 = (100 - 0.1) / 2.0;
float f2 = (100 + 0.1) / 2.0;

// ...

for (auto & vert : v)
{
    vert.x() = 0.5*width*(vert.x()+1.0);
    vert.y() = 0.5*height*(vert.y()+1.0);
    vert.z() = vert.z() * f1 + f2;
}
```

总结一下我们的发现：

1. 输入的 zNear 和 zFar 都是正数，表示近平面和远平面到原点的距离
2. $[-n,-f]$ 被映射到了 $[-1,1]$

最终我们能写出这样的投影矩阵：

$$
\large
\text{M}_\text{per} =
\begin{bmatrix}
\frac{1}{\text{aspect} \times \tan(\frac{\text{fov}}{2})} & 0 & 0 & 0 \\
0 & \frac{1}{\tan(\frac{\text{fov}}{2})} & 0 & 0 \\
0 & 0 & -\frac{f+n}{f-n} & -\frac{2fn}{f-n} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

翻译成代码就好。

# 代码框架里有趣的地方

## ind 的作用

首先我们看向 main.cpp 的 main 函数里的这段代码

```cpp
std::vector<Eigen::Vector3f> pos{{2, 0, -2}, {0, 2, -2}, {-2, 0, -2}};
std::vector<Eigen::Vector3i> ind{{0, 1, 2}};
```

pos 显然是三角形的三个顶点，但 ind 是做什么的？uh actually🤓☝️它定义了如何将顶点连接起来。对三角形来说它当然没什么用，但对多边形来说，它就很有用了。

比如说，想象一下我们在画一个六边形，我们需要六个顶点。但由于在渲染时我们主要绘制三角形，所以我们要把六边形拆分成多个三角形，而拆分出的每个三角形就对应着 ind 里的一个元素了。

对六边形来说，我们可能会定义下面这样的 pos 和 ind

```cpp
std::vector<Eigen::Vector3f> pos
{
    {2, 0, -2},      // 0: 右
    {1, 1.732, -2},  // 1: 右上
    {-1, 1.732, -2}, // 2: 左上
    {-2, 0, -2},     // 3: 左
    {-1, -1.732, -2},// 4: 左下
    {1, -1.732, -2}  // 5: 右下
};
std::vector<Eigen::Vector3i> ind
{
    {0, 1, 2},
    {0, 2, 3},
    {0, 3, 4},
    {0, 4, 5}
};
```

## id 的作用

继续看向 main.cpp 的 main 函数，把目光投向这段代码

```cpp
auto pos_id = r.load_positions(pos);
auto ind_id = r.load_indices(ind);

// ...

r.draw(pos_id, ind_id, rst::Primitive::Triangle);
```

在这里，我们把 id 传入了 draw 函数来画图。但为什么要用 id 呢？直接 & 传参不行吗？

【TODO：我不知道。AI说在正式的渲染代码里，我们会在load时做一些操作诸如把数据上传到显存，或者重新组织上传的各个数据来提高效率，但咱也不知道是不是真的。】