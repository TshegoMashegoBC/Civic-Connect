import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Send } from 'lucide-react'
import Navbar from '../components/NavBar'
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
    <div className="request-page">
      <Navbar />
      <main className="request-main">
        <Link to="/" className="link request-back">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to community
        </Link>
        <header className="request-intro">
          <span className="badge badge-outline">Community request</span>
          <h1>What would you like to improve?</h1>
          <p>Tell your neighbors what matters to you. Clear details help everyone understand the request.</p>
        </header>
        <form className="card request-card" onSubmit={handleSubmit}>
          <div className="card-body">
            <label className="form-control w-full">
              <span className="label-text font-semibold">Request title</span>
              <input
                className="input input-bordered w-full"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Add a crosswalk near the park"
              />
              <span className="label-text-alt mt-1">Keep it short and specific.</span>
            </label>
            <label className="form-control w-full">
              <span className="label-text font-semibold">Details</span>
              <textarea
                className="textarea textarea-bordered min-h-36 w-full"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue and how it affects your community..."
                rows={5}
              />
            </label>
            {result && <div className="alert alert-success" role="status">{result}</div>}
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <button className="btn btn-primary mt-1" type="submit" disabled={submitting}>
              {submitting ? (
                <span className="loading loading-spinner loading-sm" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" size={17} />
              )}
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
        <p className="request-note">Your request helps bring neighbors together around local change.</p>
      </main>
    </div>
  )
}

export default CreateRequest