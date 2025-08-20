---
title: Attackblab记录
toc: true
date: 2025-03-13 11:18:38
tags:
categories:
  - 学习
  - 公开课
  - CMU-15-213
  - Labs
---

<style>
img{
    width: 40%;
}
</style>

# 写在前面

非常有趣的 lab！做了一大半以后感觉自己已经是 super 嗨客了。我不打算做最后一个，毕竟读汇编来做 ROP 攻击挺麻烦的，我感觉这对我的水平提升也不大（而且拿到 95/100 我已经很满足了）

“Why good people can only do good things and bad people can only do bad things? We bad people can do **whatever we want**.——Evil Neuro”

# 攻击

attacklab 的攻击主要分为植入攻击代码和 ROP 攻击。

## 植入攻击代码

### 攻击 1

攻击 1 只是简单地让我们熟悉一下工作流程，我们只要覆写掉返回地址就好了。

大致的攻击流程是——跑一下 ctarget 看看我们写入的内容会被放在栈的哪个位置，熟悉位置以后把十六进制的攻击内容写到某个 txt 文件里，再用 `./hex2raw < rinevinput.txt > evil` 转换为输入值，最后把输入值传到 ctarget 就实现了攻击。

下面给一些小 hints。

注意, 不要把内容写入形如 `evil.txt` 这样的**有格式的文件**里! 这可能修改一些特殊字符。我之前就踩了这个坑。

使用`./ctarget -q < evil`来运行，因为我们不能连接到 CMU 服务器（唉，CMU）.

![](/images/learning/open-course/CMU-15213/Labs/Attacklab/evil.jpg)

### 攻击 2

攻击 2 就是典型的“植入攻击代码”了。一开始我的思路如下图：

![](/images/learning/open-course/CMU-15213/Labs/Attacklab/attack2.png)

这确实能跑，也确实顺利执行了 touch2，但执行完之后发生了**segmentation fault**！这是为什么？**我至今没有搞清楚**，如果有朋友知道可以跟我说一下。但我可以排除一些疑点。

首先，segmentation fault 不是因为栈指针跑到了预期位置之外。因为在 phase-2-level2 中，我们的栈指针跑得老远了。

segmentation fault 的发生**大概率是因为栈指针没有对齐**。给能通过的 phase2-level2 再加一句 ret，就造成了 segmentation fault。再在造成了 segmentation fault 的基础上多 ret 一次就又没有 segmentation fault 了。

所以我觉得大概率是栈指针的对齐问题。那栈指针，你究竟该在哪里呢？

回到攻击 2，既然我们猜测是栈指针对齐问题，只要让它对齐就行了。我们微调一下，通过 push 让栈指针的位置偏移 8，然后就通过了。

![](/images/learning/open-course/CMU-15213/Labs/Attacklab/attack2_2.png)

### 攻击 3

攻击 3 和攻击 2 差不多，唯一要注意的是 hexmatch 和 strncmp 会覆写栈，所以我们要把字符串藏在更下面的位置（即栈地址比较大的位置）。造成了 segmentation fault 怎么办？我们已经有了攻击 2 的经验，所以借助 pop，push，ret 来微调一下栈指针位置就行。

作业 PDF 里还提到，"Make position of check string unpredictable"。这有什么意义？我猜是为了防止我们把 sval 指向 cbuf 来实现攻击，这或许不符合 attacklab 的世界观，因为连字符串都不用注入了。

![](/images/learning/open-course/CMU-15213/Labs/Attacklab/attack3.png)

## ROP 攻击

### 攻击 4

我是笨蛋，又踩了一个坑。考虑指令

```asm
4017fc: 3b 3d e2 3c 20 00 cmp 0x203ce2(%rip),%edi # 6054e4 <cookie>
401802: 75 20 jne 401824 <touch2+0x38>
```

在执行 cmp 指令时：RIP 的值是 0x401802，而不是 0x4017fc。我之前还想了半天为什么我们能指向 cookie。

回到题目上来，根据提示，我们要用 mov，pop，ret，那么思路是写入 cookie 到栈中，pop 它到某个地方（addval_219 有 pop %rax），最后移动到 rdi 中（addval_273 有 movl %eax %edi）

![](/images/learning/open-course/CMU-15213/Labs/Attacklab/attack4.png)

我们在攻击 2 里已经讨论过 segmentation fault 的发生原因，最合理的猜测是栈指针的对齐问题。所以如果发生了 segmentation fault，找个 ret 再用一下就行了。

### 攻击 5

没做，we bad people can do whatever we want！

![](/images/learning/open-course/CMU-15213/Labs/Attacklab/neuro.jpg)
