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

很无聊的一次作业，代码框架也挺糟糕。`rayTriangleIntersect` 直接抄 PPT 的公式，`Render` 的难度全在代码注释不清晰上。咱就直接放代码了。

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

然后是 `Render` 的关键部分：

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
    x = (screen_width / (scene.width - 1)) * i - (screen_width / 2.0) - eye_pos.x;
    y = (-screen_height / (scene.height - 1)) * j + (screen_height / 2.0) - eye_pos.y;
    Vector3f dir = normalize(Vector3f(x, y, -1)); // Don't forget to normalize this direction!
    framebuffer[m++] = castRay(eye_pos, dir, scene, 0);
}
```

看看结果，我感觉这个反射也不太对啊……靠近观察者的球对地板的反射怎么在顶部而非底部？它对靠后的球的反射怎么在前方而非后方？总之就这样吧，咱也不太想看这个代码框架……

![](/images/learning/open-course/GAMES101/Assignments/hw5/binary.png)