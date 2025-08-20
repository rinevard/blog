---
title: 第一章——系统接口
toc: true
date: 2025-06-1 11:18:38
tags:
categories:
  - 学习
  - 公开课
  - MIT-6.S081
  - Notes
---

<style>
img{
    width: 70%;
}
</style>

# 常用的系统接口

| **系统调用** | **描述** |
| --- | --- |
| fork() | 创建进程 |
| exit() | 结束当前进程 |
| wait() | 等待子进程结束 |
| kill(pid) | 结束 pid 所指进程 |
| getpid() | 获得当前进程 pid |
| sleep(n) | 睡眠 n 秒 |
| exec(filename, *argv) | 加载并执行一个文件 |
| sbrk(n) | 为进程内存空间增加 n 字节 |
| open(filename, flags) | 打开文件，flags 指定读/写模式 |
| read(fd, buf, n) | 从文件中读 n 个字节到 buf |
| write(fd, buf, n) | 从 buf 中写 n 个字节到文件 |
| close(fd) | 关闭打开的 fd |
| dup(fd) | 复制 fd |
| pipe( p) | 创建管道， 并把读和写的 fd 返回到p |
| chdir(dirname) | 改变当前目录 |
| mkdir(dirname) | 创建新的目录 |
| mknod(name, major, minor) | 创建设备文件 |
| fstat(fd) | 返回文件信息 |
| link(f1, f2) | 给 f1 创建一个新名字(f2) |
| unlink(filename) | 删除文件 |

# 进程

| **系统调用** | **描述** |
| --- | --- |
| fork() | 创建进程 |
| exit() | 结束当前进程 |
| wait() | 等待子进程结束 |
| kill(pid) | 结束 pid 所指进程 |
| getpid() | 获得当前进程 pid |
| exec(filename, *argv) | 加载并执行一个文件 |
| sbrk(n) | 为进程内存空间增加 n 字节 |

# I/O

| **系统调用** | **描述** |
| --- | --- |
| open(filename, flags) | 打开文件，flags 指定读/写模式 |
| read(fd, buf, n) | 从文件中读 n 个字节到 buf |
| write(fd, buf, n) | 从 buf 中写 n 个字节到文件 |
| close(fd) | 关闭打开的 fd |
| dup(fd) | 复制 fd |

代码示例：

```c
char buf[512];

void cat(int fd) {
    int n;

    while ((n = read(fd, buf, sizeof(buf))) > 0) {
				// 写入标准输出
        if (write(1, buf, n) != n) {
            fprintf(2, "cat: write error\n");
            exit(1);
        }
    }
    if (n < 0) {
        fprintf(2, "cat: read error\n");
        exit(1);
    }
}

int main(int argc, char *argv[]) {
    int fd, i;

    if (argc <= 1) {
        cat(0);
        exit(0);
    }

    for (i = 1; i < argc; i++) {
        if ((fd = open(argv[i], O_RDONLY)) < 0) {
            fprintf(2, "cat: cannot open %s\n", argv[i]);
            exit(1);
        }
        cat(fd);
        close(fd);
    }
    exit(0);
}
```

不妨再来看看CSAPP的两张图

### **open两次：**

![](/images/learning/open-course/MIT-6.S081/notes/note1-syscall/opentwice.png)

### **fork：**

![](/images/learning/open-course/MIT-6.S081/notes/note1-syscall/fork.png)

# 管道

| **系统调用** | **描述** |
| --- | --- |
| pipe( p) | 创建管道， 并把读和写的 fd 返回到p，其中p是 int p[2] |
- p[0]: 读端(read end)的文件描述符
- p[1]: 写端(write end)的文件描述符

样例： `grep fork sh.c | wc -l` 命令将第一个命令(grep)的输出作为第二个命令(wc)的输入，`|` 就是管道符号。

下面的代码是 `|` 的实现示例，大体思路是把 `|` 左边的标准输出重定向到pipe的写端，把 `|` 右边的标准输入重定向到pipe的读端。

注意要关闭管道的所有写入端来让 `read` 返回，因为当 pipe 中没有数据时，`read` 会阻塞等待新数据写入，或是写入端都关闭，如果有新数据写入就读取，如果所有写入端都关闭就返回 0（对应EOF）.

```c
// 假设我们的命令是 grep fork sh.c | wc -l
case PIPE:
    pcmd = (struct pipecmd *)cmd;
    if (pipe(p) < 0)
        panic("pipe");
    if (fork1() == 0) {
        close(1);   // 释放文件描述符1，从而让dup把文件描述符1绑定到p[1]指向的东西
        dup(p[1]);  //换句话说，我们在重定向标准输出到pipe的写端
        close(p[0]);
        close(p[1]);
        runcmd(pcmd->left); // 对应 grep fork sh.c
    }
    if (fork1() == 0) {
        close(0);  // 与上面类似，重定向标准输入到pipe的读端
        dup(p[0]);
        close(p[0]);
        close(p[1]);
        runcmd(pcmd->right); // 对应 wc -l
    }
    close(p[0]);
    close(p[1]);
    wait(0);
    wait(0);
    break;
```

