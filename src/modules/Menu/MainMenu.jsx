import { useState } from 'react';
import { useGameStore } from '../Stores/GameStore';
import missions from '../../static/missions.json';
import achievements from '../../static/achievements.json';
import pkg from '../../../package.json';
export default function MainMenu() {
 const s = useGameStore();
 const [page, setPage] = useState('main');
 return <section className="menu"><h1>Магическая мастерская</h1><p>Версия {pkg.version}</p>
 {page === 'main' && <>
 <label>Миссия<select value={s.selectedLevel} onChange={e => s.setLevel(e.target.value)}>
 {Object.entries(missions).map(([id,m]) => <option key={id} value={id}>{m.name} · {m.timeLimit ? m.timeLimit + ' сек.' : 'без таймера'} · {'★'.repeat(s.records[id] || 0)}</option>)}
 </select></label>
 <button onClick={() => s.beginMission(s.selectedLevel)}>Играть</button>
 <button onClick={() => setPage('achievements')}>Достижения ({s.unlocked.length}/{achievements.length})</button>
 <button onClick={() => setPage('help')}>Как играть</button></>}
 {page === 'achievements' && <><h2>Достижения</h2>{achievements.map(a => <article key={a.id}><strong>{s.unlocked.includes(a.id) ? '🏆' : '🔒'} {a.name}</strong><p>{a.description}</p></article>)}</>}
 {page === 'help' && <><h2>Как играть</h2><p>Выберите котёл кликом. Нарисуйте V для усиления огня или замкнутый квадрат для ослабления. Температура меняется постепенно.</p><p>Враги: выберите куб кликом и нарисуйте V против синего или квадрат против жёлтого. Они стреляют по котлу и меняют его температуру. Вертикальный жест включает левитацию. Выберите бутылку и подведите к центру котла. Соблюдайте порядок и температуру рецепта.</p><p>Завершите срочную миссию до нуля. Ошибки снимают очки. Награда: базовые stones × звёзды. Esc прерывает миссию.</p></>}
 {page !== 'main' && <button onClick={() => setPage('main')}>Назад</button>}
 </section>;
}