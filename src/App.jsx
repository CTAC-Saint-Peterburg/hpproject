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
import './modules/Display/Mobile54.css';
import ScreenOrientation from './modules/Display/ScreenOrientation';
import { isGameplayScreen } from './modules/Display/screenMode';
import { useTriptychStore } from './modules/Menu/triptychStore';
export default function App() {
  const runId = useGameStore(s => s.runId);
  const playing = useGameStore(s => s.startGame);
  const defense = useDefenseStore(s => s.phase !== 'idle');
  const status = useGameStore(s => s.status), arenaPhase = useDefenseStore(s => s.phase), menuPhase = useTriptychStore(s => s.phase);
  const gameplay = isGameplayScreen(playing, status, arenaPhase, menuPhase);
  return <main className={'app ' + (gameplay ? 'screen-game' : 'screen-menu')}><ScreenOrientation gameplay={gameplay} /><AndroidLifecycle /><GameAudio /><GlobalInput /><GameFrame active={gameplay}>{defense ? <DefenseScene /> : <>{playing && <Scene key={runId} />}<GameHud /></>}{gameplay && <TargetPrompt />}</GameFrame><TriptychMenu activeGame={defense || playing} /><CheatsMenu /></main>;
}