# 文件系统

| **系统调用** | **描述** |
| --- | --- |
| chdir(dirname) | 改变当前目录 |
| mkdir(dirname) | 创建新的目录 |
| mknod(name, major, minor) | 创建设备文件 |
| fstat(fd) | 返回文件信息 |
| link(f1, f2) | 给 f1 创建一个新名字(f2) |
| unlink(filename) | 删除文件 |

我们通常认为文件名就是文件本身，但实际上名称是一个硬链接(hard link)。一个文件可以有多个硬链接——例如，一个目录至少有两个硬链接：目录名和 `.` （在目录内时）。它还有来自每个子目录的一个硬链接（每个子目录中的 `..` 文件）。

那文件是什么呢？一个文件和一个 inode 一一对应，inode存放着这个文件的相关信息

xv6系统的inode结构包括下面这些内容：

```c
struct dinode {
    short type;              // File type
    short major;             // Major device number (T_DEVICE only)
    short minor;             // Minor device number (T_DEVICE only)
    short nlink;             // Number of links to inode in file system
    uint size;               // Size of file (bytes)
    uint addrs[NDIRECT + 1]; // Data block addresses
};
```

可以通过 `fstat` 获取文件描述符指向的文件的信息。dinode是磁盘上存储的详细信息，stat是暴露给用户的文件信息接口

```c
struct stat {
    int dev;     // File system's disk device
    uint ino;    // Inode number
    short type;  // Type of file
    short nlink; // Number of links to file
    uint64 size; // Size of file in bytes
};
```

仅当我们把所有指向某个inode的链接都删除，这个inode才会被删除。

在下面的示例中，我们用 `ln` 创建了两个连接 file2 和 file3，它们都和 file1 指向的 inode 相同。可以看到，如果用 `echo` 修改 file2，那么 file1 也会被修改，因为我们修改的实际上是 inode，而它们指向同一个inode。`ls -l` 列出目录中的文件和目录的详细信息，第二个值是inode的link数。我们可以把链接视作文件的“别名”。

```
$ echo "What's in a name? That which we call a rose, by any other word would smell as sweet." > file1.txt

$ ls
file1.txt  open-course  programs

$ cat file1.txt
What's in a name? That which we call a rose, by any other word would smell as sweet.

$ ln file1.txt file2.txt

$ ln file1.txt file3.txt

$ ls -l
total 20
-rw-r--r-- 3 rinevard rinevard   85 May 29 11:37 file1.txt
-rw-r--r-- 3 rinevard rinevard   85 May 29 11:37 file2.txt
-rw-r--r-- 3 rinevard rinevard   85 May 29 11:37 file3.txt
drwxr-xr-x 3 rinevard rinevard 4096 May 28 11:00 open-course
drwxr-xr-x 2 rinevard rinevard 4096 May 28 10:19 programs

$ echo "-- William Shakespeare" >> file2.txt

$ cat file1.txt
What's in a name? That which we call a rose, by any other word would smell as sweet.
-- William Shakespeare
```

你可能会好奇目录的链接数怎么计算，是这样的：

1. 每个目录默认有2个链接，一个是目录自身的"."，另一个是父目录中指向该目录的链接
2. 目录中每包含一个子目录，链接数就会+1，因为每个子目录都会创建".."链接指向父目录

在下面的例子中，rootdir 的链接数是 4，因为父目录有一个指向它的链接”rootdir”，它自己有一个指向自己的链接”.”，它的两个子目录dir1和dir2分别有指向它的链接”..”

```bash
~/open-course/rootdir$ ls
dir1  dir2  file1.md  file2.md  file3.md

~/open-course/rootdir$ ls ../ -l
total 8
drwxr-xr-x 11 rinevard rinevard 4096 May 31 16:40 mit-6.828
drwxr-xr-x  4 rinevard rinevard 4096 Jun  1 10:58 rootdir
```

文件路径格式：以 “/” 开头的是从根目录出发的路径，否则是从当前文件夹出发的路径

```bash
~/open-course$ ls
mit-6.828
~/open-course$ ls mit-6.828/
LICENSE  Makefile  README  conf  grade-lab-util  gradelib.py  kernel  mkfs  user
~/open-course$ ls /home/rinevard/
open-course  programs
```

unix shell的许多命令都是用户级别的，而非内置的。shell通过fork子进程并调用exec来执行它们。但cd是内置的，因为cd改变了shell自身的工作目录。

```c
// Read and run input commands.
while (getcmd(buf, sizeof(buf)) >= 0) {
    if (buf[0] == 'c' && buf[1] == 'd' && buf[2] == ' ') {
        // Chdir must be called by the parent, not the child.
        buf[strlen(buf) - 1] = 0; // chop \n
        if (chdir(buf + 3) < 0)
            fprintf(2, "cannot cd %s\n", buf + 3);
        continue;
    }
    if (fork1() == 0)
        runcmd(parsecmd(buf));
    wait(0);
}
```