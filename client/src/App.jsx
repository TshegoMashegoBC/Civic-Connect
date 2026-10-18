import { Link, Route, Routes } from 'react-router'
import CreateRequest from './pages/CreateRequest'
import HomePage from './pages/HomePage'
import LoginPage from './pages/loginPage'
import RequestDetailPage from './pages/RequestDetailPage'

const App = () => {
  return (
    <div data-theme="valentine">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create" element={<CreateRequest />} />
        <Route path="/note/:id" element={<RequestDetailPage />} />
      </Routes>
    </div>
  )
}

export default App;
