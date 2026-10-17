import React from 'react'

import HomePage from "./pages/HomePage";
import CreateRequest from "./pages/CreateRequest";
import NoteDetailPage from "./pages/NoteDetailPage"

const App = () => {
  return (
    <div>
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateRequest />} />
            <Route path="/note/:id" element={<NoteDetailPage />} />
        </Routes>
    </div>
  )
}

export default App;
