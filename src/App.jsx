import './App.css';
import Scene from './modules/test/Scene';
import MainMenu from './modules/Menu/MainMenu';
import GameHud from './modules/GameHud';
import { useGameStore } from './modules/Stores/GameStore';
import DefenseScene from './modules/Defense/DefenseScene';
import { useDefenseStore } from './modules/Defense/DefenseStore';
export default function App() {
  const runId = useGameStore(s => s.runId);
  const playing = useGameStore(s => s.startGame);
  const defense = useDefenseStore(s => s.phase !== 'idle');
  if (defense) return <main className="app"><DefenseScene /></main>;
  return <main className="app">{playing ? <Scene key={runId} /> : <MainMenu />}<GameHud /></main>;
}

