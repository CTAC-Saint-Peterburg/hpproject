import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Scene from './modules/test/Scene'
import MainMenu from './modules/Menu/MainMenu'
import { useGameStore } from './modules/Stores/GameStore'

function App() {
  const [count, setCount] = useState(0)
  const {startGame} = useGameStore();

  return (
    <>
      <div style={{ width: "60vw", height: "60vh" }}>
      {!startGame && <MainMenu />}
      {!!startGame && <Scene />}
    </div>
    </>
  )
}

export default App
