import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Scene from './modules/test/Scene'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div style={{ width: "60vw", height: "60vh" }}>
      <Scene />
    </div>
    </>
  )
}

export default App
