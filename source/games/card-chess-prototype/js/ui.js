class UI {
    constructor(game) {
        this.game = game;
        this.boardElement = document.getElementById('board');
        this.handElement = document.getElementById('hand');
        this.manaElement = document.getElementById('mana-display');
        this.logElement = document.getElementById('log');
        // 新增：手牌数量显示元素
        this.handCountElement = document.getElementById('hand-count');
        this.announcementElement = null;
        this.announcementTimer = null;
    }

    render() {
        this.renderBoard();
        this.renderHand();
        this.updateHandCount();
        this.updateMana();
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        for (let r = 0; r < this.game.BOARD_ROWS; r++) {
            for (let c = 0; c < this.game.BOARD_COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                const cardData = this.game.board[r][c];
                if (cardData) {
                    const cardElement = this.createCardElement(cardData);
                    cell.appendChild(cardElement);
                    if (this.game.selectedBoardCard && this.game.selectedBoardCard.r === r && this.game.selectedBoardCard.c === c) {
                        cardElement.classList.add('selected');
                    }
                    // 如果这是敌方AI当前操作的卡牌，添加高亮
                    if (this.game.activeEnemyCardId && this.game.activeEnemyCardId === cardData.id) {
                        cardElement.classList.add('active-enemy');
                    }
                    if (cardData.owner === 'player') {
                        // 使玩家卡牌可拖拽
                        cardElement.setAttribute('draggable', true);
                        cardElement.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('text/plain', `board:${r}:${c}`);
                        });
                    }
                }

                this.boardElement.appendChild(cell);
            }
        }
        this.addBoardEventListeners();
    }

    renderHand() {
        this.handElement.innerHTML = '';
        this.game.hand.forEach((cardData, index) => {
            const cardElement = this.createCardElement(cardData);
            cardElement.dataset.handIndex = index;
            if (this.game.selectedHandCardIndex === index) {
                cardElement.classList.add('selected');
            }
            this.handElement.appendChild(cardElement);
        });
        this.addHandEventListeners();
    }

    createCardElement(cardData) {
        const card = document.createElement('div');
        card.className = `card ${cardData.owner}-card`;
        // 设置唯一ID以便后续查找
        card.dataset.cardId = cardData.id;

        // 若卡牌处于受伤状态，添加动画类
        if (cardData.isDamaged) {
            card.classList.add('damaged');
        }
        if (cardData.isHero) card.classList.add('hero');
        if (cardData.isLocked) card.classList.add('locked');

        // 获取卡牌显示信息，包括buff状态
        const displayInfo = getCardDisplayInfo(cardData);

        let infoHtml = `
            <div class="card-info">
                <div class="card-name">${cardData.name}</div>
                ${cardData.description ? `<div class="card-description">${cardData.description}</div>` : ''}
            </div>`;

        let statsHtml = `
            <div class="card-ap ${displayInfo && displayInfo.buffedProperties.ap ? 'buffed' : ''}">${cardData.ap}</div>
            <div class="card-attack ${displayInfo && displayInfo.buffedProperties.attack ? 'buffed' : ''}">${cardData.attack}</div>
            <div class="card-hp ${displayInfo && displayInfo.buffedProperties.hp ? 'buffed' : ''}">${cardData.hp}</div>
        `;

        if (cardData.x === null) { // Is in hand
            statsHtml += `<div class="card-cost">${cardData.cost}</div>`;
        }
        
        if (cardData.isLocked) {
            statsHtml += `<div class="lock-timer">${cardData.lockTimer}</div>`;
        }

        card.innerHTML = infoHtml + statsHtml;
        return card;
    }

    updateMana() {
        this.manaElement.textContent = `费用: ${this.game.mana}`;
    }

    log(message) {
        this.logElement.innerHTML += `<p>${message}</p>`;
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    addHandEventListeners() {
        this.handElement.querySelectorAll('.card').forEach(cardElement => {
            cardElement.addEventListener('click', (e) => {
                e.stopPropagation();
                const handIndex = parseInt(cardElement.dataset.handIndex);
                this.handleHandCardClick(handIndex);
            });

            // 使手牌可拖拽
            cardElement.setAttribute('draggable', true);
            cardElement.addEventListener('dragstart', (e) => {
                const handIndex = parseInt(cardElement.dataset.handIndex);
                e.dataTransfer.setData('text/plain', `hand:${handIndex}`);
            });
        });
    }

    addBoardEventListeners() {
        this.boardElement.querySelectorAll('.board-cell').forEach(cellElement => {
            cellElement.addEventListener('click', () => {
                const r = parseInt(cellElement.dataset.r);
                const c = parseInt(cellElement.dataset.c);
                this.handleBoardCellClick(r, c);
            });

            cellElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const r = parseInt(cellElement.dataset.r);
                const c = parseInt(cellElement.dataset.c);
                const card = this.game.board[r][c];
                if (card && card.owner === 'player' && !card.isHero) {
                    this.handleSacrifice(r, c);
                }
            });

            // 拖放事件：允许拖拽到格子上
            cellElement.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            cellElement.addEventListener('drop', (e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('text/plain');
                if (!data) return;

                const [type, p1, p2] = data.split(':');
                const targetR = parseInt(cellElement.dataset.r);
                const targetC = parseInt(cellElement.dataset.c);

                if (type === 'hand') {
                    const handIndex = parseInt(p1);
                    this.game.deselectAll();
                    this.game.selectedHandCardIndex = handIndex;
                    this.handleBoardCellClick(targetR, targetC);
                } else if (type === 'board') {
                    const fromR = parseInt(p1);
                    const fromC = parseInt(p2);

                    // 如果拖到自己原来的格子，则忽略
                    if (fromR === targetR && fromC === targetC) return;

                    this.game.deselectAll();
                    this.game.selectedBoardCard = { r: fromR, c: fromC };
                    this.handleBoardCellClick(targetR, targetC);
                }
            });
        });
    }

    handleSacrifice(r, c) {
        const card = this.game.board[r][c];
        this.log(`玩家献祭了 <span class="log-player">${card.name}</span>，获得 1 点费用。`);
        this.game.mana++;
        this.game.handleKill(null, card); // Treat sacrifice as a kill to trigger deathrattles
        this.game.deselectAll();
        this.render();
    }

    handleHandCardClick(index) {
        if (this.game.selectedHandCardIndex === index) {
            this.game.deselectAll();
        } else {
            this.game.deselectAll();
            this.game.selectedHandCardIndex = index;
        }
        this.render();
    }

    handleBoardCellClick(r, c) {
        const clickedCard = this.game.board[r][c];
        const selectedBoardCard = this.game.selectedBoardCard ? this.game.board[this.game.selectedBoardCard.r][this.game.selectedBoardCard.c] : null;

        // === 1. A hand card is selected, try to play it ===
        if (this.game.selectedHandCardIndex !== null) {
            if (!clickedCard) { // Can only play on empty cells
                const handCardIndex = this.game.selectedHandCardIndex;
                const handCard = this.game.hand[handCardIndex];
                if (this.game.mana >= handCard.cost) {
                    this.game.mana -= handCard.cost;
                    this.game.placeCard(handCard, r, c);
                    this.log(`玩家打出了 <span class="log-player">${handCard.name}</span>。`);
                    this.game.hand.splice(handCardIndex, 1);

                    // 触发战吼效果
                    // game 里已经触发过一次了, 这是一个奇怪的实现, 等待重构
                    // CardEffects.triggerOnPlay(this.game, handCard);
                } else {
                    this.log('费用不足！');
                }
            }
            this.game.deselectAll(); // Always deselect hand card after attempting to play
        }
        // === 2. A board card is selected, try to perform an action ===
        else if (selectedBoardCard) {
            const { r: fromR, c: fromC } = this.game.selectedBoardCard;
            let actionTaken = false;

            if (Math.abs(r - fromR) + Math.abs(c - fromC) === 1) {
                if (!clickedCard) {
                    // 检查是否触发移动特效
                    const noApCost = CardEffects.triggerOnMove(this.game, selectedBoardCard, fromR, fromC, r, c);
                    
                    if (noApCost) {
                        this.game.moveCard(fromR, fromC, r, c);
                        actionTaken = true;
                    } else if (selectedBoardCard.ap > 0) {
                        this.game.moveCard(fromR, fromC, r, c);
                        selectedBoardCard.ap--;
                        actionTaken = true;
                    } else { this.log('行动点不足，无法移动！'); }
                } else if (clickedCard.owner === 'player') {
                    // 检查是否触发换位特效
                    const noApCost = CardEffects.triggerOnSwap(this.game, selectedBoardCard, clickedCard);
                    
                    if (noApCost) {
                        this.game.swapCards(fromR, fromC, r, c);
                        actionTaken = true;
                    } else if (selectedBoardCard.ap > 0) {
                        this.game.swapCards(fromR, fromC, r, c);
                        selectedBoardCard.ap--;
                        this.log(`<span class="log-player">${selectedBoardCard.name}</span> 与 <span class="log-player">${clickedCard.name}</span> 交换了位置。`);
                        actionTaken = true;
                    } else { this.log('行动点不足，无法换位！'); }
                } else if (clickedCard.owner === 'enemy' && !clickedCard.isLocked) {
                    if (selectedBoardCard.ap > 0) {
                        // 使用damageCard函数代替直接扣血
                        this.game.damageCard(clickedCard, selectedBoardCard.attack, selectedBoardCard);
                        selectedBoardCard.ap--;
                        this.log(`<span class="log-player">${selectedBoardCard.name}</span> 攻击了 <span class="log-enemy">${clickedCard.name}</span>。`);
                        
                        // 触发攻击效果
                        CardEffects.triggerOnAttack(this.game, selectedBoardCard, clickedCard);
                        
                        actionTaken = true;
                    } else { this.log('行动点不足，无法攻击！'); }
                } else if (clickedCard.owner === 'enemy' && clickedCard.isLocked) {
                    if (selectedBoardCard.ap > 0) {
                        this.game.damageCard(clickedCard, selectedBoardCard.attack, selectedBoardCard);

                        // 解锁敌方卡牌
                        clickedCard.isLocked = false;
                        selectedBoardCard.ap--;
                        this.log(`<span class="log-player">${selectedBoardCard.name}</span> 攻击了 <span class="log-enemy">${clickedCard.name}</span>并解锁了它！`);
                        actionTaken = true;

                        // 触发攻击效果
                        CardEffects.triggerOnAttack(this.game, selectedBoardCard, clickedCard);
                    } else { this.log('行动点不足，无法解锁！'); }
                }
            }

            this.game.deselectAll();
            if (!actionTaken && clickedCard && clickedCard.owner === 'player') {
                this.game.selectedBoardCard = { r, c };
            }
        }
        // === 3. Nothing is selected, try to select a board card ===
        else if (clickedCard && clickedCard.owner === 'player') {
            this.game.selectedBoardCard = { r, c };
        }
        // === 4. Clicked on something else (deselect) ===
        else {
            this.game.deselectAll();
        }

        this.render();
    }

    // 更新手牌数量显示
    updateHandCount() {
        const count = this.game.hand.length;
        this.handCountElement.textContent = count >= 10 ? `手牌数量: ${count}（手牌已满！）` : `手牌数量: ${count}`;
    }

    // 播放死亡动画（灰度+碎裂）
    animateCardDeath(cardData) {
        // 在 DOM 中查找对应卡牌元素
        const cardEl = document.querySelector(`.card[data-card-id="${cardData.id}"]`);
        if (!cardEl) return; // 若未找到，直接返回

        // 计算在页面中的绝对位置
        const rect = cardEl.getBoundingClientRect();

        // 克隆节点以便与棋盘渲染解耦
        const overlay = cardEl.cloneNode(true);
        overlay.style.position = 'fixed';
        overlay.style.left = `${rect.left + rect.width * 2}px`;
        overlay.style.top = `${rect.top}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = 9999;
        overlay.classList.add('dying-effect');

        // 将覆盖元素添加到 body
        document.body.appendChild(overlay);

        // 先灰度，再碎裂
        setTimeout(() => {
            overlay.classList.add('shatter');
        }, 200);

        // 动画结束后移除覆盖元素并刷新棋盘显示
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            this.render();
        });
    }

    // 显示回合播报
    showAnnouncement(message) {
        if (!this.announcementElement) {
            this.announcementElement = document.createElement('div');
            this.announcementElement.id = 'turn-announcement';
            document.body.appendChild(this.announcementElement);
        }

        this.announcementElement.classList.remove('show');
        void this.announcementElement.offsetWidth; // 触发重排以重新播放动画

        this.announcementElement.textContent = message;
        this.announcementElement.classList.add('show');

        clearTimeout(this.announcementTimer);
        this.announcementTimer = setTimeout(() => {
            this.announcementElement.classList.remove('show');
        }, 500);
    }

    // 显示游戏结束弹窗（胜利或失败）
    showEndGamePopup(result) {
        // 移除已有弹窗，避免重复
        const existing = document.getElementById('end-game-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'end-game-overlay';
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';

        const messageEl = document.createElement('p');
        messageEl.textContent = result === 'win' ? '你赢了！' : '你输了！';

        const buttonEl = document.createElement('button');
        buttonEl.textContent = result === 'win' ? '选择关卡' : '重新开始';
        buttonEl.addEventListener('click', () => {
            if (result === 'win') {
                window.location.href = 'index.html';
            } else {
                window.location.reload();
            }
        });

        modal.appendChild(messageEl);
        modal.appendChild(buttonEl);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
}