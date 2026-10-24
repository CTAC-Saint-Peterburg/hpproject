import './App.css';
import Scene from './modules/test/Scene';
import MainMenu from './modules/Menu/MainMenu';
import GameHud from './modules/GameHud';
import { useGameStore } from './modules/Stores/GameStore';
export default function App() {
  const runId = useGameStore(s => s.runId);
  const playing = useGameStore(s => s.startGame);
  return <main className="app">{playing ? <Scene key={runId} /> : <MainMenu />}<GameHud /></main>;
}

