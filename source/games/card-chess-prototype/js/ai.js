class AI {
    constructor(game) {
        this.game = game;
    }

    async takeTurn() {
        this.game.ui.log('敌人回合...');
        const board = this.game.board;

        const aiCharacters = [];
        this.game.forEachBoardCard((card, r, c) => {
            if (card.owner === 'enemy' && !card.isLocked && card.ap > 0) {
                aiCharacters.push(card);
            }
        });

        const sleep = (ms) => new Promise(res => setTimeout(res, ms));

        for (const aiChar of aiCharacters) {
            // 设置当前操作的敌方卡牌ID并渲染高亮
            this.game.activeEnemyCardId = aiChar.id;
            this.game.ui.render();

            while (aiChar.ap > 0) {
                await sleep(700);

                const actionMade = this.performActionFor(aiChar, board);
                
                this.game.ui.render();

                if (!actionMade) {
                    break;
                }
            }

            // 清除高亮并重新渲染
            this.game.activeEnemyCardId = null;
            this.game.ui.render();
        }
        await sleep(500);
        this.game.ui.log('敌人回合结束。');
    }

    performActionFor(aiChar, board) {
        const playerCharacters = this.getCharacters('player', board);
        if (playerCharacters.length === 0) return false;

        const adjacentEnemies = this.getAdjacentCharacters(aiChar.y, aiChar.x, 'player', board);
        const killableEnemy = adjacentEnemies.find(enemy => enemy.hp <= aiChar.attack);

        if (killableEnemy) {
            this.attack(aiChar, killableEnemy);
            return true;
        }

        const nearestEnemy = this.findNearestCharacter(aiChar, playerCharacters);
        if (!nearestEnemy) return false;

        const bestMove = this.findBestMove(aiChar, nearestEnemy, board);

        if (bestMove) {
            this.move(aiChar, bestMove.r, bestMove.c);
            return true;
        }

        if (adjacentEnemies.length > 0) {
            this.attack(aiChar, adjacentEnemies[0]);
            return true;
        }
        
        return false;
    }

    attack(attacker, target) {
        // 使用damageCard函数代替直接扣血
        this.game.damageCard(target, attacker.attack, attacker);
        attacker.ap--;
        this.game.ui.log(`<span class="log-enemy">${attacker.name}</span> 攻击了 <span class="log-player">${target.name}</span>。`);
        
        // 触发攻击效果
        CardEffects.triggerOnAttack(this.game, attacker, target);
    }

    move(aiChar, toR, toC) {
        const fromR = aiChar.y;
        const fromC = aiChar.x;
        const targetCell = this.game.board[toR][toC];

        if (targetCell === null) {
            this.game.moveCard(fromR, fromC, toR, toC);
        } else if (targetCell.owner === 'enemy') {
            this.game.ui.log(`<span class="log-enemy">${aiChar.name}</span> 与 <span class="log-enemy">${targetCell.name}</span> 交换了位置。`);
            this.game.swapCards(fromR, fromC, toR, toC);
            
            CardEffects.triggerOnMove(this.game, aiChar, fromR, fromC, toR, toC);
        }
        
        aiChar.ap--;
    }

    findBestMove(aiChar, targetChar, board) {
        const fromR = aiChar.y;
        const fromC = aiChar.x;
        const startDist = this.getDistance(aiChar, targetChar);
        let bestMoves = [];
        let minDistance = startDist;

        const adjacentCells = this.getAdjacentCells(fromR, fromC);

        for (const cell of adjacentCells) {
            const { r, c } = cell;
            const occupant = board[r][c];

            // Can only move to empty cells or swap with non-hero allies (if stronger)
            if (occupant === null || (occupant.owner === 'enemy' && !occupant.isHero && aiChar.attack > occupant.attack)) {
                const dist = this.getDistance({ y: r, x: c }, targetChar);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestMoves = [{ r, c }];
                } else if (dist === minDistance) {
                    bestMoves.push({ r, c });
                }
            }
        }

        if (bestMoves.length > 0) {
            // 优先选择不会触发换位的移动（目标格为空）
            const preferredMoves = bestMoves.filter(move => board[move.r][move.c] === null);
            const candidates = preferredMoves.length > 0 ? preferredMoves : bestMoves;
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return null;
    }

    getCharacters(owner, board) {
        const characters = [];
        for (let r = 0; r < this.game.BOARD_ROWS; r++) {
            for (let c = 0; c < this.game.BOARD_COLS; c++) {
                if (board[r][c] && board[r][c].owner === owner) {
                    characters.push(board[r][c]);
                }
            }
        }
        return characters;
    }

    findNearestCharacter(fromChar, targetCharacters) {
        let nearest = null;
        let minDistance = Infinity;
        for (const target of targetCharacters) {
            const dist = this.getDistance(fromChar, target);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = target;
            }
        }
        return nearest;
    }

    getAdjacentCells(r, c) {
        const cells = [];
        if (r > 0) cells.push({ r: r - 1, c });
        if (r < this.game.BOARD_ROWS - 1) cells.push({ r: r + 1, c });
        if (c > 0) cells.push({ r, c: c - 1 });
        if (c < this.game.BOARD_COLS - 1) cells.push({ r, c: c + 1 });
        return cells;
    }
    
    getAdjacentCharacters(r, c, owner, board) {
        const adjacentCells = this.getAdjacentCells(r, c);
        const characters = [];
        for(const cell of adjacentCells) {
            const char = board[cell.r][cell.c];
            if(char && char.owner === owner) {
                characters.push(char);
            }
        }
        return characters;
    }

    getDistance(char1, char2) {
        return Math.abs(char1.x - char2.x) + Math.abs(char1.y - char2.y);
    }
}