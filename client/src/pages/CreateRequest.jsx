import { useState } from 'react'
import { createRequest } from '../api/requests'

const CreateRequest = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setResult('')

    try {
      setResult(await createRequest({ title, description }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h1>Create request</h1>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Title
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
        </p>
        <p>
          <label>
            Description
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
      {result && <p role="status">{result}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

export default CreateRequest