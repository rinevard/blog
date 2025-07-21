---
title: Malloclab和我不得不说的那些事
toc: true
date: 2025-05-12 19:28:38
tags:
categories:
  - 学习
  - 公开课
  - CMU-15-213
  - Labs
---

# 写在前面

malloclab 的难度很大，我实现了书上的基础的隐式空闲链表和显式空闲链表，用时约 16 小时，得分如下：

```
Perf index = 47 (util) + 40 (thru) = 87/100
```

实现的逻辑本身是简单的，难度最大的地方在于调试，所以我并没有进一步实现分离的空闲链表，因为调试起来实在是太麻烦了。算是体验了一下系统级编程的复杂性。

有趣的是，由于 fail fast 的编程习惯，我喜欢在代码里到处放 assert 和 print 语句，这帮我节省了不少调试时间，我甚至一次 gdb 都没用就把所有的 bug 都修完了。（话说回来我也不知道这种东西怎么用 gdb 调试）

本文会谈谈做这个 lab 时学到的一些编程技巧，不会太多谈 lab 本身，因为照着书上实现出来就好了。

# 宏编程

宏编程最需要关注的地方就是到处都要加括号。让我们以下面这行代码为例：

```c
#define GET(p) (*((unsigned int * )p))
```

像这种就是有问题的，因为没给 p 加括号！比如说，GET((char \*)bp - WSIZE) 的原本意图是让 bp 减去 WSIZE，但放到 GET 里就导致 bp 先被转换成 unsigned int 指针，再减去 WSIZE，从而让 bp 减去了 WSIZE \* sizeof(unsigned int)！

# validation_check

这个 lab 可以看作在创建一个神奇的类，我们总会对类有一些 validation 要求（比如说在这个 lab 中，我们要求内存里不能有连续的空闲块），这时我们就可以写一个 validation_check 函数，它会检查这个类是否满足我们的 validation 要求。

那这个 validation_check 有什么用呢？在调试的时候，我们可以把它插入到各种地方，然后看它在哪里 fail，这能帮助我们更快定位 bug。一个小技巧是用二分的思路来插入 validation_check。

# 其他小技巧

写这个 lab 的时候用到了很多 6.102 的知识，果然软工知识超有用~比如说，写一个简练清晰的 specification 很有帮助，fail fast 特别有用。

还注意到了一个有趣的地方，`size_t` 在我的系统上是这样显示的：

```c
typedef unsigned long size_t
```

据 claude 说，`size_t` 的具体定义取决于系统架构，这可能是为了可移植性考虑？

除此之外，我觉得还有一个重要的作用，就是给类型提供“别名”。有时我们希望类型有一个更具描述性的名称，而不只是“int”。
