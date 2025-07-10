class Game {
    constructor(level = 2) {
        this.level = level;
        this.BOARD_ROWS = 5; // 行数（从3→4→5）
        this.BOARD_COLS = 7; // 列数（从5→7）
        this.board = this.createEmptyBoard();
        this.hand = [];
        this.playerDeck = this.buildDeck(); // 根据关卡生成的卡组
        this.mana = 0;
        this.turn = 1;
        this.currentTurn = 'player'; // 当前回合玩家
        this.selectedHandCardIndex = null; // Index of the card selected in hand
        this.selectedBoardCard = null; // {x, y} of the card selected on board
        this.activeEnemyCardId = null; // 当前敌方AI正在操作的卡牌ID

        this.ui = new UI(this);
        this.ai = new AI(this);

        document.getElementById('end-turn-btn').addEventListener('click', () => this.endTurn());
        document.getElementById('sort-hand-btn').addEventListener('click', () => this.sortHand());
    }

    createEmptyBoard() {
        return Array(this.BOARD_ROWS).fill(null).map(() => Array(this.BOARD_COLS).fill(null));
    }

    buildDeck() {
        // 如果在 LEVEL_CONFIGS 中配置了卡组，则优先使用
        if (typeof LEVEL_CONFIGS !== 'undefined' && LEVEL_CONFIGS[this.level] && LEVEL_CONFIGS[this.level].deck) {
            return this.buildDeckFromList(LEVEL_CONFIGS[this.level].deck);
        }
        // 默认示例卡组
        const normalCardCount = 2;
        const rareCardCount = 1;
        const deck = [];
        // 原有卡牌
        // for (let i = 0; i < normalCardCount; i++) {
        //     deck.push('shadow'); // 影子
        // }
        for (let i = 0; i < rareCardCount; i++) {
            deck.push('lizard'); // 蜥蜴
        }
        // for (let i = 0; i < normalCardCount; i++) {
        //     deck.push('collector'); // 收藏家
        // }
        for (let i = 0; i < normalCardCount; i++) {
            deck.push('courier'); // 快递员
        }
        
        // 新增卡牌
        for (let i = 0; i < rareCardCount; i++) {
            deck.push('phantom_wolves'); // 幻影狼群
        }
        for (let i = 0; i < normalCardCount; i++) {
            deck.push('villager'); // 村民
        }
        for (let i = 0; i < normalCardCount; i++) {
            deck.push('swarm_bees'); // 群蜂
        }
        // for (let i = 0; i < normalCardCount; i++) {
        //     deck.push('squirrel_man'); // 松鼠人
        // }
        // for (let i = 0; i < rareCardCount; i++) {
        //     deck.push('soul_thief'); // 灵魂窃贼
        // }
        for (let i = 0; i < rareCardCount; i++) {
            deck.push('dragon_messenger'); // 龙信使
        }
        
        // 添加新卡牌
        // for (let i = 0; i < normalCardCount; i++) {
        //     deck.push('auto_cannon'); // 自走炮
        // }
        for (let i = 0; i < normalCardCount; i++) {
            deck.push('spiky_back'); // 刺刺背
        }
        // for (let i = 0; i < normalCardCount; i++) {
        //     deck.push('tactician'); // 策士
        // }
        for (let i = 0; i < normalCardCount; i++) {
            deck.push('iron_fist'); // 铁拳头
        }
        // for (let i = 0; i < normalCardCount; i++) {
        //     deck.push('dancer'); // 舞者
        // }

        // 添加buff系统卡牌
        // for (let i = 0; i < rareCardCount; i++) {
        //     deck.push('commander'); // 指挥官
        // }
        for (let i = 0; i < normalCardCount; i++) {
            deck.push('swift_bloom'); // 瞬息花
        }
        // for (let i = 0; i < normalCardCount; i++) {
        //     deck.push('growing_warrior'); // 渐强者
        // }
        
        return this.shuffle(deck);
    }

    // 根据稀有度自动补充卡牌数量
    buildDeckFromList(cardIds) {
        const normalCardCount = 2;
        const rareCardCount = 1;
        const deck = [];
        const rareSet = (typeof RARE_CARDS !== 'undefined') ? RARE_CARDS : new Set();
        for (const id of cardIds) {
            const count = rareSet.has(id) ? rareCardCount : normalCardCount;
            for (let i = 0; i < count; i++) {
                deck.push(id);
            }
        }
        return this.shuffle(deck);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    startGame() {
        // Place heroes
        const playerHero = createCard('squirrel_king', 'player');
        let enemyHeroId = 'swarm_queen';
        if (this.level === 1) {
            enemyHeroId = 'afk_carp';
        } else if (this.level === 3) {
            enemyHeroId = 'sword_saint';
        }
        const enemyHero = createCard(enemyHeroId, 'enemy');

        // 计算棋盘中心列，以及顶部/底部行，避免使用幻数
        const bottomRow = this.BOARD_ROWS - 1;
        const middleCol = Math.floor(this.BOARD_COLS / 2);

        // 在底部中间位置放置玩家英雄 / 顶部中间位置放置敌人英雄
        this.placeCard(playerHero, bottomRow, middleCol);
        this.placeCard(enemyHero, 0, middleCol);

        // Initial draw
        this.drawCard(3);
        this.addCardToHand(createCard('squirrel', 'player'));

        this.startPlayerTurn();
    }

    startPlayerTurn() {
        this.ui.showAnnouncement('你的回合');
        this.ui.log(`--- 第 ${this.turn} 回合 ---`);
        this.mana = 0;
        this.currentTurn = 'player';

        this.addCardToHand(createCard('squirrel', 'player'));
        this.drawCard(1);

        this.forEachBoardCard(card => {
            if (card.owner === 'player') {
                card.ap = card.maxAp;
                // 触发回合开始效果
                CardEffects.triggerOnTurnStart(this, card);
            }
        });

        // 检查并更新buff
        checkBuffs(this);
        this.ui.render();
    }

    endTurn() {
        // 触发回合结束效果
        this.forEachBoardCard(card => {
            if (card.owner === 'player' && card.effects && card.effects.onTurnEnd) {
                card.effects.onTurnEnd(this, card);
            }
        });
        
        this.deselectAll();
        this.ui.log('玩家结束回合。');
        this.startEnemyTurn();
    }

    async startEnemyTurn() {
        this.ui.showAnnouncement('敌方回合');
        this.currentTurn = 'enemy';
        
        this.forEachBoardCard(card => {
            if (card.owner === 'enemy' && card.isLocked) {
                card.lockTimer--;
                if (card.lockTimer <= 0) {
                    card.isLocked = false;
                    this.ui.log(`<span class="log-enemy">${card.name}</span> 的封锁解除了！`);
                }
            }
        });

        this.forEachBoardCard(card => {
            if (card.owner === 'enemy' && !card.isLocked) {
                card.ap = card.maxAp;
            }
        });
        // 触发敌方卡牌的回合开始效果
        this.forEachBoardCard(card => {
            if (card.owner === 'enemy') {
                CardEffects.triggerOnTurnStart(this, card);
            }
        });

        // 检查并更新buff
        checkBuffs(this);
        this.ui.render();

        await this.ai.takeTurn(); 
        
        this.turn++;
        this.spawnLockedEnemies();
        this.startPlayerTurn();
    }

    spawnLockedEnemies() {
        // 读取关卡刷怪配置
        const cfg = (typeof LEVEL_CONFIGS !== 'undefined' && LEVEL_CONFIGS[this.level])
            ? LEVEL_CONFIGS[this.level]
            : null;

        const spawnTurns = cfg ? cfg.spawnTurns : [2, 3, 4, 6, 7, 9];
        const spawnCounts = cfg ? cfg.spawnCounts : [1, 1, 2, 1, 2, 2];
        let enemyPool = cfg && cfg.enemyPool ? cfg.enemyPool : ['goblin', 'orc', 'axe_brute', 'stone_skin_boar'];
        // 若配置了阶段怪物池，则根据当前回合选择
        if (cfg && cfg.enemyStages) {
            for (const stage of cfg.enemyStages) {
                if (this.turn <= stage.maxTurn) {
                    enemyPool = stage.pool;
                    break;
                }
            }
        }

        const turnIdx = spawnTurns.indexOf(this.turn);
        if (turnIdx === -1) return; // 本回合无需刷怪

        const spawnCount = spawnCounts[turnIdx] ?? 1;

        // 收集空位
        const emptyCells = [];
        for (let r = 0; r < this.BOARD_ROWS; r++) {
            for (let c = 0; c < this.BOARD_COLS; c++) {
                if (!this.board[r][c]) {
                    emptyCells.push({ r, c });
                }
            }
        }

        for (let i = 0; i < spawnCount && emptyCells.length > 0; i++) {
            const randomIdx = Math.floor(Math.random() * emptyCells.length);
            const randomCell = emptyCells[randomIdx];

            const enemyCardId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            const enemy = createCard(enemyCardId, 'enemy');
            enemy.isLocked = true;
            enemy.lockTimer = enemy.lockTurns;
            this.placeCard(enemy, randomCell.r, randomCell.c);
            this.ui.log(`一个被封锁的 <span class="log-enemy">${enemy.name}</span> 出现了！它将在 ${enemy.lockTimer} 回合后解锁。`);

            emptyCells.splice(randomIdx, 1); // 移除已占用格子
        }
    }

    drawCard(count = 1) {
        for (let i = 0; i < count; i++) {
            if (this.playerDeck.length > 0) {
                const cardId = this.playerDeck.pop();
                this.addCardToHand(createCard(cardId, 'player'));
            } else {
                this.ui.log('玩家牌库已空！');
            }
        }
    }

    addCardToHand(card) {
        if (this.hand.length < 10) {
            this.hand.push(card);
        }
    }

    placeCard(card, r, c) {
        if (this.board[r][c]) return false;
        card.x = c;
        card.y = r;
        this.board[r][c] = card;
        
        // 触发打出效果
        CardEffects.triggerOnPlay(this, card);
        
        // 触发场上所有卡牌的场地变化效果
        this.forEachBoardCard(boardCard => {
            if (boardCard.effects && boardCard.effects.onBoardChange) {
                CardEffects.triggerOnBoardChange(this, boardCard);
            }
        });
        
        return true;
    }

    handleKill(killer, victim) {
        this.ui.log(`<span class="log-${victim.owner}">${victim.name}</span> 被击败了！`);
        this.board[victim.y][victim.x] = null;

        // 触发击杀效果
        if (killer) {
            CardEffects.triggerOnKill(this, killer, victim);
        }

        // 触发亡语效果
        CardEffects.triggerOnDeath(this, victim);
        
        // 当卡牌离场时，重新检查所有光环效果
        this.forEachBoardCard(card => {
            if (card.effects && card.effects.onBoardChange) {
                CardEffects.triggerOnBoardChange(this, card);
            }
        });
        
        // 检查并更新buff
        checkBuffs(this);

        this.checkForWinLoss();
    }

    damageCard(target, damage, attacker = null) {
        if (!target || damage <= 0) return;
        
        // 检查目标是否有伤害减免特性
        if (target.damageTaken) {
            damage = target.damageTaken(damage);
        }
        
        target.hp -= damage;

        // 为受伤的存活随从添加短暂红色闪烁动画
        if (target.hp > 0) {
            target.isDamaged = true;
            // 立即刷新棋盘以显示动画
            this.ui.renderBoard();
            // 动画结束后移除状态并再次刷新
            setTimeout(() => {
                target.isDamaged = false;
                this.ui.renderBoard();
            }, 300);
        }

        this.ui.log(`<span class="log-${target.owner}">${target.name}</span> 受到了 ${damage} 点伤害。`);
        
        if (target.hp <= 0) {
            // 先播放视觉死亡动画，再进行逻辑处理
            this.ui.animateCardDeath(target);
            this.handleKill(attacker, target);
        }
    }

    sortHand() {
        this.hand.sort((a, b) => a.cost - b.cost);
        this.ui.renderHand();
        this.ui.log('整理了手牌。');
    }

    moveCard(fromR, fromC, toR, toC) {
        if (!this.board[fromR][fromC] || this.board[toR][toC]) return;
        const card = this.board[fromR][fromC];
        this.board[toR][toC] = card;
        this.board[fromR][fromC] = null;
        
        // 保存原始坐标以便传递给onMove事件
        const originalX = card.x;
        const originalY = card.y;
        
        // 更新卡牌位置
        card.x = toC;
        card.y = toR;
        
        // 触发移动效果
        // UI 里已经触发过一次了, 这是一个奇怪的实现, 等待重构
        // 思路是把消耗行动点的逻辑放到 game.js 里, 而非 UI 里
        // CardEffects.triggerOnMove(this, card, fromR, fromC, toR, toC);

        // 触发位置改变后的效果
        CardEffects.triggerAfterPositionChanged(this, card);

        // 重新计算所有光环效果
        this.forEachBoardCard(boardCard => {
            if (boardCard.effects && boardCard.effects.onBoardChange) {
                CardEffects.triggerOnBoardChange(this, boardCard);
            }
        });

        // 检查并更新buff
        checkBuffs(this);
    }
    
    swapCards(r1, c1, r2, c2) {
        const card1 = this.board[r1][c1];
        const card2 = this.board[r2][c2];
        
        this.board[r1][c1] = card2;
        if (card2) {
            card2.x = c1;
            card2.y = r1;
        }
        
        this.board[r2][c2] = card1;
        if (card1) {
            card1.x = c2;
            card1.y = r2;
        }

        // 触发位置改变后的效果
        if (card1) CardEffects.triggerAfterPositionChanged(this, card1);
        if (card2) CardEffects.triggerAfterPositionChanged(this, card2);

        // 重新计算所有光环效果
        this.forEachBoardCard(boardCard => {
            if (boardCard.effects && boardCard.effects.onBoardChange) {
                CardEffects.triggerOnBoardChange(this, boardCard);
            }
        });

        // 检查并更新buff
        checkBuffs(this);
    }

    forEachBoardCard(callback) {
        for (let r = 0; r < this.BOARD_ROWS; r++) {
            for (let c = 0; c < this.BOARD_COLS; c++) {
                if (this.board[r][c]) {
                    callback(this.board[r][c], r, c);
                }
            }
        }
    }

    deselectAll() {
        this.selectedHandCardIndex = null;
        this.selectedBoardCard = null;
    }

    checkForWinLoss() {
        const playerHero = this.findHero('player');
        const enemyHero = this.findHero('enemy');

        if (!playerHero) {
            this.ui.showEndGamePopup('lose');
        } else if (!enemyHero) {
            this.ui.showEndGamePopup('win');
        }
    }

    findHero(owner) {
        let hero = null;
        this.forEachBoardCard(card => {
            if (card.isHero && card.owner === owner) {
                hero = card;
            }
        });
        return hero;
    }

    findCardOnBoard(cardId) {
        for (let r = 0; r < this.BOARD_ROWS; r++) {
            for (let c = 0; c < this.BOARD_COLS; c++) {
                if (this.board[r][c] && this.board[r][c].id === cardId) {
                    return this.board[r][c];
                }
            }
        }
        return null;
    }
}

function getLevelFromURL() {
    const params = new URLSearchParams(window.location.search);
    const lvl = parseInt(params.get('level'));
    return isNaN(lvl) ? 2 : lvl; // 默认第二关（蜂群女王）
}

document.addEventListener('DOMContentLoaded', () => {
    const level = getLevelFromURL();
    const game = new Game(level);
    game.startGame();
});