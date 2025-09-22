---
title: Assignment 4 Geometry
toc: true
date: 2025-09-22 19:44:16
tags:
categories:
  - 公开课
  - GAMES101
  - Assignments
---

这次作业过于简单，我们直接放代码。

```cpp
cv::Point2f recursive_bezier(const std::vector<cv::Point2f> &control_points, float t) 
{
    // TODO: Implement de Casteljau's algorithm
    if (control_points.size() == 2) {
        return ((1 - t) * control_points[0] + t * control_points[1]);
    }

    std::vector<cv::Point2f> new_control_points = {};
    for (int i = 0; i < control_points.size() - 1; i++) {
        new_control_points.push_back((1 - t) * control_points[i] + t * control_points[i + 1]);
    }
    return recursive_bezier(new_control_points, t);
}

void bezier(const std::vector<cv::Point2f> &control_points, cv::Mat &window) 
{
    // TODO: Iterate through all t = 0 to t = 1 with small steps, and call de Casteljau's 
    // recursive Bezier algorithm.
    float step = 0.001;
    for (float t = 0; t <= 1; t += step ) {
        auto point = recursive_bezier(control_points, t);
        window.at<cv::Vec3b>(point.y, point.x)[1] = 255;
    }
}
```

另外，由于咱以前在 Godot 里导入字体时见过多通道符号距离场的设置，而且发现开启多通道符号距离场的字体显示清晰了一大截，所以我找了找一些关于 SDF 的资料，感觉这个不错：[动态 SDF 字体渲染方法 | 十三](https://www.xianlongok.site/post/4625ed6a/#SDF-font)