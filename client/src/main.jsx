import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App'
//import './index.css'
//import {RouterProvider} from 'react-router'

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <App />
  </StrictMode>
)