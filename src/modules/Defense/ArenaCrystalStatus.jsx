import { Html } from '@react-three/drei';
import { BackSide } from 'three';
import { useTranslation } from 'react-i18next';
import { useDefenseStore } from './DefenseStore';
import { defenseConfig as config, shopItems } from '../../static/themedConfigs';
import { theme } from '../../static/theme';
import { crystalStatusPosition } from './arenaLayout';
import { crystalThreats } from './arenaTactics';
import SpellHint from '../Pot/SpellHint';

export default function ArenaCrystalStatus({ gestureRef }) {
  const { t } = useTranslation();
  const state = useDefenseStore();
  const skin = shopItems.find(item => item.type === 'crystal' && item.id === state.crystalSkinId);
  const burning = state.crystalEffects.burn?.until > state.time;
  const frozen = state.crystalEffects.freeze?.until > state.time;
  const color = burning ? theme.colors.crystalBurn : frozen ? theme.colors.crystalFreeze : skin?.color ?? theme.colors.crystal;
  const selected = state.selected === 'crystal';
  const crowded = crystalThreats(state.enemies, config).length >= config.crowdControl.minimumEnemies;
  const cooldown = Math.max(0, (state.lastDisorient ?? -Infinity) + config.crowdControl.cooldown - state.time);
  return <group position={crystalStatusPosition(state.inventory)} onClick={event => {
    if (gestureRef?.current || event.delta > 4) return;
    event.stopPropagation();
    useDefenseStore.getState().select('crystal');
  }}>
    <mesh position={[0, .05, 0]}>
      <cylinderGeometry args={[.35, .4, .1, 6]} />
      <meshStandardMaterial color={theme.colors.crystalBase} roughness={.65} />
    </mesh>
    <mesh position={[0, .43, 0]}>
      <octahedronGeometry args={[.32, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.5} roughness={.3} flatShading />
      {selected && <mesh scale={1.13} raycast={() => null}>
        <octahedronGeometry args={[.32, 0]} />
        <meshBasicMaterial color={theme.colors.crystalSelected} side={BackSide} />
      </mesh>}
    </mesh>
    <mesh position={[0, .4, 0]}>
      <boxGeometry args={[.85, .85, .85]} /><meshBasicMaterial visible={false} />
    </mesh>
    <Html center position={[0, .99, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className={'arena-crystal-status' + (selected ? ' arena-crystal-status-selected' : '')}
        role="status" aria-label={t('arena.crystalStatus')}>
        <strong>{t('arena.crystal')} · {Math.ceil(state.hp)}/{config.crystal.maxHp}</strong>
        {burning && <div className="arena-crystal-status-burn"><SpellHint spellId={2} labelKey="spells.2.name" /><span>{t('arena.crystalBurning')}</span></div>}
        {frozen && <div className="arena-crystal-status-freeze"><SpellHint spellId={1} labelKey="spells.1.name" /><span>{t('arena.crystalFrozen')}</span></div>}
        {!burning && !frozen && <span>{t('arena.crystalHealthy')}</span>}
        {(burning || frozen || crowded) && !selected && <small>{t('arena.crystalStatusSelect')}</small>}
        {crowded && <div className="arena-crystal-status-crowd"><SpellHint spellId={config.crowdControl.spell} labelKey={'spells.' + config.crowdControl.spell + '.name'} />
          <span>{cooldown > 0 ? t('arena.disorientCooldown', { seconds: Math.ceil(cooldown) })
            : t('arena.disorientHint', { count: config.crowdControl.targets })}</span>
        </div>}
      </div>
    </Html>
  </group>;
}
