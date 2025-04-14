import React from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import HowWorks from './components/HowWorks'
import Events from './components/Events'

const App = () => {
  return (
    <div className="font-serif">
      <Navbar/>
      <HeroSection/>
      <HowWorks/>
      {/* <Events/> */}
    </div>
  )
}

export default App
