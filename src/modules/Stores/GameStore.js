import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import missions from '../../static/missions.json';
import { ENEMY_TYPES, ENEMY_FLIGHT_MS, ENEMY_SHOT_MS, PROJECTILE_FLIGHT_MS } from '../../static/enemies';
import achievements from '../../static/achievements.json';

export const useGameStore = create(persist((set, get) => ({

  enemies: [], projectiles: [], selectedEnemyId: null, enemiesSpawned: 0,
  nextEnemyAt: null, enemySerial: 0,
  selectEnemy: id => {
    const s = get();
    if (s.status !== 'playing' || !s.enemies.some(enemy => enemy.id === id)) return;
    set({ selectedEnemyId: s.selectedEnemyId === id ? null : id, isPotSelected: false, currentSpell: null,
      message: 'Враг выбран: синий — V (огонь), жёлтый — квадрат (холод).' });
  },
  spawnEnemy: (type, forced = false, now = Date.now()) => {
    const s = get();
    if (s.status !== 'playing' || !s.startGame || !ENEMY_TYPES[type]) return false;
    const freeSide = [-1, 1].filter(side => !s.enemies.some(enemy => enemy.side === side));
    if (!freeSide.length) { if (forced) set({ message: 'Оба угла заняты: сначала уничтожьте врага.' }); return false; }
    const side = freeSide[Math.floor(Math.random() * freeSide.length)];
    const serial = s.enemySerial + 1;
    const enemy = { id: 'enemy-' + serial, type, side, bornAt: now, nextShotAt: now + ENEMY_FLIGHT_MS + ENEMY_SHOT_MS };
    set({ enemies: [...s.enemies, enemy], enemySerial: serial,
      ...(forced ? { debugUsed: true, message: 'Враг вызван для отладки; награды отключены до новой попытки.' } : {}) });
    return true;
  },
  updateEnemies: now => {
    let s = get();
    if (s.status !== 'playing') return;
    const impacts = s.projectiles.filter(shot => shot.impactAt <= now);
    const temperatureDelta = impacts.reduce((sum, shot) => sum + ENEMY_TYPES[shot.type].temperatureDelta, 0);
    let serial = s.enemySerial;
    const shots = s.projectiles.filter(shot => shot.impactAt > now);
    const enemies = s.enemies.map(enemy => {
      if (now < enemy.nextShotAt) return enemy;
      shots.push({ id: 'shot-' + (++serial), type: enemy.type, side: enemy.side, bornAt: enemy.bornAt,
        launchedAt: now, impactAt: now + PROJECTILE_FLIGHT_MS });
      return { ...enemy, nextShotAt: now + ENEMY_SHOT_MS };
    });
    set({ enemies, projectiles: shots, enemySerial: serial,
      potTemperature: Math.max(20, Math.min(110, s.potTemperature + temperatureDelta)),
      ...(impacts.length ? { message: 'Попадание в котёл: ' + (temperatureDelta >= 0 ? '+' : '') + temperatureDelta + ' °C' } : {}) });
    s = get();
    const config = s.mission.enemySpawn;
    const allowed = (config?.allowed || []).filter(type => ENEMY_TYPES[type]);
    if (!allowed.length || s.nextEnemyAt === null || now < s.nextEnemyAt) return;
    const budget = Math.max(1, Math.min(10, Math.trunc(config.rarity || 1)));
    if (s.enemiesSpawned >= budget) return;
    const type = allowed[Math.floor(Math.random() * allowed.length)];
    if (get().spawnEnemy(type, false, now)) {
      const interval = (config.spawnWindow ?? s.mission.timeLimit ?? 150) * 1000 / (budget + 1);
      set({ enemiesSpawned: s.enemiesSpawned + 1, nextEnemyAt: now + interval });
    }
  },

  stones: 0, unlocked: [], records: {}, completed: [], selectedLevel: 'level_01',
  runId: 0, startGame: false, status: 'idle', mission: null, currentStage: 0,
  currentSpell: null, isPotSelected: false, potTemperature: 20, heatLevel: 0,
  score: 0, mistakes: 0, rating: 0, reward: 0, remaining: null, fps: 0,
  message: '', debugUsed: false, lastTick: 0, deadline: null,
  setCurrentSpell: currentSpell => {
    get().tick(Date.now());
    const s = get();
    if (s.status !== 'playing') return;
    const enemy = s.enemies.find(item => item.id === s.selectedEnemyId);
    if (enemy) {
      if (ENEMY_TYPES[enemy.type].counterSpell === currentSpell) {
        set({ enemies: s.enemies.filter(item => item.id !== enemy.id), selectedEnemyId: null,
          currentSpell: null, message: 'Враг рассеян!' });
      } else {
        set({ currentSpell: null, message: 'Не то заклинание: синий — V, жёлтый — квадрат.' });
      }
    } else set({ currentSpell });
  },
  togglePotSelected: () => set(s => ({ isPotSelected: !s.isPotSelected, selectedEnemyId: null, currentSpell: null })),
  changePotTemperature: value => set(s => ({ heatLevel: Math.max(0, Math.min(3, s.heatLevel + value)) })),
  changeStones: value => {
    if (Number.isFinite(value)) set(s => ({ stones: Math.max(0, s.stones + Math.trunc(value)) }));
  },
  setLevel: selectedLevel => { if (missions[selectedLevel]) set({ selectedLevel }); },
  beginMission: id => {
    const mission = missions[id];
    if (!mission) return;
    const now = Date.now();
    set({ runId: get().runId + 1, selectedLevel: id, mission, startGame: true, status: 'playing', currentStage: 0,
      currentSpell: null, isPotSelected: false, potTemperature: 20, heatLevel: 0,
      score: 0, mistakes: 0, rating: 0, reward: 0, message: '', debugUsed: false,
      remaining: mission.timeLimit ?? null, deadline: mission.timeLimit ? now + mission.timeLimit * 1000 : null,
      lastTick: now, enemies: [], projectiles: [], selectedEnemyId: null, enemiesSpawned: 0, enemySerial: 0,
      nextEnemyAt: mission.enemySpawn?.allowed?.length ? now +
        (mission.enemySpawn.spawnWindow ?? mission.timeLimit ?? 150) * 1000 /
        (Math.max(1, Math.min(10, Math.trunc(mission.enemySpawn.rarity || 1))) + 1) : null });
  },
  exitToMenu: () => set({ runId: 0, startGame: false, status: 'idle', currentSpell: null, isPotSelected: false, heatLevel: 0, enemies: [], projectiles: [], selectedEnemyId: null, nextEnemyAt: null }),
  tick: now => {
    const s = get();
    if (!s.startGame || s.status !== 'playing') return;
    const dt = Math.max(0, (now - s.lastTick) / 1000);
    const target = 20 + s.heatLevel * 30;
    const change = (target - s.potTemperature) * (1 - Math.exp(-dt / 4));
    const remaining = s.deadline === null ? null : Math.max(0, (s.deadline - now) / 1000);
    set({ potTemperature: Math.max(20, Math.min(110, s.potTemperature + change)), remaining, lastTick: now });
    if (remaining === 0) { get().finish(false); return; }
    get().updateEnemies(now);
  },
  addIngredient: id => {
    get().tick(Date.now());
    const s = get();
    if (s.status !== 'playing') return;
    const stage = s.mission.stages[s.currentStage];
    if (!stage) return;
    if (id !== stage.id || s.potTemperature < stage.temperature.min || s.potTemperature > stage.temperature.max) {
      set({ score: Math.max(0, s.score - stage.points_deduct), mistakes: s.mistakes + 1,
        message: id !== stage.id ? 'Неверный ингредиент.' : 'Температура не подходит: измените огонь и подождите.' });
      return;
    }
    set({ currentStage: s.currentStage + 1, score: s.score + stage.points_add, message: 'Ингредиент принят.' });
    if (get().currentStage === s.mission.stages.length) get().finish(true);
  },
  debugAdvance: () => {
    const s = get();
    if (s.status !== 'playing') return;
    set({ debugUsed: true, currentStage: s.currentStage + 1 });
    if (get().currentStage >= s.mission.stages.length) get().finish(true);
  },
  finish: won => {
    const s = get();
    if (s.status !== 'playing') return;
    const maximum = s.mission.stages.reduce((sum, stage) => sum + stage.points_add, 0);
    const ratio = s.score / maximum;
    const rating = won ? (ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1) : 0;
    const reward = won && !s.debugUsed ? s.mission.stonesReward * rating : 0;
    const completed = won && !s.debugUsed ? [...new Set([...s.completed, s.selectedLevel])] : s.completed;
    const records = won && !s.debugUsed ? { ...s.records, [s.selectedLevel]: Math.max(s.records[s.selectedLevel] || 0, rating) } : s.records;
    const unlocked = new Set(s.unlocked);
    if (won && !s.debugUsed) {
      const facts = { wins: completed.length, rating, mistakes: s.mistakes,
        timed: s.mission.timeLimit != null, remaining: s.remaining ?? 0 };
      achievements.forEach(a => {
        if (Object.entries(a.conditions).every(([key, rule]) =>
          rule.eq !== undefined ? facts[key] === rule.eq : facts[key] >= rule.min)) unlocked.add(a.id);
      });
    }
    set({ status: won ? 'won' : 'lost', rating, reward, stones: s.stones + reward,
      completed, records, unlocked: [...unlocked], heatLevel: 0, enemies: [], projectiles: [], selectedEnemyId: null, nextEnemyAt: null });
  },
}), {
  name: 'hpproject-save-v1',
  partialize: s => ({ stones: s.stones, unlocked: s.unlocked, records: s.records, completed: s.completed }),
}));

