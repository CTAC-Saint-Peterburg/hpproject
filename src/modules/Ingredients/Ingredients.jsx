import { SPAWN_BOTTLES_CORDS } from '../../static/constants';
import { Bottle } from './Bottle';
import { useGameStore } from '../Stores/GameStore';
import brewing from '../../static/brewing.json';

export const Ingredients = ({ mousePos, disabled, onPositionUpdate }) => {
  const s = useGameStore();
  return <>{SPAWN_BOTTLES_CORDS.map(item => <Bottle key={item.id} cords={item.cords}
    id={item.id} color={item.color} isSelected={s.selectedIngredientId === item.id}
    refillAt={s.ingredientRefills[item.id] ?? null}
    showHint={!disabled && !s.ingredientFlight && s.lastTick - (s.ingredientRefills[item.id] ?? -Infinity) >= brewing.ingredientAnimation.refillSeconds * 1000}
    isFollowMode={s.heldIngredientId === item.id} mousePos={mousePos}
    onToggle={() => {
      if (disabled) return;
      s.selectIngredient(item.id);
      onPositionUpdate?.({ id: item.id, isSelected: false });
    }} onPositionUpdate={onPositionUpdate} />)}</>;
};
