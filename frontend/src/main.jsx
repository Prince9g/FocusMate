import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Events from './components/Events.jsx';
import HeroSection from './components/HeroSection.jsx';
import HowWorks from './components/HowWorks.jsx';
import HomePage from './components/HomePage.jsx';
import Room from './components/Room.jsx';

const router = createBrowserRouter([
  {
    path:'/',
    element: <App />,
    children:[
      {
        path:'/',
        element: <HomePage/>
      },
      {
        path:'/events',
        element: <Events/>
      },
      {
        path:'/how-it-works',
        element: <HowWorks/>
      },
    ]
  },
  {
    path:'/room/:roomId',
    element : <Room/>
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
