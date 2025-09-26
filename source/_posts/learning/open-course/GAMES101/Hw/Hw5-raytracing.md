---
title: Assignment 5 Raytracing
toc: true
date: 2025-09-22 19:46:16
tags:
categories:
  - 公开课
  - GAMES101
  - Assignments
---

如果只是实现要求的话，感觉这会是很无聊的一次作业。为了让事情有趣一点，我们来看看 `castRay` 函数的实现吧。我们会把作业代码放在文末。

# castRay 函数的分析

castRay 函数实现了课上讲的光线追踪，它从 `orig` 打出朝着 `dir` 方向的射线，并返回颜色。其工作流程如下：

1. 首先，检查当前的递归深度`depth`。当`depth`超过场景设定的最大深度`scene.maxDepth`时，函数返回黑色。这就是开头的代码：

    ```cpp
    if (depth > scene.maxDepth) {
        return Vector3f(0.0,0.0,0.0);
    }
    ```

2. 然后，计算射线是否与场景中的任何物体相交。如果没有发生相交，说明射线射向了场景的背景，函数将返回背景颜色。

3. 如果射线击中了某个物体，函数将根据该物体的材质类型，进入不同的处理分支计算颜色。接下来我们会分析这些分支。

我们可以看到物体被分为了三种材质，分别是既有镜面反射又有折射的 `REFLECTION_AND_REFRACTION`、只有反射的 `REFLECTION`、只有漫反射的 `DIFFUSE_AND_GLOSSY`。`REFLECTION_AND_REFRACTION` 和 `REFLECTION` 部分的代码比较相似，我们就先讨论 `REFLECTION_AND_REFRACTION` 的代码，再讨论 `DIFFUSE_AND_GLOSSY` 的代码。

## REFLECTION_AND_REFRACTION

这里的反射/折射材质自身是没有颜色的，也就是说它们只显示反射/折射后射线打到的点的颜色。所以代码思路比较简单，如果射线打到了这种材质的物体上，它会反射/折射，我们需要计算出反射/折射后的射线打到的颜色，这就对应着下面的代码：

```cpp
Vector3f reflectionColor = castRay(reflectionRayOrig, reflectionDirection, scene, depth + 1);
Vector3f refractionColor = castRay(refractionRayOrig, refractionDirection, scene, depth + 1);
```

代码里还考虑了菲涅尔效应来计算反射和折射的比例。菲涅尔效应的公式有点复杂，我们就不讲解了。这里的 `kr` 就是菲涅尔方程算出的反射系数，而由能量守恒，折射系数就是 $1-\text{kr}$。

`hitColor` 就是这个点的最终颜色：

```cpp
float kr = fresnel(dir, N, payload->hit_obj->ior);
hitColor = reflectionColor * kr + refractionColor * (1 - kr);
```

我们也会注意到，代码在开头对反射/折射点做了一个小小的偏移，这似乎是为了避免反射/折射时立即打到自己（咱也不确定，这是猜测）

```cpp
Vector3f reflectionRayOrig = (dotProduct(reflectionDirection, N) < 0) ?
                              hitPoint - N * scene.epsilon :
                              hitPoint + N * scene.epsilon;
```

我们都看到菲涅尔效应的代码了，不如再看看纯反射/纯折射的球是怎样的。注意靠近我们观察者的球，我们可以先把 `kr` 设为 1 来看看纯反射的结果：

![](/images/learning/open-course/GAMES101/Assignments/hw5/reflection_only.png)

再来看看纯折射的结果：

![](/images/learning/open-course/GAMES101/Assignments/hw5/refraction_only.png)

与文末的图比较一下，就会发现菲涅尔效应确实就是反射和折射的叠加。

## DIFFUSE_AND_GLOSSY

再来看看 `DIFFUSE_AND_GLOSSY` 部分，这里是正常的 Phong 模型着色。唯一要注意的是，要判断射线打到的点和光源之间有没有物体遮挡，如果有遮挡这里就是阴影。

我认为这一部分的代码有问题，它只考虑了漫反射分量在不在阴影里，而没考虑镜面反射分量。这里是原本的代码：

```cpp
// 漫反射
lightAmt += inShadow ? 0 : light->intensity * LdotN;

// 镜面反射
Vector3f reflectionDirection = reflect(-lightDir, N);
specularColor += powf(std::max(0.f, -dotProduct(reflectionDirection, dir)),
    payload->hit_obj->specularExponent) * light->intensity;
```

我想我们应该做这样的修改：

```cpp
if (!inShadow) {
    // 漫反射
    lightAmt += light->intensity * LdotN;
    
    // 镜面反射
    Vector3f reflectionDirection = reflect(-lightDir, N);
    specularColor += powf(std::max(0.f, -dotProduct(reflectionDirection, dir)),
        payload->hit_obj->specularExponent) * light->intensity;
}
```

# 作业代码

接下来咱就直接放作业代码了。

首先是 `rayTriangleIntersect`：

```cpp
bool rayTriangleIntersect(const Vector3f& v0, const Vector3f& v1, const Vector3f& v2, const Vector3f& orig,
                          const Vector3f& dir, float& tNear, float& u, float& v)
{
    auto e1 = v1 - v0;
    auto e2 = v2 - v0;
    auto s = orig - v0;
    auto s1 = crossProduct(dir, e2);
    auto s2 = crossProduct(s, e1);
    auto coefficient = 1.0 / dotProduct(s1, e1);
    tNear = coefficient * dotProduct(s2, e2);
    u = coefficient * dotProduct(s1, s);
    v = coefficient * dotProduct(s2, dir);

    return (tNear >= 0) && (u >= 0) && (v >= 0) && ((1 - u - v) >= 0);
}
```

然后是 `Render` 的部分：

```cpp
for (int i = 0; i < scene.width; ++i)
{
    // generate primary ray direction
    float x;
    float y;
    // I don't understand what are the guiding comments talking about.
    // Anyway, the code is assuming the distance between eye and screen is one, since abs(dir.z) == 1
    // With this assumption we can compute screen's width and height
    // Then we map x from [0, scene.width - 1] to [-screen_width / 2, screenwidth / 2]
    // and map y from [0, scene.height - 1] to [screen_height / 2, -screen_height / 2]
    float screen_height = 2 * scale;
    float screen_width = imageAspectRatio * screen_height;    
    x = (screen_width / (scene.width - 1)) * (i + 0.5) - (screen_width / 2.0);
    y = (-screen_height / (scene.height - 1)) * (j + 0.5) + (screen_height / 2.0);
    Vector3f dir = normalize(Vector3f(x, y, -1)); // Don't forget to normalize this direction!
    framebuffer[m++] = castRay(eye_pos, dir, scene, 0);
}
```

看看结果吧！如果和前面的纯反射/纯折射对照，会发现前面的球确实就是反射和折射的叠加（反射很淡，不过仔细看也是能看出来的！）

![](/images/learning/open-course/GAMES101/Assignments/hw5/binary.png)