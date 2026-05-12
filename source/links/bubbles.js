(() => {
  /* ═══════════════ 配置表 ═══════════════ */

  const DEFAULT_RADIUS = 78;

  // 图片泡泡：有头像，悬停/选中时显示 name
  const IMG_BUBBLES = [
    { name: "雾鸣",    url: "https://rubatotree.github.io/blog/",    image: "avatars/rubato.jpg",    color: "#feaf00", radius: 85, desc: "在这里写关于雾鸣的小作文。" },
    { name: "日奈",    url: "https://ri-nai.github.io/astro-blog/",    image: "avatars/rinai.jpg", color: "#8fd6b4", radius: 85, desc: "在这里写关于日奈的小作文。" },
    { name: "Rinevard",    url: "https://rinevard.github.io/",    image: "avatars/alula.jpg",    color: "#feaf00", radius: 85, desc: "这是我自己。" },
    // { name: "示例链接 3",    url: "https://example3.com",    image: "../images/learning/godot/angry_cow.jpg", color: "#7db5ff" },
    // { name: "范滇东的博客",  url: "https://blog.flwfdd.xyz/", image: "../images/others/random_thoughts/explore3/rubatotree_card.jpg", color: "#ef2f5f" },
    // { name: "周弈帆的博客",  url: "https://zhouyifan.net/",   image: "../images/learning/godot/tracy-final.png", color: "#d7a4ff", radius: 76 },
  ];

  // 文字泡泡：纯色背景，始终显示 text
  const TEXT_BUBBLES = [
    { text: ["单击放大", "双击拜访"], color: "#4a3f6b", radius: 90 },
    // { text: ["示例纯文字"], url: "https://github.com", color: "#8fd6b4", radius: 84 },
  ];

  /* ═══════════════ 泡泡初始化 ═══════════════ */

  const stage = document.getElementById("bubble-stage");
  const canvas = document.getElementById("bubble-canvas");
  const ctx = canvas.getContext("2d");
  const infoEl = document.getElementById("bubble-info");

  const CONFIG = {
    maxDevicePixelRatio: 2,
    minCanvasSize: 320,
    referenceWidth: 900,
    initialRadiusScale: 0.7,
    selectedScale: 1.82,
    hoverScale: 1.28,
    pressScale: 0.96,
    selectedHoverBoost: 1.08,
    wobbleInterval: 90,
    wobbleInitial: 3,
    wobbleDecay: 0.93,
    wobblePhaseSpeed: 0.2,
    wobblePhaseBase: 3,
    wobbleAmplitude: 0.2,
    wobbleStagger: 15,
    radiusSpring: 0.025,
    radiusDragSpringBonus: 0.1,
    radiusDamping: 0.6,
    radiusSelectedDampingBonus: 0.1,
    radiusCollisionImpulse: 0.5,
    minRadius: 1,
    velocityFriction: 0.985,
    wallBounce: 0.45,
    tapMoveThreshold: 7,
    tapMaxDurationMs: 520,
    doubleTapMs: 360,
    maxFrameDelta: 2.4,
    frameMs: 16.67,
    minDistance: 0.001,
    dragVelocityMinDelta: 1,
    collisionVelocityScale: 1,
    lineCenterFactor: 0.5,
    imagePadding: 7,
    infoFontScale: 0.2,
    infoLineHeightScale: 0.22,
    labelFontScale: 0.26,
    labelStrokeWidth: 5,
    labelStrokeStyle: "rgba(33, 28, 48, 0.76)",
    stageFillStyle: "#ffffff",
    infoTextStyle: "#fff7be",
    pointerIdlePosition: -1000
  };

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    hovered: null,
    selected: null,
    dragged: null,
    pointer: {
      id: null,
      x: CONFIG.pointerIdlePosition,
      y: CONFIG.pointerIdlePosition,
      downX: 0,
      downY: 0,
      lastX: 0,
      lastY: 0,
      downTime: 0,
      moved: false
    },
    lastTapBubble: null,
    lastTapTime: 0,
    lastTime: performance.now(),
    wobbleTimer: 0
  };

  const bubbles = [...IMG_BUBBLES, ...TEXT_BUBBLES].map((entry, index) => {
    const radius = entry.radius || DEFAULT_RADIUS;
    const img = new Image();
    if (entry.image) {
      img.src = entry.image;
    }

    return {
      name: entry.name || "",
      url: entry.url || "",
      desc: entry.desc || "",
      text: entry.text || null,
      color: entry.color || "#888888",
      image: entry.image ? img : null,
      index,
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      vx: 0,
      vy: 0,
      baseRadius: radius,
      radius,
      currentRadius: radius * Math.random() * CONFIG.initialRadiusScale,
      targetRadius: radius,
      radiusSpeed: 0,
      selectedScale: CONFIG.selectedScale,
      hoverScale: CONFIG.hoverScale,
      pressScale: CONFIG.pressScale,
      wobble: 0,
      wobbleDelay: 0,
      wobblePhase: Math.random() * 360
    };
  });

  function resize() {
    const rect = stage.getBoundingClientRect();
    const oldWidth = state.width || rect.width;
    const oldHeight = state.height || rect.height;

    state.width = Math.max(CONFIG.minCanvasSize, Math.floor(rect.width));
    state.height = Math.max(CONFIG.minCanvasSize, Math.floor(rect.height));
    state.dpr = Math.min(CONFIG.maxDevicePixelRatio, window.devicePixelRatio || 1);

    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    for (const bubble of bubbles) {
      const radiusScale = Math.max(0.6, Math.min(1, state.width / CONFIG.referenceWidth));
      bubble.radius = bubble.baseRadius * radiusScale;
      if (bubble.ready) {
        bubble.x = bubble.x / oldWidth * state.width;
        bubble.y = bubble.y / oldHeight * state.height;
      } else {
        bubble.x = bubble.x * state.width;
        bubble.y = bubble.y * state.height;
        bubble.ready = true;
      }
      keepInside(bubble);
    }
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function bubbleAt(x, y) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const bubble = bubbles[i];
      if (distance(x, y, bubble.x, bubble.y) <= bubble.currentRadius) {
        return bubble;
      }
    }
    return null;
  }

  function keepInside(bubble) {
    const radius = bubble.currentRadius || bubble.radius;
    if (bubble.x < radius) {
      bubble.x = radius;
      if (bubble.vx < 0) bubble.vx *= -CONFIG.wallBounce;
    }
    if (bubble.x > state.width - radius) {
      bubble.x = state.width - radius;
      if (bubble.vx > 0) bubble.vx *= -CONFIG.wallBounce;
    }
    if (bubble.y < radius) {
      bubble.y = radius;
      if (bubble.vy < 0) bubble.vy *= -CONFIG.wallBounce;
    }
    if (bubble.y > state.height - radius) {
      bubble.y = state.height - radius;
      if (bubble.vy > 0) bubble.vy *= -CONFIG.wallBounce;
    }
  }

  function setSelected(bubble) {
    if (state.selected && state.selected !== bubble) {
      state.selected.selected = false;
    }
    state.selected = bubble;
    bubble.selected = true;
    updateInfo();
  }

  function updateInfo() {
    if (!infoEl) return;
    const b = state.selected;
    if (b && (b.name || b.desc)) {
      const title = b.name ? `<strong>${b.name}</strong>` : "";
      const desc = b.desc ? `<p>${b.desc}</p>` : "";
      infoEl.innerHTML = title + desc;
      infoEl.style.display = "block";
    } else {
      infoEl.innerHTML = "";
      infoEl.style.display = "none";
    }
  }

  function handleTap(bubble) {
    const now = performance.now();
    const isDoubleTap = state.lastTapBubble === bubble && now - state.lastTapTime < CONFIG.doubleTapMs;

    if (isDoubleTap && bubble.url) {
      window.open(bubble.url, "_blank", "noopener");
      state.lastTapBubble = null;
      state.lastTapTime = 0;
      return;
    }

    if (state.selected === bubble) {
      state.selected.selected = false;
      state.selected = null;
      updateInfo();
    } else {
      setSelected(bubble);
    }
    state.lastTapBubble = bubble;
    state.lastTapTime = now;
  }

  function onPointerDown(event) {
    const point = eventPoint(event);
    const bubble = bubbleAt(point.x, point.y);

    state.pointer.id = event.pointerId;
    state.pointer.x = point.x;
    state.pointer.y = point.y;
    state.pointer.downX = point.x;
    state.pointer.downY = point.y;
    state.pointer.lastX = point.x;
    state.pointer.lastY = point.y;
    state.pointer.downTime = performance.now();
    state.pointer.moved = false;

    if (!bubble) {
      return;
    }

    state.dragged = bubble;
    bubble.dragged = true;
    bubble.grabX = bubble.x - point.x;
    bubble.grabY = bubble.y - point.y;
    bubble.vx = 0;
    bubble.vy = 0;
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const point = eventPoint(event);
    state.pointer.x = point.x;
    state.pointer.y = point.y;

    if (state.dragged) {
      const movedDistance = distance(point.x, point.y, state.pointer.downX, state.pointer.downY);
      state.pointer.moved = state.pointer.moved || movedDistance > CONFIG.tapMoveThreshold;
    } else {
      state.hovered = bubbleAt(point.x, point.y);
    }
  }

  function onPointerUp(event) {
    if (state.pointer.id !== event.pointerId) {
      return;
    }

    const point = eventPoint(event);
    const bubble = state.dragged;

    if (bubble) {
      bubble.dragged = false;
      state.dragged = null;

      const duration = performance.now() - state.pointer.downTime;
      const movedDistance = distance(point.x, point.y, state.pointer.downX, state.pointer.downY);
      const isTap = movedDistance <= CONFIG.tapMoveThreshold && duration < CONFIG.tapMaxDurationMs;

      if (isTap) {
        handleTap(bubble);
      }
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    state.pointer.id = null;
    state.hovered = bubbleAt(point.x, point.y);
  }

  function onPointerCancel(event) {
    if (state.dragged) {
      state.dragged.dragged = false;
      state.dragged = null;
    }
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.pointer.id = null;
  }

  function updateDragged(dt) {
    const bubble = state.dragged;
    if (!bubble) {
      return;
    }

    const targetRadius = bubble.currentRadius || bubble.radius;
    const targetX = Math.min(
      state.width - targetRadius,
      Math.max(targetRadius, state.pointer.x + bubble.grabX)
    );
    const targetY = Math.min(
      state.height - targetRadius,
      Math.max(targetRadius, state.pointer.y + bubble.grabY)
    );

    const oldX = bubble.x;
    const oldY = bubble.y;
    bubble.x = targetX;
    bubble.y = targetY;
    bubble.vx = (bubble.x - oldX) / Math.max(CONFIG.dragVelocityMinDelta, dt);
    bubble.vy = (bubble.y - oldY) / Math.max(CONFIG.dragVelocityMinDelta, dt);
  }

  function collide(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDistance = a.currentRadius + b.currentRadius;
    const actualDistance = Math.max(CONFIG.minDistance, Math.hypot(dx, dy));

    if (actualDistance >= minDistance) {
      return;
    }

    const overlap = minDistance - actualDistance;
    const nx = dx / actualDistance;
    const ny = dy / actualDistance;
    const totalMass = a.currentRadius * a.currentRadius + b.currentRadius * b.currentRadius;
    const aShare = totalMass > 0 ? b.currentRadius * b.currentRadius / totalMass : CONFIG.lineCenterFactor;
    const bShare = totalMass > 0 ? a.currentRadius * a.currentRadius / totalMass : CONFIG.lineCenterFactor;
    const radiusImpulse = -overlap * CONFIG.radiusCollisionImpulse;
    const velocityImpulse = actualDistance * overlap / minDistance * CONFIG.collisionVelocityScale;
    const impulseX = nx * velocityImpulse;
    const impulseY = ny * velocityImpulse;

    a.vx -= impulseX * aShare;
    a.vy -= impulseY * aShare;
    b.vx += impulseX * bShare;
    b.vy += impulseY * bShare;
    a.radiusSpeed += radiusImpulse * aShare;
    b.radiusSpeed += radiusImpulse * bShare;
  }

  function update(dt) {
    if (!state.dragged) {
      state.hovered = bubbleAt(state.pointer.x, state.pointer.y);
    }

    // auto wobble
    if (!state.dragged) {
      state.wobbleTimer -= dt;
      if (state.wobbleTimer <= 0) {
        const count = 1 + Math.floor(Math.random() * Math.min(3, bubbles.length));
        for (let i = 0; i < count; i++) {
          const b = bubbles[Math.floor(Math.random() * bubbles.length)];
          b.wobbleDelay = i * CONFIG.wobbleStagger;
        }
        state.wobbleTimer = CONFIG.wobbleInterval + Math.random() * CONFIG.wobbleInterval;
      }
    }

    for (const bubble of bubbles) {
      const isHovered = bubble === state.hovered;
      const isSelected = bubble === state.selected;
      const isDragged = bubble === state.dragged;
      let scale = isSelected ? bubble.selectedScale : 1;

      if (isHovered && !isDragged) {
        scale = isSelected ? scale * CONFIG.selectedHoverBoost : bubble.hoverScale;
      }
      if (isDragged) {
        scale *= bubble.pressScale;
      }

      // wobble
      if (bubble.wobbleDelay > 0) {
        bubble.wobbleDelay -= dt;
        if (bubble.wobbleDelay <= 0) {
          bubble.wobble = CONFIG.wobbleInitial;
          bubble.wobblePhase = 90;
        }
      }
      bubble.wobble *= CONFIG.wobbleDecay;
      bubble.wobblePhase += CONFIG.wobblePhaseSpeed * bubble.wobble + CONFIG.wobblePhaseBase;
      const wobbleOffset = Math.cos(bubble.wobblePhase * Math.PI / 180) * bubble.wobble * CONFIG.wobbleAmplitude * bubble.radius;

      bubble.targetRadius = bubble.radius * scale + wobbleOffset;
    }

    updateDragged(dt);

    for (const bubble of bubbles) {
      if (!bubble.dragged) {
        bubble.vx *= CONFIG.velocityFriction;
        bubble.vy *= CONFIG.velocityFriction;
        bubble.x += bubble.vx * dt;
        bubble.y += bubble.vy * dt;
      }
    }

    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        collide(bubbles[i], bubbles[j]);
      }
    }

    for (const bubble of bubbles) {
      keepInside(bubble);
    }

    for (const bubble of bubbles) {
      const spring = CONFIG.radiusSpring + (bubble.dragged ? CONFIG.radiusDragSpringBonus : 0);
      const damping = CONFIG.radiusDamping + (bubble.selected ? CONFIG.radiusSelectedDampingBonus : 0);
      bubble.radiusSpeed += (bubble.targetRadius - bubble.currentRadius) * spring;
      bubble.radiusSpeed *= damping;
      bubble.currentRadius += bubble.radiusSpeed;

      if (bubble.currentRadius < CONFIG.minRadius) {
        bubble.currentRadius = CONFIG.minRadius;
        bubble.radiusSpeed = Math.max(0, bubble.radiusSpeed);
      }

      keepInside(bubble);
    }

    canvas.style.cursor = state.hovered || state.dragged ? "pointer" : "default";
  }

  function drawBubble(bubble) {
    const radius = bubble.currentRadius;
    const clipRadius = Math.max(CONFIG.minRadius, radius - CONFIG.imagePadding);

    ctx.save();
    ctx.translate(bubble.x, bubble.y);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, clipRadius, 0, Math.PI * 2);
    ctx.clip();

    if (bubble.image && bubble.image.complete && bubble.image.naturalWidth > 0) {
      const ratio = bubble.image.naturalWidth / bubble.image.naturalHeight;
      const size = clipRadius * 2;
      let width = size;
      let height = size;

      if (ratio > 1) {
        width = size * ratio;
      } else {
        height = size / ratio;
      }

      ctx.drawImage(bubble.image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = bubble.color;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    }

    ctx.restore();

    if (bubble === state.hovered || bubble === state.selected || bubble.text) {
      drawBubbleText(bubble, radius);
    }

    ctx.restore();
  }

  function drawBubbleText(bubble, radius) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (bubble.text) {
      ctx.fillStyle = "#fff7be";
      ctx.font = `600 ${radius * CONFIG.infoFontScale}px Microsoft YaHei, sans-serif`;
      const lineHeight = radius * CONFIG.infoLineHeightScale;
      const startY = -lineHeight * (bubble.text.length - 1) * CONFIG.lineCenterFactor;
      bubble.text.forEach((line, index) => {
        ctx.fillText(line, 0, startY + index * lineHeight);
      });
      return;
    }

    const label = bubble.name;
    const fontSize = radius * CONFIG.labelFontScale;
    ctx.font = `600 ${fontSize}px Microsoft YaHei, sans-serif`;
    ctx.lineWidth = CONFIG.labelStrokeWidth;
    ctx.strokeStyle = CONFIG.labelStrokeStyle;
    ctx.fillStyle = CONFIG.infoTextStyle;
    ctx.strokeText(label, 0, 0);
    ctx.fillText(label, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = CONFIG.stageFillStyle;
    ctx.fillRect(0, 0, state.width, state.height);

    bubbles
      .slice()
      .sort((a, b) => a.y - b.y)
      .forEach(drawBubble);
  }

  function frame(now) {
    const dt = Math.min(CONFIG.maxFrameDelta, (now - state.lastTime) / CONFIG.frameMs);
    state.lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("pointerleave", () => {
    if (!state.dragged) {
      state.hovered = null;
    }
  });

  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(frame);
})();
