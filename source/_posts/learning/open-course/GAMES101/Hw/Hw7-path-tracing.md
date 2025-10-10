---
title: Assignment 7 Path Tracing
toc: true
date: 2025-10-10 22:10:44
tags:
categories:
  - 公开课
  - GAMES101
  - Assignments
---

# 大致流程

这次的作业挺难的。首先我们来对照公式解释一下大致的代码流程：

$$
\begin{align*}
L_o(p, \vec{\omega_o}) 
= &L_e(p, \vec{\omega_o}) + \int_{\Omega} f_r(p, \vec{\omega_i}, \vec{\omega_o}) L_i(p, \vec{\omega_i}) (\vec{\omega_i} \cdot n) d\omega_i 
\\
= &L_e(p, \vec{\omega_o}) + \int_{\Omega_{光源方向}} f_r(p, \vec{\omega_i}, \vec{\omega_o}) L_i(p, \vec{\omega_i}) (\vec{\omega_i} \cdot n) d\omega_i 
\\
&+ \int_{\Omega_{非光源方向}} f_r(p, \vec{\omega_i}, \vec{\omega_o}) L_i(p, \vec{\omega_i}) (\vec{\omega_i} \cdot n) d\omega_i

\end{align*}
$$

1. 如果点 $p$ 是光源，直接返回其自发光项 $L_e$.
2. 随机采样一个光源方向 $w\_s$，根据公式计算 $L\_\text{direct}$.
3. 随机采样一个方向 $w\_i$，按轮盘赌决定是否结束弹射。
    
    如果不结束且 $w\_i$ 没打到光源，根据公式计算 $L\_\text{indirect}$.
    
4. 返回 $L\_\text{direct}+L\_\text{indirect}$

然后放代码：

```cpp
Vector3f Scene::castRay(const Ray &ray, int depth) const
{
    Intersection shade_point_inter = intersect(ray);
    if (!shade_point_inter.happened) {
        return Vector3f();
    }

    // ----------------Contribution from emission----------------
    if (shade_point_inter.m->hasEmission()) {
        // Light source doesn't reflect light, so we return here
        return shade_point_inter.m->getEmission();
    }

    // ----------------Contribution from the light source----------------
    Vector3f wo = -normalize(ray.direction);
    Vector3f normal = normalize(shade_point_inter.normal);

    Vector3f l_direct = Vector3f();
    Intersection light_sample;
    float pdf_light;
    sampleLight(light_sample, pdf_light);

    // If the ray is not blocked in the middle, compute its contribution
    Vector3f light_normal = normalize(light_sample.normal);
    Vector3f shade_point = shade_point_inter.coords;
    Vector3f ws = normalize(light_sample.coords - shade_point);
    Vector3f direct_ray_origin = shade_point + ws * EPSILON;

    Ray ray_to_light(direct_ray_origin, ws);
    Intersection inter_between_light = intersect(ray_to_light);

    if ((!inter_between_light.happened) || inter_between_light.distance > (light_sample.coords - direct_ray_origin).norm() - EPSILON) {
        l_direct = light_sample.emit * shade_point_inter.m->eval(ws, wo, normal) \
        * std::max(dotProduct(ws, normal), 0.0f) * std::max(dotProduct(-ws, light_normal), 0.0f) \
        / std::pow((light_sample.coords - direct_ray_origin).norm(), 2) / pdf_light;
    }

    // ----------------Contribution from other reflectors----------------
    Vector3f l_indirect = Vector3f();
    // Russian Roulette test
    if (get_random_float() < RussianRoulette) {
        Vector3f wi = normalize(shade_point_inter.m->sample(wo, normal));
        Vector3f indirect_ray_origin = shade_point + wi * EPSILON;

        Ray reflected_ray(indirect_ray_origin, wi);
        Intersection reflected_inter = intersect(reflected_ray);

        // If reflected_ray hitting a non-emitting object, compute its contribution 
        if (reflected_inter.happened && reflected_inter.m->hasEmission()) {
            l_indirect = Vector3f();
        }
        else {
            l_indirect = castRay(reflected_ray, depth + 1) * shade_point_inter.m->eval(wi, wo, normal) \
            * std::max(dotProduct(wi, normal), 0.0f) \
            / (shade_point_inter.m->pdf(wi, wo, normal)) / RussianRoulette;
        }
    }

    return l_direct + l_indirect;
}
```

