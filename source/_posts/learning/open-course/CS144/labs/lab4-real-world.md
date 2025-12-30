---
title: Lab 4 Measuring the real world
toc: true
date: 2025-12-30 11:16:28
tags:
categories:
  - 公开课
  - CS144
  - Labs
---

这个 Lab 让我们 ping 一小时远程主机来收集数据画图。我在校园网环境下 ping 了 github、mit.edu，还在手机热点下 ping 了 mit.edu。

可以看出手机热点延迟波动大，但总体延迟优于校园网。

<img src="/images/learning/open-course/CS144/labs/lab4/req6_min_rtt.png">

<img src="/images/learning/open-course/CS144/labs/lab4/rtt_trend.png">

<img src="/images/learning/open-course/CS144/labs/lab4/rtt_dist.png">

比较有趣的是在我运行 traceroute mit.edu 时，校园网环境下解析出的 IP 是 23.75.122.29（位于美国），而手机热点环境解析出的 IP 是 184.87.104.30（位于香港）。这是因为 DNS 返回的 IP 和供应商有关（大概吧🫠🫠）