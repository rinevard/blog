/**
 * 关卡完整配置：
 *  - deck:      玩家卡组列表（仅列出卡牌 ID，系统按稀有度自动补充数量）
 *  - spawnTurns/spawnCounts/enemyPool: 敌人刷新配置
 */
const LEVEL_CONFIGS = {
    1: {
        deck: ['lizard', 'dragon_messenger', 'collector', 'villager', 'dancer', 'shadow', 'commander', 'courier'],
        spawnTurns: [2, 4, 6, 8, 10],
        spawnCounts: [1, 1, 1, 2, 2],
        enemyStages: [
            { maxTurn: 2, pool: ['goblin'] },
            { maxTurn: 6, pool: ['orc'] },
            { maxTurn: 9, pool: ['axe_brute'] }
        ]
    },
    2: {
        deck: ['lizard', 'phantom_wolves', 'soul_thief', 'commander', 'shadow', 'collector', 'swarm_bees', 'squirrel_man', 'swift_bloom', 'iron_fist', 'dancer'],
        spawnTurns: [2, 3, 4, 6, 7, 9],
        spawnCounts: [1, 1, 2, 1, 2, 2],
        enemyStages: [
            { maxTurn: 2, pool: ['goblin'] },
            { maxTurn: 5, pool: ['goblin', 'orc', 'axe_brute'] },
            { maxTurn: 9, pool: ['stone_skin_boar', 'axe_brute'] }
        ]
    },
    3: {
        deck: ['lizard', 'dragon_messenger', 'commander', 'iron_fist', 'phantom_wolves', 'swarm_bees', 'villager', 'swift_bloom', 'spiky_back', 'auto_cannon', 'soul_thief', 'courier', 'collector', 'squirrel_man', 'dancer'],
        spawnTurns: [2, 3, 4, 5, 6, 7, 9],
        spawnCounts: [1, 2, 1, 2, 1, 1, 2],
        enemyStages: [
            { maxTurn: 3, pool: ['goblin', 'orc', 'axe_brute'] },
            { maxTurn: 6, pool: ['goblin', 'orc', 'axe_brute', 'stone_skin_boar'] },
            { maxTurn: 9, pool: ['sword_dancer', 'stone_skin_boar', 'axe_brute'] }
        ]
    }
};

// 稀有卡牌集合
const RARE_CARDS = new Set([
    'lizard',            // 蜥蜴
    'phantom_wolves',    // 幻影狼群
    'dragon_messenger',  // 龙信使
    'commander',         // 指挥官
    'soul_thief'         // 窃灵
]);

const NORMAL_CARDS = new Set([
    'squirrel',          // 松鼠
    'shadow',            // 影子
    'collector',         // 收藏家
    'courier',           // 快递员
    'villager',          // 村民
    'possessed_beast',   // 附身兽
    'swarm_bees',        // 群蜂
    'squirrel_man',      // 松鼠人
    'auto_cannon',       // 自走炮
    'spiky_back',        // 刺刺背
    'tactician',         // 策士
    'swift_bloom',       // 瞬息花
    'growing_warrior',   // 渐强者
    'iron_fist',         // 铁拳头
    'dancer'             // 舞者
]);

// 如仍需兼容旧变量，可将以下行取消注释：
// const LEVEL_SPAWN_CONFIGS = LEVEL_CONFIGS; 