---
title: 人来人往的路
---

<style>
/* 草书效果相关样式 */
.center-cursive-text {
    font-family: 'Brush Script MT', cursive;
    font-size: 24px;
    color: black;
    text-align: center;
    margin: 20px 0;
    line-height: 1.5;
    cursor: default;
}

/* 重叠文字效果 */
.text-overlay-container {
    position: relative;
    height: 100px;
    margin: 20px 0;
}

.overlapping-text {
    position: absolute;
    width: 100%;
    font-family: 'Brush Script MT', cursive;
    font-size: 24px;
    text-align: center;
    color: black;
    opacity: 0.15;
    cursor: default;
}

/* 为每行文字设置不同的位置和透明度 */
.text-1 { top: 0; opacity: 0.8; }
.text-2 { top: 12px; opacity: 0.6; }
.text-3 { top: 24px; opacity: 0.4; }
.text-4 { top: 36px; opacity: 0.2; }
.text-5 { top: 48px; opacity: 0.1; }
.text-6 { top: 60px; color: transparent; }
</style>

<div class="center-cursive-text">
一片树林里分出两条路——
</div>

<div class="center-cursive-text">
而我选择了人来人往的一条，
</div>

<div class="center-cursive-text">
只看到了六道印迹。
</div>

<div class="text-overlay-container">
    <div class="overlapping-text text-1">脚印</div>
    <div class="overlapping-text text-2">脚印</div>
    <div class="overlapping-text text-3">脚印</div>
    <div class="overlapping-text text-4">脚印</div>
    <div class="overlapping-text text-5">脚印</div>
    <div class="overlapping-text text-6">脚印</div>
</div>
