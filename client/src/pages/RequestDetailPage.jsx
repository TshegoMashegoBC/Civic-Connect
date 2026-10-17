import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { deleteRequest, getRequest, updateRequest } from '../api/requests'

const RequestDetailPage = () => {
  const { id } = useParams()
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRequest(id)
      .then(setResult)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleUpdate() {
    setError('')
    try {
      setResult(await updateRequest(id, {}))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleDelete() {
    setError('')
    try {
      setResult(await deleteRequest(id))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <section>
      <h1>Request {id}</h1>
      {loading && <p>Loading request…</p>}
      {result && <p role="status">{result}</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && (
        <>
          <button type="button" onClick={handleUpdate}>Update request</button>
          <button type="button" onClick={handleDelete}>Delete request</button>
        </>
      )}
      <p><Link to="/">Back to requests</Link></p>
    </section>
  )
}

export default RequestDetailPage
