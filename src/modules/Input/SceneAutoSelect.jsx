import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useGameStore } from '../Stores/GameStore';
import { useDefenseStore } from '../Defense/DefenseStore';
import { isPotBlocked } from '../../static/enemies';
import { SPAWN_BOTTLES_CORDS } from '../../static/constants';
import brewing from '../../static/brewing.json';
import { defenseConfig } from '../../static/themedConfigs';
import { nearestEnemies, nextTarget } from './autoTargets';
import { potDepth, rackPoint, workshopEnemyPosition } from '../Room/workshopLayout';

export default function SceneAutoSelect({ arena = false, positions }) {
  const { camera, viewport } = useThree();
  useEffect(() => {
    const projected = new Vector3();
    const visible = position => {
      projected.set(...position).project(camera);
      return Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z > -1 && projected.z < 1;
    };
    const select = () => {
      if (arena) {
        const s = useDefenseStore.getState();
        if (s.paused || s.phase !== 'wave') return;
        const targets = nearestEnemies(s.enemies, defenseConfig.enemies).filter(e => visible([e.x,e.y+e.size*.6,e.z])).map(e => ({key:e.id}));
        const next = nextTarget(targets,s.selected);
        if (next) s.select(next.key);
        return;
      }
      const s = useGameStore.getState(), now = Date.now();
      if (s.paused || s.status !== 'playing') return;
      const view = viewport.getCurrentViewport(camera,[0,0,0]), targets = [];
      if (!isPotBlocked(s.enemies,now)) {
        if (visible([0,0,potDepth(camera.position.z)])) targets.push({key:'pot',kind:'pot'});
        if (!s.ingredientFlight) for (const item of SPAWN_BOTTLES_CORDS) {
          const position = positions?.current.get(item.id)?.toArray() ?? rackPoint(item.cords);
          if (now-(s.ingredientRefills[item.id]??-Infinity) >= brewing.ingredientAnimation.refillSeconds*1000 && visible(position)) targets.push({key:'ingredient:'+item.id,kind:'ingredient',id:item.id});
        }
      }
      for (const enemy of s.enemies) if (visible(workshopEnemyPosition(enemy,now,camera,view))) targets.push({key:'enemy:'+enemy.id,kind:'enemy',id:enemy.id});
      const current = s.isPotSelected ? 'pot' : s.selectedEnemyId != null ? 'enemy:'+s.selectedEnemyId : s.selectedIngredientId != null ? 'ingredient:'+s.selectedIngredientId : null;
      const next = nextTarget(targets,current);
      // Existing selectors toggle on repetition; a single available target must stay selected.
      if (!next || next.key === current) return;
      if (next.kind === 'pot') s.togglePotSelected();
      else if (next.kind === 'ingredient') s.selectIngredient(next.id);
      else s.selectEnemy(next.id);
    };
    const event = arena ? 'hyped-select-arena' : 'hyped-select-brewing';
    window.addEventListener(event,select); return () => window.removeEventListener(event,select);
  },[arena,camera,viewport,positions]);
  return null;
}
