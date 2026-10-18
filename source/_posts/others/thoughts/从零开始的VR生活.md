---
title: 从零开始的 VR 生活
toc: true
date: 2026-10-06 09:56:28
tags:
categories:
  - 杂谈
  - 碎碎念
---

国庆回家拿出了吃灰已久的 Oculus Quest 2，折腾好久总算成功玩到游戏了。VR 带来的体验真的很奇妙，能在火炉旁坐着看赫萝卖萌，能看缪莉跳来跳去，玩起来感觉像是在窥视他人幸福生活的蛆🫠🫠

<img src="/images/others/random_thoughts/vrlife/holo.jpg" width="70%" height="auto">

这是狼与香辛料的赫萝，她很可爱🤤🤤

玩 VRChat 的时候能看到自己的手变成二次元的手，这时候真的会感慨“哇我也能这么萌吗”...虽然还没玩明白因此一直在初始房间，但只是照照镜子都感觉特别萌了。如果摘下头显我还是二次元角色就好了😇😇

二次元你害人不浅！你应该抛下二次元去玩世界上最伟大的 VR 游戏半条命 Alyx！可是老大她太可爱了😭😭😭结果搞半天我的国庆就在脑叶公司和各种二次元 VR 游戏里度过了，真是一个充实而快乐的国庆啊（住口！）

在国庆的末尾也要记录一下配置 Quest 2 时遇到的几个难点，我们开始吧。

## 网络

Oculus Quest 2 由 Meta 公司开发，国内不能直连 Meta 官网，因此我让 Quest 2 连电脑热点走 Clash Verge 的 TUN 代理来间接连外网，流程如下：

1. Clash Verge 开启 TUN 模式
2. 开启 Windows 热点
3. Win+R 输入 ncpa.cpl 进入网络连接面板，找到 Clash TUN 网卡和热点网卡
    <img src="/images/others/random_thoughts/vrlife/nenett.png" width="90%" height="auto">
4. 右键 TUN 网卡进入“属性”，再点击“共享”，勾选“允许其他网络用户通过此计算机的 Internet 连接来连接”，并在下面的“家庭网络连接”里选择热点网卡
    <img src="/images/others/random_thoughts/vrlife/metanet.png" width="60%" height="auto">
5. 让 Quest 2 连接上热点，我们就成功了！

## 开发者模式

给头显打开开发者模式会让各种操作都方便很多，比如连接电脑安装 apk、使用 adb 命令。我们需要把头显和一个 Meta 开发者账号绑定，并在账号的设备设置里打开头显的开发者模式。流程如下：

1. 如果 Quest 2 已激活，那自然有一个绑定的账号，只要把绑定的账号注册为开发者就行；如果没激活，则需要注册一个账号；如果激活了但不知道账号是什么，首先联网把 Quest 2 更新到较新版本（因为早期 Quest 2 不使用 Meta 账号），再恢复出厂设置，然后重新注册账号。
2. 在 https://developers.meta.com/vr 注册账号，在 https://developers.meta.com/vr/manage 把账号注册为开发者。这里需要启动双重验证或者信用卡，我选择前者，用手机的 Authy 软件来启动双重验证。
3. 如果头显没激活，按头显提示的激活步骤来绑定头显和账号。
4. 在手机端下载 Meta Horizon 软件，找到绑定的头显，到“头戴设备设置”里启动头显的开发者模式。

## PC 串流

在电脑上安装 Meta Horizon Link 软件，然后用串流线连接电脑和头显就行。插上线时头显会询问是否 “Enable Link”，选择是就成功启动了串流。之后在电脑上启动适配 VR 的软件（比如 Steam 上的 VR 游戏）就能玩到 VR 游戏了。

## apk 下载与安装

Quest 2 可以直接安装 apk 在头显上运行，我们可以在电脑上下载 apk 然后安装到头显上，流程如下：

0. 确保头显打开了开发者模式
1. 在电脑上安装 SideQuest 软件
2. 用数据线连接头显和电脑
3. 打开 SideQuest，到 Sideload 页面就能安装 apk 到头显上了！
    <img src="/images/others/random_thoughts/vrlife/sidequest.png" width="60%" height="auto">

<style>
.small-text {
    font-size: 0.625em; /* 设置为你想要的大小，例如 10px、12px 或 0.75em */
    display: inline-block;
    line-height: 1.5;
}
</style>

<span class="small-text">
悄悄告诉你两个破解网站~
baozouvr [https://www.baozouvr.com/](https://www.baozouvr.com/)
QuestPiracy [https://qpmegathread.top/](https://qpmegathread.top/)
</span>
