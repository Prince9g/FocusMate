import React from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import HowWorks from './components/HowWorks'
import Events from './components/Events'
import { Outlet } from 'react-router-dom'
import { Footer } from './components/Footer'

const App = () => {
  return (
    <div className="font-serif">
      <Navbar/>
      <Outlet/>
      <Footer/>
    </div>
  )
}

export default App
