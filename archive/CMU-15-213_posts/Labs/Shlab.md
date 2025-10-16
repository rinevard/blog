---
title: Shlab调试记录和一键测试脚本
toc: true
date: 2025-04-3 17:04:28
tags:
categories:
  - 公开课
  - CMU-15-213
  - Labs
---

# 写在前面

用时 10h30min, 通过所有测试。这个 lab 还是比较直接的, 按着 trace 的顺序逐步实现即可, 难点主要在调试和不熟悉系统调用语法上。我在写代码的过程中遇到了两个调了蛮久的 bug, 分别在 trace13 和 trace16 上, 下面简要复盘一下。

# 调试

## trace16

先说 trace16 的 bug, 这个调了半小时。trace16 测试的是 shell 能否处理子进程被外部信号中断或停止的情况。我遇到的问题是 trace16 在 `./mystop` 那里卡住了, 于是猜测原因是 jobs 没能正确更新子进程的暂停状态。后面加了点调试语句发现果然如此。那么修复思路就是在子进程暂停后把它对应的 job 状态进行更新。但怎么知道子进程什么时候暂停呢？答案是 sigchld_handler.

我一开始以为 sigchld_handler 只会在某个子进程终止后被调用, 所以只在 sigchld_handler 里写了回收已经终止的子进程的逻辑。后来发现**子进程只要状态发生变化就会发 SIGCHLD 信号给父进程, 子进程终止只是一种情况, 暂停、恢复也会发送这个信号**。所以让 sigchld_handler 检查已经停止的子进程, 并更新它们对应的 jobs 状态就修复了这个 bug.

## trace13

然后是 trace13 的 bug, 这个调了两小时半。这里的问题是在 `fg %1` 卡住。第一个猜测自然是进程没能被正确移到前台, 但加了调试语句后发现它确实被移到前台了。之后的猜测就是 waitfg 的实现有误, 这个猜测看起来很合理, 毕竟 handout 里写 waitfg 大概需要 20 行, 而我只用了 4 行。但测了半天发现 waitfg 也没问题。

进一步加入各种调试语句, 发现在 fg %1 之后, 进程确实被顺利移到了前台, jobs 也正确更新了, waitfg 只是因为它没结束, 所以一直循环着等着它。好吧, 那我猜是 sigchld_handler 没能正确回收它。我检查了一下, 发现终止的进程也都被正确回收了。那还能是什么原因呢？难道它被暂停了, 但没有被正确启动, 导致我们的 shell 误以为这个暂停着的进程是前台进程, 从而卡住了？这听起来就像是一个并行导致的问题, 于是我又调试了好久, 最后发现它确实被正确启动了, 这个进程只是单纯地还没有终止而已。

那这怎么可能呢？凭什么它在 tshref 里几秒钟就执行完了, 在我的实现里五分钟了都没执行完？原来是我的“启动”写错了。我使用的是 `kill(job->pid, SIGCONT)`, **这个代码只把启动信号发给了这一个子进程, 而不是发给它所在的进程组**, 从而让这个子进程所在组的别的进程没有被正确启动。而看看 `mysplit.c` 的代码, 会发现它等待它的子进程执行完才会终止, 所以我们把代码改成 `kill(-job->pid, SIGCONT)` 就解决了这个 bug.

就因为这一个负号, 我调试了两个半小时, 而且我感觉我一路下来的各种猜想也都很合理, 只能感叹系统级代码真难调试啊。

## 感想

也算是学到了几招吧：

1. 在调用系统函数时一定要检查返回值, 不然会报一些很难调试的错误
2. 在修改全局变量时一定要用 sigprocmask 拦截别的信号, 避免冲突
3. 子进程只要状态发生变化就会发 SIGCHLD 信号给父进程, 终止、暂停、恢复都会发送这个信号
4. 可以用 waitpid 来检查子进程的变化状态, 它会回收终止的子进程
5. 只在信号处理程序中调用异步安全的函数
6. 调试时大胆猜想, 小心求证

# 一键测试脚本

我让 AI 写了一份一键测试脚本, 比官方的形如 `make test13` 的测试方便不少。脚本的功能是在 traceA 到 traceB（要求 A < B）上分别运行 tsh 和 tshref, 并把输出结果放到两个文件中。比如说, 如果我们输入 `./test_traces.sh 1 5`, 就能测试 `trace01.txt` 到 `trace05.txt`, 并将结果分别保存到 `_tshref_output.txt` 和 `_tsh_output.txt`。之后用各种编辑器自带的比较文件功能就能很方便的比较输出异同。

