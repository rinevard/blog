const CARD_DEFINITIONS = {
    // Player Heroes
    'squirrel_king': {
        name: '松鼠大王',
        type: 'hero',
        cost: 0,
        ap: 1,
        attack: 1,
        hp: 20,
        description: '击杀敌人后，将一张松鼠牌置入手中。',
        isHero: true,
        owner: 'player',
        effects: {
            onKill: (game, card, victim) => {
                game.addCardToHand(createCard('squirrel', 'player'));
                game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，将一张松鼠牌置入手中！`);
            }
        }
    },

    // Enemy Heroes
    'sword_saint': {
        name: '剑圣',
        type: 'hero',
        cost: 0,
        ap: 2,
        attack: 2,
        hp: 30,
        description: '击杀敌人后，获得1行动点。',
        isHero: true,
        owner: 'enemy',
        effects: {
            onKill: (game, card, victim) => {
                card.ap++;
                game.ui.log(`<span class="log-enemy">${card.name}</span> 的能力触发，获得 1 行动点！`);
            }
        }
    },
    // 新增敌方英雄：蜂群女王
    'swarm_queen': {
        name: '蜂群女王',
        type: 'hero',
        cost: 0,
        ap: 1,
        attack: 2,
        hp: 30,
        description: '回合开始时，在一个相邻空位召唤一只无人机。',
        isHero: true,
        owner: 'enemy',
        effects: {
            onTurnStart: (game, card) => {
                // 左右上下
                const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                const emptyCells = [];
                for (const [dr, dc] of directions) {
                    const newR = card.y + dr;
                    const newC = card.x + dc;
                    if (newR >= 0 && newR < game.BOARD_ROWS && newC >= 0 && newC < game.BOARD_COLS && !game.board[newR][newC]) {
                        emptyCells.push({ r: newR, c: newC });
                    }
                }
                if (emptyCells.length > 0) {
                    const spawn = emptyCells[0];
                    const drone = createCard('drone', 'enemy');
                    game.placeCard(drone, spawn.r, spawn.c);
                    game.ui.log(`<span class="log-enemy">${card.name}</span> 召唤了一只 <span class="log-enemy">无人机</span>！`);
                }
            }
        }
    },
    'afk_carp': {
        name: '睡鱼',
        type: 'hero',
        cost: 0,
        ap: 1,
        attack: 1,
        hp: 15,
        description: '回合开始时，对相邻敌人造成 2 点伤害。',
        isHero: true,
        owner: 'enemy',
        effects: {
            onTurnStart: (game, card) => {
                const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                for (const [dr, dc] of directions) {
                    const r = card.y + dr;
                    const c = card.x + dc;
                    if (r >= 0 && r < game.BOARD_ROWS && c >= 0 && c < game.BOARD_COLS) {
                        const target = game.board[r][c];
                        if (target && target.owner === 'player') {
                            game.damageCard(target, 2, card);
                        }
                    }
                }
            }
        }
    },

    // Player Minions
    'squirrel': {
        name: '松鼠',
        type: 'minion',
        cost: 0,
        ap: 0,
        attack: 0,
        hp: 1,
        description: '',
        owner: 'player'
    },
    'shadow': {
        name: '影子',
        type: 'minion',
        cost: 1,
        ap: 1,
        attack: 1,
        hp: 5,
        description: '每回合第一次换位不消耗行动点。',
        owner: 'player',
        effects: {
            onTurnStart: (game, card) => {
                card.hasSwappedThisTurn = false;
            },
            onSwap: (game, card, targetCard) => {
                if (card.hasSwappedThisTurn === false) {
                    card.hasSwappedThisTurn = true;
                    game.ui.log(`<span class="log-player">${card.name}</span> 的特殊能力触发，本次换位不消耗行动点！`);
                    return true; // 不消耗行动点
                }
                return false; // 消耗行动点
            }
        },
        initialize: (instance) => {
            instance.hasSwappedThisTurn = false;
        }
    },

    // --- New Player Minions ---
    'lizard': {
        name: '蜥蜴',
        type: 'minion',
        cost: 0,
        ap: 1,
        attack: 1,
        hp: 1,
        description: '',
        owner: 'player'
    },
    'collector': {
        name: '收藏家',
        type: 'minion',
        cost: 1,
        ap: 1,
        attack: 1,
        hp: 3,
        description: '亡语：抽一张牌。',
        owner: 'player',
        effects: {
            onDeath: (game, card) => {
                game.drawCard(1);
                game.ui.log(`<span class="log-player">${card.name}</span> 的亡语触发，抽一张牌！`);
            }
        }
    },
    'courier': {
        name: '快递员',
        type: 'minion',
        cost: 1,
        ap: 1,
        attack: 1,
        hp: 2,
        description: '战吼：抽一张牌。',
        owner: 'player',
        effects: {
            onPlay: (game, card) => {
                game.drawCard(1);
                game.ui.log(`<span class="log-player">${card.name}</span> 的战吼触发，抽一张牌！`);
            }
        }
    },

    // --- 新增卡牌 ---
    'phantom_wolves': {
        name: '幻影狼群',
        type: 'minion',
        cost: 4,
        ap: 3,
        attack: 2,
        hp: 4,
        description: '攻击后，下一次移动不消耗行动点（可叠加）。',
        owner: 'player',
        effects: {
            onTurnStart: (game, card) => {
                card.freeMovesCount = card.freeMovesCount || 0;
            },
            onAttack: (game, card, target) => {
                card.freeMovesCount = (card.freeMovesCount || 0) + 1;
                game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，获得一次免费移动！剩余 ${card.freeMovesCount} 次免费移动。`);
            },
            onMove: (game, card, fromR, fromC, toR, toC) => {
                if (card.freeMovesCount && card.freeMovesCount > 0) {
                    card.freeMovesCount--;
                    game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，本次移动不消耗行动点！剩余 ${card.freeMovesCount} 次免费移动。`);
                    return true; // 不消耗行动点
                }
                return false; // 消耗行动点
            }
        },
        initialize: (instance) => {
            instance.freeMovesCount = 0;
        }
    },
    'villager': {
        name: '村民',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 2,
        hp: 2,
        description: '亡语：召唤一只附身兽。',
        owner: 'player',
        effects: {
            onDeath: (game, card) => {
                // 寻找附近的空位
                const adjacentEmptyCells = [];
                const directions = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];

                for (const [dr, dc] of directions) {
                    const newR = card.y + dr;
                    const newC = card.x + dc;

                    if (newR >= 0 && newR < game.BOARD_ROWS && newC >= 0 && newC < game.BOARD_COLS && !game.board[newR][newC]) {
                        adjacentEmptyCells.push({ r: newR, c: newC });
                    }
                }

                if (adjacentEmptyCells.length > 0) {
                    const spawnCell = adjacentEmptyCells[0];
                    const possessed = createCard('possessed_beast', 'player');
                    game.placeCard(possessed, spawnCell.r, spawnCell.c);
                    game.ui.log(`<span class="log-player">${card.name}</span> 的亡语触发，召唤了一只 <span class="log-player">附身兽</span>！`);
                }
            }
        }
    },
    'possessed_beast': {
        name: '附身兽',
        type: 'minion',
        cost: 1,
        ap: 1,
        attack: 2,
        hp: 2,
        description: '',
        owner: 'player'
    },
    'swarm_bees': {
        name: '群蜂',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 1,
        hp: 1,
        description: '战吼：在左右空位召唤自身复制。',
        owner: 'player',
        effects: {
            onPlay: (game, card) => {
                if (card.isCopy) {
                    return;
                }
                const directions = [[0, -1], [0, 1]]; // 左右方向

                for (const [dr, dc] of directions) {
                    const newR = card.y + dr;
                    const newC = card.x + dc;

                    if (newC >= 0 && newC < game.BOARD_COLS && !game.board[newR][newC]) {
                        const copy = createCard('swarm_bees', 'player');
                        copy.isCopy = true; // 标记为复制，避免无限触发
                        game.placeCard(copy, newR, newC);
                        game.ui.log(`<span class="log-player">${card.name}</span> 的战吼触发，召唤了一只复制！`);
                    }
                }
            }
        },
        initialize: (instance) => {
            // 如果是复制，删除onPlay效果避免无限触发
            if (instance.isCopy) {
                delete instance.effects.onPlay;
            }
        }
    },
    'squirrel_man': {
        name: '松鼠人',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 3,
        hp: 3,
        description: '亡语：将一张松鼠置入手牌。',
        owner: 'player',
        effects: {
            onDeath: (game, card) => {
                game.addCardToHand(createCard('squirrel', 'player'));
                game.ui.log(`<span class="log-player">${card.name}</span> 的亡语触发，将一张松鼠牌置入手中！`);
            }
        }
    },
    'soul_thief': {
        name: '窃灵',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 2,
        hp: 3,
        description: '友方角色死亡后，在本回合获得1行动点。',
        owner: 'player',
        effects: {
            onAllyDeath: (game, card, deadAlly) => {
                card.ap++;
                game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，获得 1 行动点！`);
            }
        }
    },
    'dragon_messenger': {
        name: '龙信使',
        type: 'minion',
        cost: 4,
        ap: 1,
        attack: 7,
        hp: 10,
        description: '战吼：手中所有牌费用-1。',
        owner: 'player',
        effects: {
            onPlay: (game, card) => {
                let reducedCount = 0;
                game.hand.forEach(handCard => {
                    if (handCard.cost > 0) {
                        handCard.cost--;
                        reducedCount++;
                    }
                });
                game.ui.log(`<span class="log-player">${card.name}</span> 的战吼触发，手牌费用降低！`);
                game.ui.renderHand();
            }
        }
    },

    // 新增卡牌
    'auto_cannon': {
        name: '自走炮',
        type: 'minion',
        cost: 1,
        ap: 1,
        attack: 1,
        hp: 4,
        description: '回合结束后，对生命值最低的敌人造成1点伤害。',
        owner: 'player',
        effects: {
            onTurnEnd: (game, card) => {
                // 查找生命值最低的敌人
                let lowestHpEnemy = null;
                game.forEachBoardCard(enemy => {
                    if (enemy.owner === 'enemy') {
                        if (!lowestHpEnemy || enemy.hp < lowestHpEnemy.hp) {
                            lowestHpEnemy = enemy;
                        }
                    }
                });

                // 造成1点伤害
                if (lowestHpEnemy) {
                    game.damageCard(lowestHpEnemy, 1, card);
                    game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，对 <span class="log-enemy">${lowestHpEnemy.name}</span> 造成1点伤害！`);
                }
            }
        }
    },
    'spiky_back': {
        name: '刺刺背',
        type: 'minion',
        cost: 2,
        ap: 2,
        attack: 2,
        hp: 3,
        description: '每回合的第二次攻击造成双倍伤害。',
        owner: 'player',
        effects: {
            onTurnStart: (game, card) => {
                card.attackCount = 0;
            },
            onAttack: (game, card, target) => {
                card.attackCount = (card.attackCount || 0) + 1;

                // 如果是第二次攻击，造成双倍伤害
                if (card.attackCount === 2) {
                    // 额外造成和攻击力相同的伤害
                    game.damageCard(target, card.attack, card);
                    game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，造成双倍伤害！`);
                }
            }
        },
        initialize: (instance) => {
            instance.attackCount = 0;
        }
    },
    'tactician': {
        name: '策士',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 2,
        hp: 3,
        description: '战吼：手牌中消耗为1的牌消耗变为0。',
        owner: 'player',
        effects: {
            onPlay: (game, card) => {
                let reducedCount = 0;
                game.hand.forEach(handCard => {
                    if (handCard.cost === 1) {
                        handCard.cost = 0;
                        reducedCount++;
                    }
                });
                if (reducedCount > 0) {
                    game.ui.log(`<span class="log-player">${card.name}</span> 的战吼触发，${reducedCount}张费用为1的手牌费用变为0！`);
                    game.ui.renderHand();
                }
            }
        }
    },

    // 新增buff系统卡牌
    'commander': {
        name: '指挥官',
        type: 'minion',
        cost: 4,
        ap: 1,
        attack: 1,
        hp: 8,
        description: '其他友方角色行动点+1',
        owner: 'player',
        effects: {
            onBoardChange: (game, card) => {
                // 当场上有卡牌变化时(新卡牌上场)，重新应用光环效果
                game.forEachBoardCard(target => {
                    if (target.owner === 'player' && target.id !== card.id) {
                        // 检查是否已经有该光环buff
                        const hasAura = target.buffs && target.buffs.some(b => b.sourceId === card.id && b.type === 'aura');
                        if (!hasAura) {
                            applyBuff(target, {
                                sourceId: card.id,
                                sourceName: card.name,
                                property: 'ap',
                                value: 1,
                                type: 'aura',
                                expireCondition: (game, buffedCard, buff) => {
                                    return !game.findCardOnBoard(buff.sourceId);
                                }
                            });
                            applyBuff(target, {
                                sourceId: card.id,
                                sourceName: card.name,
                                property: 'maxAp',
                                value: 1,
                                type: 'aura',
                                // 光环效果，在源卡牌离场时失效
                                expireCondition: (game, buffedCard, buff) => {
                                    return !game.findCardOnBoard(buff.sourceId);
                                }
                            });
                            game.ui.log(`onBoardChange: <span class="log-player">${target.name}</span> 获得了 <span class="log-player">${card.name}</span> 的光环加成！`);
                        }
                    }
                });
            }
        }
    },
    'swift_bloom': {
        name: '瞬息花',
        type: 'minion',
        cost: 1,
        ap: 1,
        attack: 1,
        hp: 2,
        description: '战吼：本回合行动点+1',
        owner: 'player',
        effects: {
            onPlay: (game, card) => {
                // 给自己添加一个回合结束失效的ap+1 buff
                applyBuff(card, {
                    sourceId: card.id,
                    sourceName: card.name,
                    property: 'ap',
                    value: 1,
                    type: 'temporary',
                    // 回合结束时失效
                    expireCondition: (game, buffedCard, buff) => {
                        return game.currentTurn !== buffedCard.owner;
                    }
                });
                game.ui.log(`<span class="log-player">${card.name}</span> 的战吼触发，本回合行动点+1！`);
            }
        }
    },
    'growing_warrior': {
        name: '渐强者',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 2,
        hp: 5,
        description: '攻击后，攻击力+1',
        owner: 'player',
        effects: {
            onAttack: (game, card, target) => {
                // 添加永久性攻击力提升
                applyBuff(card, {
                    sourceId: card.id,
                    sourceName: card.name,
                    property: 'attack',
                    value: 1,
                    type: 'permanent',
                    // 永久buff没有失效条件
                    expireCondition: null
                });
                game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，攻击力永久+1！`);
            }
        }
    },
    'iron_fist': {
        name: '铁拳头',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 2,
        hp: 3,
        description: '相邻友方角色攻击力+1。',
        owner: 'player',
        effects: {
            // 光环：相邻友方角色攻击力+1
            onBoardChange: (game, card) => {
                const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                directions.forEach(([dr, dc]) => {
                    const r = card.y + dr;
                    const c = card.x + dc;
                    if (r >= 0 && r < game.BOARD_ROWS && c >= 0 && c < game.BOARD_COLS) {
                        const target = game.board[r][c];
                        if (target && target.owner === 'player' && target.id !== card.id) {
                            const hasAura = target.buffs && target.buffs.some(b => b.sourceId === card.id && b.type === 'aura');
                            if (!hasAura) {
                                applyBuff(target, {
                                    sourceId: card.id,
                                    sourceName: card.name,
                                    property: 'attack',
                                    value: 1,
                                    type: 'aura',
                                    expireCondition: (game, buffedCard, buff) => {
                                        const source = game.findCardOnBoard(buff.sourceId);
                                        if (!source) return true; // 源离场
                                        const dist = Math.abs(source.x - buffedCard.x) + Math.abs(source.y - buffedCard.y);
                                        return dist !== 1; // 不再相邻
                                    }
                                });
                                game.ui.log(`onBoardChange: <span class="log-player">${target.name}</span> 获得了 <span class="log-player">${card.name}</span> 的光环加成！`);
                            }
                        }
                    }
                });
            },
            // 当自身移动后，重新计算光环
            onMove: (game, card) => {
                card.effects.onBoardChange(game, card);
                checkBuffs(game);
                return false; // 默认消耗行动点
            }
        }
    },
    'dancer': {
        name: '舞者',
        type: 'minion',
        cost: 2,
        ap: 2,
        attack: 1,
        hp: 1,
        description: '位置改变后，使相邻友方角色在本回合+1/+1。',
        owner: 'player',
        effects: {
            applyAdjBuff: (game, card) => {
                const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                directions.forEach(([dr, dc]) => {
                    const r = card.y + dr;
                    const c = card.x + dc;
                    if (r >= 0 && r < game.BOARD_ROWS && c >= 0 && c < game.BOARD_COLS) {
                        const target = game.board[r][c];
                        if (target && target.owner === 'player' && target.id !== card.id) {
                            // +1 攻击
                            applyBuff(target, {
                                sourceId: card.id,
                                sourceName: card.name,
                                property: 'attack',
                                value: 1,
                                type: 'temporary',
                                expireCondition: (game, buffedCard, buff) => {
                                    return game.currentTurn !== buffedCard.owner;
                                }
                            });
                            // +1 最大生命值
                            applyBuff(target, {
                                sourceId: card.id,
                                sourceName: card.name,
                                property: 'maxHp',
                                value: 1,
                                type: 'temporary',
                                expireCondition: (game, buffedCard, buff) => {
                                    return game.currentTurn !== buffedCard.owner;
                                }
                            });
                            // 同时提升当前生命值
                            applyBuff(target, {
                                sourceId: card.id,
                                sourceName: card.name,
                                property: 'hp',
                                value: 1,
                                type: 'temporary',
                                expireCondition: (game, buffedCard, buff) => {
                                    return game.currentTurn !== buffedCard.owner;
                                }
                            });
                            game.ui.log(`<span class="log-player">${card.name}</span> 的能力触发，<span class="log-player">${target.name}</span> 获得 +1/+1！`);
                        }
                    }
                });
                checkBuffs(game);
            },
            afterPositionChanged: (game, card) => {
                card.effects.applyAdjBuff(game, card);
            }
        }
    },

    // Enemy Minions
    'goblin': {
        name: '哥布林',
        type: 'minion',
        cost: 1,
        ap: 3,
        attack: 1,
        hp: 1,
        description: '',
        owner: 'enemy',
        lockTurns: 1 // How many turns it stays locked
    },
    'orc': {
        name: '兽人',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 3,
        hp: 5,
        description: '',
        owner: 'enemy',
        lockTurns: 2
    },
    // 新增敌人卡牌
    'sword_dancer': {
        name: '剑舞者',
        type: 'minion',
        cost: 3,
        ap: 3,
        attack: 2,
        hp: 4,
        description: '移动后，本回合攻击力+2',
        owner: 'enemy',
        lockTurns: 3,
        effects: {
            onMove: (game, card, fromR, fromC, toR, toC) => {
                applyBuff(card, {
                    sourceId: card.id,
                    sourceName: card.name,
                    property: 'attack',
                    value: 2,
                    type: 'temporary',
                    expireCondition: (game, buffedCard, buff) => {
                        return game.currentTurn !== buffedCard.owner;
                    }
                })

                return false; // 默认消耗行动点
            }
        }
    },
    'axe_brute': {
        name: '斧蛮',
        type: 'minion',
        cost: 2,
        ap: 1,
        attack: 2,
        hp: 4,
        description: '攻击后，对目标后方的角色造成等量伤害。',
        owner: 'enemy',
        lockTurns: 2,
        effects: {
            onAttack: (game, card, target) => {
                // 计算攻击方向
                const dirR = target.y - card.y;
                const dirC = target.x - card.x;

                // 计算目标后方的位置
                const backR = target.y + dirR;
                const backC = target.x + dirC;

                // 检查位置是否有效且有角色
                if (backR >= 0 && backR < game.BOARD_ROWS && backC >= 0 && backC < game.BOARD_COLS) {
                    const backTarget = game.board[backR][backC];
                    if (backTarget) {
                        // 对后方角色造成等同于攻击力的伤害
                        game.damageCard(backTarget, card.attack, card);
                        game.ui.log(`<span class="log-enemy">${card.name}</span> 的能力触发，对 <span class="log-${backTarget.owner}">${backTarget.name}</span> 造成${card.attack}点伤害！`);
                    }
                }
            }
        }
    },
    'stone_skin_boar': {
        name: '石肤猪',
        type: 'minion',
        cost: 3,
        ap: 1,
        attack: 2,
        hp: 5,
        description: '受到的伤害-1（不小于1）。',
        owner: 'enemy',
        lockTurns: 3,
        // 为石肤猪添加伤害减免特性
        damageTaken: (damage) => {
            // 伤害减1，但最少为1
            return Math.max(1, damage - 1);
        }
    },
    'drone': {
        name: '无人机',
        type: 'minion',
        cost: 0,
        ap: 1,
        attack: 2,
        hp: 2,
        description: '',
        owner: 'enemy'
    }
};

// Function to create a new card instance with a unique ID
function createCard(cardId, owner) {
    const definition = CARD_DEFINITIONS[cardId];
    if (!definition) {
        console.error(`Card definition not found for ID: ${cardId}`);
        return null;
    }
    const instance = {
        id: `${cardId}_${Date.now()}_${Math.random()}`, // Unique instance ID
        cardId: cardId, // Original definition ID
        name: definition.name,
        type: definition.type,
        cost: definition.cost,
        ap: definition.ap,
        maxAp: definition.ap,
        attack: definition.attack,
        hp: definition.hp,
        maxHp: definition.hp,
        description: definition.description,
        isHero: definition.isHero || false,
        owner: owner || definition.owner,
        isLocked: false,
        lockTimer: 0,
        lockTurns: definition.lockTurns || 0,
        x: null,
        y: null,
        effects: definition.effects || {},
        // 添加伤害减免属性
        damageTaken: definition.damageTaken || null,
        // 添加buff列表
        buffs: [],
        // 记录原始属性值
        baseStats: {
            ap: definition.ap,
            maxAp: definition.ap,
            attack: definition.attack,
            hp: definition.hp,
            maxHp: definition.hp
        }
    };

    // 初始化特定卡牌的状态
    if (definition.initialize) {
        definition.initialize(instance);
    }

    return instance;
}

// Buff系统函数
// 应用buff到目标卡牌
function applyBuff(card, buff) {
    if (!card.buffs) {
        card.buffs = [];
    }
    
    // 设置默认值
    buff.id = `buff_${Date.now()}_${Math.random()}`;
    
    // 添加buff到列表
    card.buffs.push(buff);
    
    // 应用buff效果
    if (buff.property) {
        card[buff.property] += buff.value;
    }
}

// 移除特定buff
function removeBuff(card, buffId) {
    if (!card.buffs) return;
    
    const buffIndex = card.buffs.findIndex(b => b.id === buffId);
    if (buffIndex === -1) return;
    
    const buff = card.buffs[buffIndex];
    
    // 撤销buff效果
    if (buff.property) {
        card[buff.property] -= buff.value;
    }
    
    // 从列表中移除
    card.buffs.splice(buffIndex, 1);
}

// 检查并处理过期的buff
function checkBuffs(game) {
    game.forEachBoardCard(card => {
        if (card.buffs && card.buffs.length > 0) {
            // 创建一个副本，因为我们可能会在迭代过程中修改buffs数组
            const buffsToCheck = [...card.buffs];
            
            buffsToCheck.forEach(buff => {
                if (buff.expireCondition && buff.expireCondition(game, card, buff)) {
                    removeBuff(card, buff.id);
                    if (buff.type !== 'permanent') {
                        game.ui.log(`${card.name} 上的 ${buff.property} 增益效果已消失。`);
                    }
                }
            });
        }
    });
}

// 获取卡牌显示信息，用于渲染带有buff状态的卡牌
function getCardDisplayInfo(card) {
    if (!card) return null;
    
    const info = {
        hasBuffs: false,
        buffedProperties: {}
    };
    
    if (card.buffs && card.buffs.length > 0) {
        info.hasBuffs = true;
        
        // 检查每个属性是否被buff
        if (card.ap !== card.baseStats.ap) {
            info.buffedProperties.ap = true;
        }
        if (card.attack !== card.baseStats.attack) {
            info.buffedProperties.attack = true;
        }
        if (card.maxHp !== card.baseStats.maxHp) {
            info.buffedProperties.hp = true;
        }
    }
    
    return info;
}

// 特效触发函数
const CardEffects = {
    // 触发卡牌的onKill效果
    triggerOnKill: (game, killer, victim) => {
        if (killer && killer.effects && killer.effects.onKill) {
            killer.effects.onKill(game, killer, victim);
        }
    },

    // 触发卡牌的onDeath效果（亡语）
    triggerOnDeath: (game, victim) => {
        if (victim && victim.effects && victim.effects.onDeath) {
            victim.effects.onDeath(game, victim);
        }

        // 触发场上所有友方卡牌的onAllyDeath效果
        game.forEachBoardCard(card => {
            if (card.owner === victim.owner && card.effects && card.effects.onAllyDeath && card.id !== victim.id) {
                card.effects.onAllyDeath(game, card, victim);
            }
        });
    },

    // 触发卡牌的onPlay效果（战吼）
    triggerOnPlay: (game, card) => {
        if (card && card.effects && card.effects.onPlay) {
            card.effects.onPlay(game, card);
        }
    },

    // 触发卡牌的onTurnStart效果
    triggerOnTurnStart: (game, card) => {
        if (card && card.effects && card.effects.onTurnStart) {
            card.effects.onTurnStart(game, card);
        }
    },

    // 触发卡牌的onSwap效果，返回是否消耗行动点
    triggerOnSwap: (game, card, targetCard) => {
        if (card && card.effects && card.effects.onSwap) {
            return card.effects.onSwap(game, card, targetCard);
        }
        return false; // 默认消耗行动点
    },

    // 触发卡牌的onAttack效果
    triggerOnAttack: (game, card, target) => {
        if (card && card.effects && card.effects.onAttack) {
            card.effects.onAttack(game, card, target);
        }
    },

    // 触发卡牌的onMove效果，返回是否消耗行动点
    triggerOnMove: (game, card, fromR, fromC, toR, toC) => {
        game.ui.log(`<span class="log-player">${card.name}</span> 移动了。`);
        if (card && card.effects && card.effects.onMove) {
            return card.effects.onMove(game, card, fromR, fromC, toR, toC) || false;
        }
        return false; // 默认消耗行动点
    },

    // 触发卡牌的onTurnEnd效果
    triggerOnTurnEnd: (game, card) => {
        if (card && card.effects && card.effects.onTurnEnd) {
            card.effects.onTurnEnd(game, card);
        }
    },
    
    // 触发卡牌的onBoardChange效果（场上卡牌变化时）
    triggerOnBoardChange: (game, card) => {
        if (card && card.effects && card.effects.onBoardChange) {
            card.effects.onBoardChange(game, card);
        }
    },

    // 触发卡牌的afterPositionChanged效果
    triggerAfterPositionChanged: (game, card) => {
        if (card && card.effects && card.effects.afterPositionChanged) {
            card.effects.afterPositionChanged(game, card);
        }
    }
};
