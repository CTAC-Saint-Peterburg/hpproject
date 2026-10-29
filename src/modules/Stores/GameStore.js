import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import missions from '../../static/missions.json';
import { ENEMY_TYPES, ENEMY_FLIGHT_MS, ENEMY_SHOT_MS, PROJECTILE_FLIGHT_MS, isPotBlocked, randomSlimeSpells } from '../../static/enemies';
import achievements from '../../static/achievements.json';
import { shopItems } from '../../static/themedConfigs';
import brewing from '../../static/brewing.json';
import { addPotionInventory, consumePotionEntry, resolvePotionProfile } from './potionInventory';

export const useGameStore = create(persist((set, get) => ({

  enemies: [], projectiles: [], selectedEnemyId: null, enemiesSpawned: 0,
  nextEnemyAt: null, enemySerial: 0,
  selectEnemy: id => {
    const s = get();
    if (s.status !== 'playing' || !s.enemies.some(enemy => enemy.id === id)) return;
    set({ selectedEnemyId: s.selectedEnemyId === id ? null : id, isPotSelected: false, currentSpell: null, selectedIngredientId: null, heldIngredientId: null,
      message: s.enemies.find(enemy => enemy.id === id)?.type === 'enemyslime' ? 'messages.slimeSelected' : 'messages.enemySelected' });
  },
  spawnEnemy: (type, forced = false, now = Date.now()) => {
    const s = get();
    if (s.status !== 'playing' || !s.startGame || !ENEMY_TYPES[type]) return false;
    const slime = type === 'enemyslime';
    if (slime && s.enemies.some(enemy => enemy.type === 'enemyslime')) {
      if (forced) set({ message: 'messages.slimePresent' });
      return false;
    }
    const freeSide = slime ? [0] : [-1, 1].filter(side => !s.enemies.some(enemy => enemy.side === side));
    if (!freeSide.length) { if (forced) set({ message: 'messages.full' }); return false; }
    const side = freeSide[Math.floor(Math.random() * freeSide.length)];
    const serial = s.enemySerial + 1;
    const enemy = { id: 'enemy-' + serial, type, side, bornAt: now,
      ...(slime ? { entrySide: Math.random() < .5 ? -1 : 1, remainingSpells: randomSlimeSpells() }
        : { nextShotAt: now + ENEMY_FLIGHT_MS + ENEMY_SHOT_MS }) };
    set({ enemies: [...s.enemies, enemy], enemySerial: serial,
      ...(forced ? { debugUsed: true, message: 'messages.spawned' } : {}) });
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
      if (enemy.type === 'enemyslime' || now < enemy.nextShotAt) return enemy;
      shots.push({ id: 'shot-' + (++serial), type: enemy.type, side: enemy.side, bornAt: enemy.bornAt,
        launchedAt: now, impactAt: now + PROJECTILE_FLIGHT_MS });
      return { ...enemy, nextShotAt: now + ENEMY_SHOT_MS };
    });
    set({ enemies, projectiles: shots, enemySerial: serial,
      ...(isPotBlocked(enemies, now) ? { isPotSelected: false } : {}),
      potTemperature: Math.max(20, Math.min(110, s.potTemperature + temperatureDelta)),
      ...(impacts.length ? { message: 'messages.impact', messageValues: { delta: (temperatureDelta >= 0 ? '+' : '') + temperatureDelta } } : {}) });
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

  tutorialProgress: {},
  ...resolvePotionProfile(), mageCards: {},
  markProfileInitialized: () => set({ firstVisitGranted: true }),
  dismissFirstVisit: () => set({ showFirstVisitWelcome: false }),
  addPotions: (ids, quality = 'fine') => set(s => ({ potionInventory: addPotionInventory(s.potionInventory, ids, quality) })),
  consumeEntryPotions: ids => {
    const s = get();
    const entry = consumePotionEntry(s.potionInventory, ids);
    if (!entry) return false;
    set({ potionInventory: entry.inventory });
    return true;
  },
  awardMageCard: id => {
    if (!/^mage_(10|[1-9])$/.test(id)) return;
    set(s => ({ mageCards: { ...s.mageCards, [id]: (s.mageCards[id] || 0) + 1 } }));
  },
  ownedItems: ['wand_default', 'pot_default'],
  equippedItems: { wand: 'wand_default', pot: 'pot_default' },
  buyItem: id => {
    const item = shopItems.find(entry => entry.id === id);
    if (!item || !['wand','pot'].includes(item.type) || !Number.isFinite(item.price) || item.price < 0) return 'shop.invalid';
    const s = get();
    if (item.default || s.ownedItems.includes(id)) return 'shop.owned';
    if (s.stones < item.price) return 'shop.insufficient';
    set({ stones: s.stones - item.price, ownedItems: [...s.ownedItems, id] });
    return 'shop.purchased';
  },
  equipItem: id => {
    const item = shopItems.find(entry => entry.id === id);
    const s = get();
    if (!item || (!item.default && !s.ownedItems.includes(id))) return 'shop.notOwned';
    set({ equippedItems: { ...s.equippedItems, [item.type]: id } });
    return 'shop.applied';
  },
  recordTraining: id => {
    if (!Number.isInteger(id) || id < 1 || id > 10) return;
    set(s => ({ tutorialProgress: { ...s.tutorialProgress, [id]: Math.min(2, (s.tutorialProgress[id] || 0) + 1) } }));
  },
  stones: 0, unlocked: [], records: {}, completed: [], selectedLevel: 'level_01',
  runId: 0, startGame: false, status: 'idle', mission: null, currentStage: 0,
  currentSpell: null, isPotSelected: false, potTemperature: 20, heatLevel: 0,
  selectedIngredientId: null, heldIngredientId: null,
  agitation: 0, stirUntil: 0, fireHintSeen: false, resultQuality: null,
  selectIngredient: id => {
    const s = get();
    if (s.status !== 'playing' || ![1,2,3,4,5,6].includes(id) || isPotBlocked(s.enemies, Date.now())) return;
    set({ selectedIngredientId: s.selectedIngredientId === id ? null : id,
      heldIngredientId: null, isPotSelected: false, selectedEnemyId: null, currentSpell: null });
  },
  score: 0, mistakes: 0, rating: 0, reward: 0, remaining: null, fps: 0,
  message: '', messageValues: {}, debugUsed: false, lastTick: 0, deadline: null,
  spellCast: null, spellCastSerial: 0,
  setCurrentSpell: currentSpell => {
    if (!Number.isInteger(currentSpell) || currentSpell < 1 || currentSpell > 10) return;
    get().tick(Date.now());
    const s = get();
    if (s.status !== 'playing') return;
    const enemy = s.enemies.find(item => item.id === s.selectedEnemyId);
    const cast = {
      sequence: s.spellCastSerial + 1, spellId: currentSpell, at: Date.now(),
      target: enemy ? { kind: 'enemy', enemy: { ...enemy } } : s.isPotSelected ? { kind: 'pot' } : { kind: 'wand' },
    };
    if (enemy) {
      if (enemy.type === 'enemyslime') {
        const index = enemy.remainingSpells.indexOf(currentSpell);
        if (index < 0) { set({ currentSpell: null, message: 'messages.slimeWrong' }); return; }
        const remainingSpells = enemy.remainingSpells.filter((_, i) => i !== index);
        set({ enemies: remainingSpells.length ? s.enemies.map(item => item.id === enemy.id ? { ...item, remainingSpells } : item) : s.enemies.filter(item => item.id !== enemy.id),
          selectedEnemyId: remainingSpells.length ? enemy.id : null, currentSpell: null,
          spellCast: cast, spellCastSerial: cast.sequence, message: remainingSpells.length ? 'messages.slimeHit' : 'messages.defeated' });
        return;
      }
      if (ENEMY_TYPES[enemy.type].counterSpell === currentSpell) {
        set({ enemies: s.enemies.filter(item => item.id !== enemy.id), selectedEnemyId: null,
          currentSpell: null, spellCast: cast, spellCastSerial: cast.sequence, message: 'messages.defeated' });
      } else {
        set({ currentSpell: null, message: 'messages.wrongSpell' });
      }
    } else {
      set({ currentSpell, spellCast: cast, spellCastSerial: cast.sequence });
      if (isPotBlocked(s.enemies, Date.now())) return;
      if (currentSpell === brewing.liftSpell && s.selectedIngredientId !== null) set({ heldIngredientId: s.selectedIngredientId });
      if (currentSpell === brewing.dropSpell) set({ heldIngredientId: null, selectedIngredientId: null });
      if (s.isPotSelected) {
        if (currentSpell === 1) get().changePotTemperature(1);
        if (currentSpell === 2) get().changePotTemperature(-1);
        if (currentSpell === brewing.stirSpell) {
          const config = { ...brewing.stirring, ...s.mission?.stirring };
          set({ agitation: Math.min(100, s.agitation + config.perCast), stirUntil: Date.now() + config.swaySeconds * 1000,
            heldIngredientId: null, selectedIngredientId: null, message: 'messages.stirred' });
        }
      }
    }
  },
  togglePotSelected: () => {
    const s = get();
    if (isPotBlocked(s.enemies, Date.now())) { set({ message: 'messages.slimeBlocked' }); return; }
    set({ isPotSelected: !s.isPotSelected, selectedEnemyId: null, currentSpell: null, heldIngredientId: null, selectedIngredientId: null });
  },
  changePotTemperature: value => {
    const s = get();
    if (isPotBlocked(s.enemies, Date.now())) { set({ message: 'messages.slimeBlocked' }); return; }
    const heatLevel = Math.max(0, Math.min(3, s.heatLevel + value));
    set({ heatLevel, ...(heatLevel > 0 ? { fireHintSeen: true } : {}) });
  },
  changeStones: value => {
    if (Number.isFinite(value)) set(s => ({ stones: Math.max(0, s.stones + Math.trunc(value)) }));
  },
  setLevel: selectedLevel => { if (missions[selectedLevel]) set({ selectedLevel }); },
  beginMission: id => {
    const mission = missions[id];
    if (!mission) return;
    const now = Date.now();
    set({ runId: get().runId + 1, selectedLevel: id, mission, startGame: true, status: 'playing', currentStage: 0,
      currentSpell: null, spellCast: null, spellCastSerial: 0, isPotSelected: false, potTemperature: 20, heatLevel: 0,
      selectedIngredientId: null, heldIngredientId: null, agitation: 0, stirUntil: 0, resultQuality: null,
      score: 0, mistakes: 0, rating: 0, reward: 0, message: '', debugUsed: false,
      remaining: mission.timeLimit ?? null, deadline: mission.timeLimit ? now + mission.timeLimit * 1000 : null,
      lastTick: now, enemies: [], projectiles: [], selectedEnemyId: null, enemiesSpawned: 0, enemySerial: 0,
      nextEnemyAt: mission.enemySpawn?.allowed?.length ? now +
        (mission.enemySpawn.spawnWindow ?? mission.timeLimit ?? 150) * 1000 /
        (Math.max(1, Math.min(10, Math.trunc(mission.enemySpawn.rarity || 1))) + 1) : null });
  },
  exitToMenu: () => set({ runId: 0, startGame: false, status: 'idle', currentSpell: null, spellCast: null, isPotSelected: false, heatLevel: 0, selectedIngredientId: null, heldIngredientId: null, agitation: 0, stirUntil: 0, enemies: [], projectiles: [], selectedEnemyId: null, nextEnemyAt: null }),
  tick: now => {
    const s = get();
    if (!s.startGame || s.status !== 'playing') return;
    const dt = Math.max(0, (now - s.lastTick) / 1000);
    const target = 20 + s.heatLevel * 30;
    const change = (target - s.potTemperature) * (1 - Math.exp(-dt / 4));
    const remaining = s.deadline === null ? null : Math.max(0, (s.deadline - now) / 1000);
    const stirring = { ...brewing.stirring, ...s.mission?.stirring };
    set({ potTemperature: Math.max(20, Math.min(110, s.potTemperature + change)), remaining, lastTick: now,
      agitation: Math.max(0, s.agitation - stirring.decayPerSecond * dt) });
    if (remaining === 0) { get().finish(false); return; }
    get().updateEnemies(now);
  },
  addIngredient: id => {
    get().tick(Date.now());
    const s = get();
    if (s.status !== 'playing') return;
    if (isPotBlocked(s.enemies, Date.now())) { set({ message: 'messages.slimeBlocked' }); return; }
    const stage = s.mission.stages[s.currentStage];
    if (!stage) return;
    const stirring = stage.stirring ?? { min: 0, max: 100 };
    if (id !== stage.id || s.potTemperature < stage.temperature.min || s.potTemperature > stage.temperature.max || s.agitation < stirring.min || s.agitation > stirring.max) {
      set({ score: Math.max(0, s.score - stage.points_deduct), mistakes: s.mistakes + 1,
        message: id !== stage.id ? 'messages.wrongIngredient' : s.potTemperature < stage.temperature.min || s.potTemperature > stage.temperature.max ? 'messages.wrongTemperature' : 'messages.wrongStirring' });
      return;
    }
    set({ currentStage: s.currentStage + 1, score: s.score + stage.points_add, message: 'messages.accepted', heldIngredientId: null, selectedIngredientId: null, currentSpell: null });
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
    const resultQuality = won ? ['basic','fine','masterwork'][rating - 1] : null;
    const potionInventory = won && !s.debugUsed && s.mission.rewardPotion
      ? addPotionInventory(s.potionInventory, [s.mission.rewardPotion], resultQuality) : s.potionInventory;
    set({ status: won ? 'won' : 'lost', spellCast: null, rating, resultQuality, reward, stones: s.stones + reward, potionInventory,
      heldIngredientId: null, selectedIngredientId: null, stirUntil: 0,
      completed, records, unlocked: [...unlocked], heatLevel: 0, enemies: [], projectiles: [], selectedEnemyId: null, nextEnemyAt: null });
  },
}), {
  name: 'hpproject-save-v1',
  merge: (saved, current) => ({ ...current, ...saved, ...resolvePotionProfile(saved) }),
  onRehydrateStorage: () => state => state?.markProfileInitialized(),
  partialize: s => ({ stones: s.stones, unlocked: s.unlocked, records: s.records, completed: s.completed, tutorialProgress: s.tutorialProgress, ownedItems: s.ownedItems, equippedItems: s.equippedItems, potionInventory: s.potionInventory, mageCards: s.mageCards, firstVisitGranted: s.firstVisitGranted, fireHintSeen: s.fireHintSeen }),
}));

