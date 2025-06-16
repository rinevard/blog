---
title: 第八章——异常控制流
toc: true
date: 2025-03-31 11:25:61
tags:
categories:
  - 学习
  - 公开课
  - CMU-15-213
  - Notes
---

<style>
img{
    width: 70%;
}
</style>

当我们在程序执行时按下 ctrl+c ，究竟发生了什么？为解答这个问题，我们引入**异常控制流**（exceptional control flow，ECF）的概念。异常控制流允许我们将控制转移到其他程序，从而实现一些神奇的效果，比如中断程序、上下文切换、调用系统函数。

# **异常**

异常是异常控制流的一种形式，分为四类：

| 类别              | 异步/同步 | 产生原因     | 例子                        |
| ----------------- | --------- | ------------ | --------------------------- |
| 中断（interrupt） | 异步      | 外部事件     | 外部时钟（timer interrupt） |
| 陷阱（trap）      | 同步      | 执行内部指令 | 系统调用（system calls）    |
| 故障（fault）     | 同步      | 执行内部指令 | 除以零                      |
| 终止（abort）     | 同步      | 执行内部指令 | 硬件错误                    |

**注意：一定要检查系统调用的返回值，不然会出现一些很难调试的错误！**

异常发生后，控制会转移给异常处理程序。在处理完成后，根据异常的具体内容可能会返回到原程序的下一条指令，也可能返回到原程序的当前指令，也可能不返回。：

![](images/learning/open-course/CMU-15213/Notes/Chapter8/exception-control-shift.png)

# **进程**

## 并发和上下文切换

我们可以并发地执行多个进程，如下图所示：

![](images/learning/open-course/CMU-15213/Notes/Chapter8/concurrency.png)

但我们是怎么实现这种并发的呢？答案是上下文切换。下图展现了单核 CPU 的上下文切换，每个进程都有自己的上下文。

上下文切换的原因多种多样，举两个常见例子：用户可能执行系统调用而等待某个事件（比如用 waitpid 等待子进程终止），这时内核就可以让当前进程休眠并切换到另一个进程；系统每隔若干毫秒也会产生一次定时器中断的异常，并切换到新的进程。

![](images/learning/open-course/CMU-15213/Notes/Chapter8/content-change.png)

## 进程的创建、终止和回收

我们可以用 fork 来创建一个当前进程的复制——它执行一次，返回两次，分别返回到父进程和父进程的子进程中。对父进程，它返回子进程的 pid；对子进程，它返回 0.

子进程在终止后不会自动被清楚，而是进入“僵死进程”状态，直到被父进程回收。如果父进程终止了，init 进程会成为它的孤儿进程的养父。很明显，这里有潜在的内存泄漏。那么，怎么回收子进程呢？

我们可以用 waitpid 来等待子进程终止，在 waitpid 返回后，这个终止的子进程会被回收。

我们可以用 execve 来加载并运行程序。execve 函数在当前进程的上下文中加载并运行一个新程序，只有在出现错误时，它才会返回到调用程序。注意，它并没有创建一个新进程，而是在当前进程的上下文中加载并运行新程序。

来看一个综合运用上面的东西的例子吧：

```cpp
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    pid_t pid;
    pid = fork();

    if (pid < 0) {
        perror("fork failed");
        exit(1);
    } else if (pid == 0) {
        // 子进程
        printf("Child process (PID: %d) running...\n", getpid());

        // 使用 execve 加载并运行 "ls" 程序
        char *argv[] = {"/bin/ls", NULL}; // 参数列表
        char *envp[] = {NULL};            // 环境变量列表
        execve("/bin/ls", argv, envp);

        // 如果 execve 返回，说明执行失败
        perror("execve failed");
        exit(1);
    } else {
        // 父进程
        printf("Parent process (PID: %d), waiting for child (PID: %d)...\n", getpid(), pid);

        // 使用 waitpid 等待子进程终止并回收
        int status;
        waitpid(pid, &status, 0); // 阻塞等待子进程 pid 结束

        if (WIFEXITED(status)) {
            printf("Child exited with status %d\n", WEXITSTATUS(status));
        }
    }

    return 0;
}
```