## 代码

```bash
#!/bin/bash

# 脚本名称：test_traces.sh

# 显示用法
usage() {
    echo "用法: $0 lower upper"
    echo "  lower: 开始的 trace 文件编号 (1-16)"
    echo "  upper: 结束的 trace 文件编号 (1-16)"
    echo "示例: $0 1 5"
    echo "  这将测试 trace01.txt 到 trace05.txt，并将输出分别保存到 _tshref_output.txt 和 _tsh_output.txt"
}

# 检查是否提供了两个参数
if [ "$#" -ne 2 ]; then
    echo "错误: 请提供 lower 和 upper 两个参数"
    usage
    exit 1
fi

lower=$1
upper=$2
ref_output_file="_tshref_output.txt"
tsh_output_file="_tsh_output.txt"

# 清空输出文件（如果已存在）
> "$ref_output_file"
> "$tsh_output_file"

# 获取当前工作目录（模仿 make 的 Entering directory 格式）
directory=$(pwd)

# 循环运行指定范围的 trace 文件
for ((i=lower; i<=upper; i++)); do
    # 补齐两位数格式（例如 01, 02, ..., 16）
    trace_num=$(printf "%02d" $i)

    # 输出 make 样式的进入目录信息（仅第一次循环时）
    if [ $i -eq $lower ]; then
        echo "make[1]: Entering directory \`$directory'" >> "$ref_output_file"
        echo "make[1]: Entering directory \`$directory'" >> "$tsh_output_file"
    fi

    # 为 tshref 输出添加分隔符和内容
    echo "===== Trace $trace_num =====" >> "$ref_output_file"
    echo "./sdriver.pl -t trace$trace_num.txt -s ./tshref -a \"-p\"" >> "$ref_output_file"
    head -n 1 "trace$trace_num.txt" >> "$ref_output_file"
    ./sdriver.pl -t "trace$trace_num.txt" -s ./tshref -a "-p" >> "$ref_output_file" 2>&1
    echo "" >> "$ref_output_file"  # 添加空行作为间隔

    # 为 tsh 输出添加分隔符和内容
    echo "===== Trace $trace_num =====" >> "$tsh_output_file"
    echo "./sdriver.pl -t trace$trace_num.txt -s ./tsh -a \"-p\"" >> "$tsh_output_file"
    head -n 1 "trace$trace_num.txt" >> "$tsh_output_file"
    ./sdriver.pl -t "trace$trace_num.txt" -s ./tsh -a "-p" >> "$tsh_output_file" 2>&1
    echo "" >> "$tsh_output_file"  # 添加空行作为间隔
done

echo "测试完成。参考实现结果已保存到 $ref_output_file，学生实现结果已保存到 $tsh_output_file"
```

## 用法简述

1. 保存脚本：
   - 将上述代码保存到一个文件，例如 `test_traces.sh`。
2. 赋予执行权限：
   - 在终端中运行以下命令，为脚本添加执行权限：
     ```bash
     chmod +x test_traces.sh
     ```
   - 这一步是必须的，因为在 Linux/Unix 系统中，脚本默认没有执行权限，需要手动赋予。
3. 运行脚本：
   - 使用以下格式运行脚本：
     ```bash
     ./test_traces.sh lower upper
     ```
     - `lower`：起始的 trace 文件编号（1-16）。
     - `upper`：结束的 trace 文件编号（1-16）。
   - 示例：
     ```bash
     ./test_traces.sh 1 5
     ```
     - 这将测试 `trace01.txt` 到 `trace05.txt`，并将结果分别保存到 `_tshref_output.txt` 和 `_tsh_output.txt`。
4. 检查输出：
   - 测试完成后，比较 `_tshref_output.txt`（参考实现结果）和 `_tsh_output.txt`（学生实现结果）。
   - 用各种编辑器自带的比较文件功能就能很方便的比较输出异同。

## 注意事项

- 环境要求：确保当前目录下有 `sdriver.pl`、`tshref`、`tsh` 以及对应的 `traceXX.txt` 文件，否则脚本会报错。
- 覆盖输出：每次运行脚本时，输出文件（`_tshref_output.txt` 和 `_tsh_output.txt`）会被清空并重新生成。
