import './App.css';
import Scene from './modules/test/Scene';
import MainMenu from './modules/Menu/MainMenu';
import GameHud from './modules/GameHud';
import { useGameStore } from './modules/Stores/GameStore';
import DefenseScene from './modules/Defense/DefenseScene';
import { useDefenseStore } from './modules/Defense/DefenseStore';
import CheatsMenu from './modules/Cheats/CheatsMenu';
import GameAudio from './modules/Audio/GameAudio';
import GlobalInput from './modules/Input/GlobalInput';
import AndroidLifecycle from './modules/Input/AndroidLifecycle';
export default function App() {
  const runId = useGameStore(s => s.runId);
  const playing = useGameStore(s => s.startGame);
  const defense = useDefenseStore(s => s.phase !== 'idle');
  return <main className="app"><AndroidLifecycle /><GameAudio /><GlobalInput />{defense ? <DefenseScene /> : <>{playing ? <Scene key={runId} /> : <MainMenu />}<GameHud /></>}<CheatsMenu /></main>;
}