# **信号**

信号允许内核异步通知目标进程发生了特定事件。

## 发送和接收信号

**发送信号**
信号可以由内核自动生成，例如：

- 当某个子进程的状态发生变化时（比如终止、暂停、恢复），内核会发送一个 `SIGCHLD` 信号给父进程；
- 当某个进程尝试除以 0 时，内核会发送一个 `SIGFPE` 信号给该进程。
  此外，进程也可以通过 `kill` 函数手动请求内核向其他进程发送信号。

**接收信号**
当内核将信号传递给目标进程，并迫使进程对此信号采取行动（例如执行信号处理程序或默认行为）时，进程就接收了该信号。需要注意的是，如果信号被阻塞或暂时未处理，它不会被视为“已接收”，而是进入待处理状态。

我们能用 `signal` 函数修改接收信号后的行为。

**未接收的信号会怎样？**
如果信号发出后未被立即接收，它会变成一个待处理信号。内核为每个进程维护一个表示待处理信号的位向量（pending signal bit vector），用以追踪有哪些信号尚未处理。由于信号不排队，同一时刻同一类型的待处理信号最多只有一个（即位向量中该位被置为 1）。如果某个类型已经有了待处理信号，被发送过来的同类信号会被简单地丢弃。此外，内核还为每个进程维护一个表示被阻塞信号的位向量（blocked signal bit vector），用来记录当前被屏蔽、不允许传递的信号。

## 异步的风险

下面的例子很好地说明了异步的风险

```cpp
#include "csapp.h"

volatile sig_atomic_t pid;

void sigchld_handler(int s) {
    int olderrno = errno;
    pid = waitpid(-1, NULL, 0); // 在子进程终止后更新pid
    errno = olderrno;
}

void sigint_handler(int s) {
}

int main(int argc, char **argv) {
    sigset_t mask, prev;

    Signal(SIGCHLD, sigchld_handler); // 在子进程终止后更新pid
    Signal(SIGINT, sigint_handler);
    Sigemptyset(&mask);
    Sigaddset(&mask, SIGCHLD);

    while (1) {
        Sigprocmask(SIG_BLOCK, &mask, &prev); /* Block SIGCHLD */
        if (Fork() == 0) { /* Child */
            exit(0);
        }

        /* Parent */
        pid = 0; // 我们 block 信号，这样即使子进程在这条语句前终止，pid也能正确更新
        Sigprocmask(SIG_SETMASK, &prev, NULL); /* Unblock SIGCHLD */

        /* Wait for SIGCHLD to be received (wasteful) */
        while (!pid) {
            pause(); // 潜在的竞争！
        }

        /* Do some work after receiving SIGCHLD */
        printf(".");
    }
    exit(0);
}
```

先来看看下面的局部代码：

```cpp
Sigprocmask(SIG_BLOCK, &mask, &prev); /* Block SIGCHLD */
if (Fork() == 0) { /* Child */
    exit(0);
}

/* Parent */
pid = 0; // 我们 block 信号，这样即使子进程在这条语句前终止，pid也能正确更新
Sigprocmask(SIG_SETMASK, &prev, NULL); /* Unblock SIGCHLD */
```

如果不使用 block，而子进程在 pid=0 这条语句前终止，那么信号处理程序会先把 pid 设置为子进程 pid，然后 pid 被重置为 0，导致我们没能正确记录 pid。这就是**阻塞信号**的重要性。

再来看看这里：

```cpp
while (!pid) {
    pause(); // 潜在的竞争！
}
```

我们的原意是在没有接收到信号时暂停，以避免空循环浪费处理器资源。具体来说，在收到子进程终止的信号后 pause 状态会结束，然后执行信号处理代码，然后进入下一个循环。

但这个 pause 带来了潜在的竞争。比如说，如果在 while 测试后和 pause 前收到信号，之后又没有别的信号，pause 就会进入永久睡眠。这就是**竞争的风险**。

对这个例子，解决办法是用 sigsuspend 替换 pause，我们不多说了。
