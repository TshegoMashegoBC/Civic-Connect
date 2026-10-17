import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getRequests } from '../api/requests'

const HomePage = () => {
  const [requests, setRequests] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRequests()
      .then(setRequests)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <h1>Requests</h1>
      {loading && <p>Loading requests…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && <p>{requests}</p>}
      <p>
        To try the detail endpoint, open <Link to="/note/demo">a sample request</Link>.
      </p>
    </section>
  )
}

export default HomePage