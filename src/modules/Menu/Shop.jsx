import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../Stores/GameStore';
import { shopItems as items } from '../../static/themedConfigs';

export default function Shop() {
  const { t } = useTranslation();
  const s = useGameStore();
  const [feedback, setFeedback] = useState('shop.intro');
  const [filter, setFilter] = useState('all');
  return <section className="shop">
    <h2>{t('shop.title')}</h2><p>{t('shop.intro')}</p>
    <p>{t('shop.balance', {stones: s.stones})}</p>
    <label>{t('shop.category')}<select value={filter} onChange={e => setFilter(e.target.value)}>
      {['all', 'wand', 'pot'].map(type => <option key={type} value={type}>{t('shop.category.' + type)}</option>)}
    </select></label>
    <p role="status" aria-live="polite">{t(feedback)}</p>
    <div className="shop-grid">{items.filter(item => filter === 'all' || item.type === filter).map(item => {
      const owned = item.default || s.ownedItems.includes(item.id);
      const equipped = s.equippedItems[item.type] === item.id;
      return <article className="shop-card" key={item.id}>
        <div className="shop-preview" aria-hidden="true"><span className={'shop-preview-' + item.type} style={{backgroundColor:item.color, boxShadow:'0 0 24px ' + item.color + '66'}} /></div>
        <h3>{t(item.name)}</h3><p>{t(item.description)}</p>
        <p>{item.default ? t('shop.free') : '💎 ' + item.price}</p>
        {owned ? <button disabled={equipped} onClick={() => setFeedback(s.equipItem(item.id))}>
          {t(equipped ? 'shop.equipped' : 'shop.equip')}
        </button> : <><button disabled={s.stones < item.price} onClick={() => setFeedback(s.buyItem(item.id))}>{t('shop.buy')}</button>
          {s.stones < item.price && <small>{t('shop.need', {amount: item.price - s.stones})}</small>}</>}
      </article>;
    })}</div>
  </section>;
}
