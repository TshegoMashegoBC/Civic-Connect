import { Link, Route, Routes } from 'react-router'
import CreateRequest from './pages/CreateRequest'
import HomePage from './pages/HomePage'
import RequestDetailPage from './pages/RequestDetailPage'

const App = () => {
  return (
    <main>
      <nav aria-label="Main navigation">
        <Link to="/">Requests</Link>
        {' | '}
        <Link to="/create">Create request</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateRequest />} />
        <Route path="/note/:id" element={<RequestDetailPage />} />
      </Routes>
    </main>
  )
}

export default App;
