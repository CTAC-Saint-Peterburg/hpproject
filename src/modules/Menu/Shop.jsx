import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import { shopItems as items, potionTypes } from '../../static/themedConfigs';
import { potionCount, POTION_QUALITIES } from '../Stores/potionInventory';
import { potionPrice } from '../Potions/potionCatalog';
import { potionEffect } from '../Defense/potionEffects';
import CurrencyCoin from './CurrencyCoin';

function effectValues(item, quality) {
  const effects = item.effects ?? {};
  return { ...effects, chance: Math.round((effects.instantKillChance ?? 0) * 100), ...(item.type === 'potion' ? potionEffect(item, quality) : {}),
    radius: effects.splashRadius ?? 0, percent: Math.round((effects.splashMultiplier ?? 0) * 100) };
}

export default function Shop() {
  const { t } = useTranslation();
  const s = useGameStore();
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [qualities,setQualities]=useState({});
  const catalog = [...items, ...potionTypes.map(potion => ({ ...potion, type: 'potion' }))];
  return <section className="shop">
    <h2>{t('shop.title')}</h2><p>{t('shop.intro')}</p>
    <p className="shop-effects-note">{t('shop.arenaEffects')}</p>
    <p className="coin-inline"><CurrencyCoin />{t('hud.balance', {value: s.stones})}</p>
    <label>{t('shop.category')}<select value={filter} onChange={e => setFilter(e.target.value)}>
      {['all', 'wand', 'pot', 'crystal', 'potion', 'upgrade'].map(type => <option key={type} value={type}>{t('shop.category.' + type)}</option>)}
    </select></label>
    <p className="shop-feedback" role="status" aria-live="polite">{feedback ? t(feedback) : ''}</p>
    <div className="shop-grid">{catalog.filter(item => filter === 'all' || item.type === filter).map(item => {
      const consumable = item.type === 'potion';
      const quality=qualities[item.id]??'basic';
      const price=consumable?potionPrice(item,quality):item.price;
      const upgrade = item.type === 'upgrade';
      const owned = item.default || s.ownedItems.includes(item.id);
      const equipped = s.equippedItems[item.type] === item.id;
      const requirement = item.requires ? items.find(entry => entry.id === item.requires) : null;
      const locked = requirement && !s.ownedItems.includes(requirement.id);
      const quantity = consumable ? potionCount(s.potionInventory, item.id) : 0;
      return <article className="shop-card" key={item.id}>
        <small className="shop-item-type">{t('shop.category.' + item.type)}</small>
        <div className="shop-preview" aria-hidden="true">{upgrade ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: item.color }}>
          {Array.from({ length: item.effects.potionSlots ?? item.effects.potionCopies }, (_, index) => <svg key={index} width="22" height="52" viewBox="0 0 22 52">
            <path d="M7 6H15V20L19 27V47H3V27L7 20Z" fill="currentColor" /><path d="M6 2H16V8H6Z" fill="var(--color-potion-stopper)" />
          </svg>)}
        </span> : <span
          className={'shop-preview-' + item.type + (consumable ? ' shop-potion-' + (item.model ?? 'vial') : '')}
          style={{backgroundColor:item.color, boxShadow:'0 0 24px ' + item.color + '66'}} />}</div>
        <h3>{t(item.name)}</h3><p>{t(item.description, effectValues(item,quality))}</p>
        {consumable && <div className="shop-potion-stock">
          <p>{t('shop.potionQuantity', { count: quantity })}</p>
          <label>{t('potion.chooseQuality')}<select value={quality} onChange={event=>setQualities(previous=>({...previous,[item.id]:event.target.value}))}>
            {POTION_QUALITIES.map((q,index)=><option key={q} value={q}>{'★'.repeat(index+1)} · {t('potion.quality.'+q)}</option>)}
          </select></label>
        </div>}
        <p className="coin-inline">{item.default ? t('shop.free') : <><CurrencyCoin />{price}</>}</p>
        {consumable ? <><button disabled={s.stones < price} onClick={() => setFeedback(s.buyPotion(item.id,quality))}>{t('shop.buyPotion')}</button>
          {s.stones < price && <small>{t('shop.need', { amount: price - s.stones })}</small>}</>
        : upgrade && owned ? <button disabled>{t('shop.upgradeActive')}</button>
        : owned ? <button disabled={equipped} onClick={() => setFeedback(s.equipItem(item.id))}>
          {t(equipped ? 'shop.equipped' : 'shop.equip')}
        </button> : <><button disabled={s.stones < item.price || locked} onClick={() => setFeedback(s.buyItem(item.id))}>{t('shop.buy')}</button>
          {locked && <small>{t('shop.upgradeRequires', { name: t(requirement.name) })}</small>}
          {s.stones < item.price && <small>{t('shop.need', {amount: item.price - s.stones})}</small>}</>}
      </article>;
    })}</div>
  </section>;
}
