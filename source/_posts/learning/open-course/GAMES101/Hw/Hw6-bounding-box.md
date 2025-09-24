---
title: Assignment 6 Bounding Box
toc: true
date: 2025-09-24 17:46:44
tags:
categories:
  - 公开课
  - GAMES101
  - Assignments
---

这次的作业要求实现用包围盒来加快光线追踪，再用 BVH 优化。

首先我们要把 hw5 里的代码复制过来，让我不解的是代码里明明已经提供了 `rayTriangleIntersect` 函数，PDF 里却还说“将你的光线-三角形相交函数粘贴到此处”，明明直接调用它就好了，如下所示：

```cpp
inline Intersection Triangle::getIntersection(Ray ray)
{
    Intersection inter;
    float u, v, t;
    inter.happened = rayTriangleIntersect(v0, v1, v2, ray.origin, ray.direction, t, u, v);
    if (inter.happened) {
        inter.coords = ray.origin + t * ray.direction;
        inter.normal = normal;
        inter.distance = t;
        inter.obj = this;
        inter.m = m;
    }

    return inter;
}
```

然后我也不太喜欢代码框架对 `IntersectP` 的定义，在我看来既然另外两个参数能通过 `ray` 算出来，就完全没有理由作为参数传入。

于是我就改成了这个只保留 `ray` 参数的样子：

```cpp
inline bool Bounds3::IntersectP(const Ray& ray) const
{
    // invDir: ray direction(x,y,z), invDir=(1.0/x,1.0/y,1.0/z), use this because Multiply is faster that Division
    auto tMinVec = (pMin - ray.origin) * ray.direction_inv;
    auto tMaxVec = (pMax - ray.origin) * ray.direction_inv;
    float tMinx = std::max({std::min(tMinVec.x, tMaxVec.x), static_cast<float>(ray.t_min)});
    float tMiny = std::max({std::min(tMinVec.y, tMaxVec.y), static_cast<float>(ray.t_min)});
    float tMinz = std::max({std::min(tMinVec.z, tMaxVec.z), static_cast<float>(ray.t_min)});
    
    float tMaxx = std::min({std::max(tMinVec.x, tMaxVec.x), static_cast<float>(ray.t_max)});
    float tMaxy = std::min({std::max(tMinVec.y, tMaxVec.y), static_cast<float>(ray.t_max)});
    float tMaxz = std::min({std::max(tMinVec.z, tMaxVec.z), static_cast<float>(ray.t_max)});
    
    float tMin = std::max({tMinx, tMiny, tMinz});
    float tMax = std::min({tMaxx, tMaxy, tMaxz});

    return (tMin <= tMax);
}
```

思路就是计算这个交集：

$$
[t_\text{raymin},t_\text{raymax}]\cap[t_{x, \text{enter}}, t_{x, \text{exit}}]\cap[t_{y, \text{enter}}, t_{y, \text{exit}}]\cap[t_{z, \text{enter}}, t_{z, \text{exit}}]
$$

对于最后的 `getIntersection`，小 AI 说可以在发生相交时更新 `ray` 的 `t_max`，然后在射线和盒子的交点大于 `t_max` 时不再检测盒子内部的相交，这可以优化性能。我认为他说得非常有道理，但改起来有点麻烦，就不改了。

```cpp
Intersection BVHAccel::getIntersection(BVHBuildNode* node, const Ray& ray) const
{
    if (!node->bounds.IntersectP(ray)) {
        return Intersection();
    }

    // leaf node checks ray's intersection with obj  
    if (node->left == nullptr && node->right == nullptr) {
        if (node->object == nullptr) {
            return Intersection();
        }
        return node->object->getIntersection(ray);
    } 
    // parent with only one child returns child's intersection
    else if (node->left == nullptr) {
        return getIntersection(node->right, ray);
    } else if (node->right == nullptr) {
        return getIntersection(node->left, ray);
    } 
    // parent with two children returns the closer intersection
    else {
        Intersection inter1 = getIntersection(node->left, ray);
        Intersection inter2 = getIntersection(node->right, ray);
        if (!inter1.happened && !inter2.happened) {
            return Intersection();
        } else if (!inter1.happened) {
            return inter2;
        } else if (!inter2.happened) {
            return inter1;
        }
        return (inter1.distance < inter2.distance) ? inter1 : inter2;
    }
}
```

咱还是在最后放放图图

![](/images/learning/open-course/GAMES101/Assignments/hw6/bvh.png)