再来看看图

![](/images/learning/open-course/GAMES101/Assignments/hw7/screenshot.png)

# 代码细节

接下来我们再聊聊具体的代码细节。自发光项比较简单，我们略过。

## $L_\text{direct}$

直接光部分。首先要注意的是，各个射线 $w_i, w_o, w_s$ 都是从着色点指向外的单位方向向量。这是一个图形学里常用的约定，所以不要问为什么不是指向内了（）

![](/images/learning/open-course/GAMES101/Assignments/hw7/wiwodir.png)

然后在发出射线时，最好做一个微小的偏移以避免发出的射线和着色点平面相交。这就是我们 `direct_ray_origin = shade_point + ws * EPSILON` 做了加法的原因。

```cpp
Vector3f wo = -normalize(ray.direction);
Vector3f normal = normalize(shade_point_inter.normal);

Vector3f l_direct = Vector3f();
Intersection light_sample;
float pdf_light;
sampleLight(light_sample, pdf_light);

// If the ray is not blocked in the middle, compute its contribution
Vector3f light_normal = normalize(light_sample.normal);
Vector3f shade_point = shade_point_inter.coords;
Vector3f ws = normalize(light_sample.coords - shade_point);
Vector3f direct_ray_origin = shade_point + ws * EPSILON;

Ray ray_to_light(direct_ray_origin, ws);
Intersection inter_between_light = intersect(ray_to_light);

if ((!inter_between_light.happened) || inter_between_light.distance > (light_sample.coords - direct_ray_origin).norm() - EPSILON) {
    l_direct = light_sample.emit * shade_point_inter.m->eval(ws, wo, normal) \
    * std::max(dotProduct(ws, normal), 0.0f) * std::max(dotProduct(-ws, light_normal), 0.0f) \
    / std::pow((light_sample.coords - direct_ray_origin).norm(), 2) / pdf_light;
}
```

另外，我们有从光源采样计算直接光的公式：

$$
\begin{align*}
&\int_{\Omega_{光源方向}} f_r(p, \vec{\omega_i}, \vec{\omega_o}) L_i(p, \vec{\omega_i}) (\vec{\omega_i} \cdot n) d\omega_i 
\\
=&\int_{A} f_r(p, \vec{\omega_i}, \vec{\omega_o}) L_i(p, \vec{\omega_i}) \frac{\cos\theta\cos\theta_i}{\lVert p'-p \rVert^2} dA 

\end{align*}
$$

用蒙特卡罗近似就是代码里写的东西了。

![](/images/learning/open-course/GAMES101/Assignments/hw7/nee.png)

## $L_\text{indirect}$

间接部分。首先要做俄罗斯轮盘赌，然后要检查打到的是否是光源。

如果通过了轮盘赌，而且打到的不是光源，就要计算间接光。

与直接光一样，我们要做微小偏移，这就是 `indirect_ray_origin = shade_point + wi * EPSILON` .

然后套公式就行。

```cpp
Vector3f l_indirect = Vector3f();
// Russian Roulette test
if (get_random_float() < RussianRoulette) {
    Vector3f wi = normalize(shade_point_inter.m->sample(wo, normal));
    Vector3f indirect_ray_origin = shade_point + wi * EPSILON;

    Ray reflected_ray(indirect_ray_origin, wi);
    Intersection reflected_inter = intersect(reflected_ray);

    // If reflected_ray hitting a non-emitting object, compute its contribution 
    if (reflected_inter.happened && reflected_inter.m->hasEmission()) {
        l_indirect = Vector3f();
    }
    else {
        l_indirect = castRay(reflected_ray, depth + 1) * shade_point_inter.m->eval(wi, wo, normal) \
        * std::max(dotProduct(wi, normal), 0.0f) \
        / (shade_point_inter.m->pdf(wi, wo, normal)) / RussianRoulette;
    }
}
```

结果对 EPSILON 挺敏感的，可以把 EPSILON 适当调大点，我用的是 `0.00020` .