import './App.css';
import './modules/Menu/Triptych.css';
import Scene from './modules/test/Scene';
import TriptychMenu from './modules/Menu/TriptychMenu';
import GameHud from './modules/GameHud';
import { useGameStore } from './modules/Stores/GameStore';
import DefenseScene from './modules/Defense/DefenseScene';
import { useDefenseStore } from './modules/Defense/DefenseStore';
import CheatsMenu from './modules/Cheats/CheatsMenu';
import GameAudio from './modules/Audio/GameAudio';
import GlobalInput from './modules/Input/GlobalInput';
import AndroidLifecycle from './modules/Input/AndroidLifecycle';
import GameFrame from './modules/Display/GameFrame';
import TargetPrompt from './modules/Display/TargetPrompt';
import './modules/Display/ResponsiveUI.css';
import './modules/Menu/ModeSelector.css';
export default function App() {
  const runId = useGameStore(s => s.runId);
  const playing = useGameStore(s => s.startGame);
  const defense = useDefenseStore(s => s.phase !== 'idle');
  return <main className="app"><AndroidLifecycle /><GameAudio /><GlobalInput /><GameFrame active={defense || playing}>{defense ? <DefenseScene /> : <>{playing && <Scene key={runId} />}<GameHud /></>}{(playing || defense) && <TargetPrompt />}</GameFrame><TriptychMenu activeGame={defense || playing} /><CheatsMenu /></main>;
}

