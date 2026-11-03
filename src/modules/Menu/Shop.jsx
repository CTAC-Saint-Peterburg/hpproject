import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import { shopItems as items, potionTypes } from '../../static/themedConfigs';
import { potionCount } from '../Stores/potionInventory';

function effectValues(item) {
  const effects = item.effects ?? {};
  return { ...effects, chance: Math.round((effects.instantKillChance ?? 0) * 100),
    radius: effects.splashRadius ?? 0, percent: Math.round((effects.splashMultiplier ?? 0) * 100) };
}

export default function Shop() {
  const { t } = useTranslation();
  const s = useGameStore();
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const catalog = [...items, ...potionTypes.map(potion => ({ ...potion, type: 'potion' }))];
  return <section className="shop">
    <h2>{t('shop.title')}</h2><p>{t('shop.intro')}</p>
    <p className="shop-effects-note">{t('shop.arenaEffects')}</p>
    <p>{t('shop.balance', {stones: s.stones})}</p>
    <label>{t('shop.category')}<select value={filter} onChange={e => setFilter(e.target.value)}>
      {['all', 'wand', 'pot', 'crystal', 'potion'].map(type => <option key={type} value={type}>{t('shop.category.' + type)}</option>)}
    </select></label>
    <p className="shop-feedback" role="status" aria-live="polite">{feedback ? t(feedback) : ''}</p>
    <div className="shop-grid">{catalog.filter(item => filter === 'all' || item.type === filter).map(item => {
      const consumable = item.type === 'potion';
      const owned = item.default || s.ownedItems.includes(item.id);
      const equipped = s.equippedItems[item.type] === item.id;
      const quantity = consumable ? potionCount(s.potionInventory, item.id) : 0;
      return <article className="shop-card" key={item.id}>
        <small className="shop-item-type">{t('shop.category.' + item.type)}</small>
        <div className="shop-preview" aria-hidden="true"><span
          className={'shop-preview-' + item.type + (consumable ? ' shop-potion-' + (item.model ?? 'vial') : '')}
          style={{backgroundColor:item.color, boxShadow:'0 0 24px ' + item.color + '66'}} /></div>
        <h3>{t(item.name)}</h3><p>{t(item.description, effectValues(item))}</p>
        {consumable && <div className="shop-potion-stock">
          <p>{t('shop.potionQuantity', { count: quantity })}</p>
          <p>{t('shop.potionQuality', { quality: t('potion.quality.' + (item.purchaseQuality ?? 'basic')) })}</p>
        </div>}
        <p>{item.default ? t('shop.free') : '💎 ' + item.price}</p>
        {consumable ? <><button disabled={s.stones < item.price} onClick={() => setFeedback(s.buyPotion(item.id))}>{t('shop.buyPotion')}</button>
          {s.stones < item.price && <small>{t('shop.need', { amount: item.price - s.stones })}</small>}</>
        : owned ? <button disabled={equipped} onClick={() => setFeedback(s.equipItem(item.id))}>
          {t(equipped ? 'shop.equipped' : 'shop.equip')}
        </button> : <><button disabled={s.stones < item.price} onClick={() => setFeedback(s.buyItem(item.id))}>{t('shop.buy')}</button>
          {s.stones < item.price && <small>{t('shop.need', {amount: item.price - s.stones})}</small>}</>}
      </article>;
    })}</div>
  </section>;
}
