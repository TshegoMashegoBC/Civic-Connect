import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowRight, CheckCircle2, HeartHandshake, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import Navbar from '../components/NavBar'
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
    <div className="home-page">
      <Navbar />
      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <div className="badge badge-outline home-eyebrow">
              <span className="home-eyebrow-dot" />
              Your voice. Your community.
            </div>
            <h1>Small actions.<br /><span>Stronger communities.</span></h1>
            <p className="home-hero-description">
              Make your neighborhood a better place to live. Share local concerns,
              connect with your community, and help move things forward.
            </p>
            <div className="home-hero-actions">
              <Link to="/login?next=%2Fcreate" className="btn btn-primary">
                Add a request <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <a href="#community-requests" className="btn btn-ghost">
                Explore the community <ArrowDown aria-hidden="true" size={17} />
              </a>
            </div>
            <div className="home-trust-note">
              <ShieldCheck aria-hidden="true" size={17} />
              A welcoming space for every neighborhood voice
            </div>
          </div>

          <div className="home-hero-art" aria-label="Community connection illustration">
            <div className="home-orbit home-orbit-outer" />
            <div className="home-orbit home-orbit-inner" />
            <div className="home-art-card home-art-main">
              <div className="home-art-icon"><HeartHandshake aria-hidden="true" size={30} /></div>
              <span className="home-art-kicker">Better, together</span>
              <strong>Community starts with listening.</strong>
              <span className="home-art-caption">Every great change begins with a conversation.</span>
              <div className="home-art-people" aria-hidden="true">
                <span>J</span><span>M</span><span>A</span><span className="home-art-people-more">+</span>
              </div>
            </div>
            <div className="home-float-card home-float-location">
              <MapPin aria-hidden="true" size={18} />
              <span><strong>Right here</strong><small>In your community</small></span>
            </div>
            <div className="home-float-card home-float-message">
              <MessageCircle aria-hidden="true" size={18} />
              <span><strong>Your voice matters</strong><small>Be part of the conversation</small></span>
            </div>
            <span className="home-art-spark home-art-spark-one">✳</span>
            <span className="home-art-spark home-art-spark-two">✦</span>
          </div>
        </section>

        <section className="home-values" aria-label="How Civic Connect helps">
          <article className="home-value">
            <span className="home-value-icon"><MessageCircle aria-hidden="true" size={21} /></span>
            <div><h2>Speak up</h2><p>Share the things that matter where you live.</p></div>
          </article>
          <article className="home-value">
            <span className="home-value-icon"><HeartHandshake aria-hidden="true" size={21} /></span>
            <div><h2>Come together</h2><p>Bring neighbors into the conversation.</p></div>
          </article>
          <article className="home-value">
            <span className="home-value-icon"><CheckCircle2 aria-hidden="true" size={21} /></span>
            <div><h2>Make a difference</h2><p>Help turn shared concerns into progress.</p></div>
          </article>
        </section>

        <section id="community-requests" className="home-requests">
          <div className="home-requests-heading">
            <div>
              <span className="home-section-kicker">Community board</span>
              <h2>Requests from your community</h2>
              <p>See what your neighbors are talking about.</p>
            </div>
            <Link to="/login?next=%2Fcreate" className="btn btn-outline btn-sm">
              Add request <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="card home-request-card">
            <div className="card-body">
              {loading && <span className="loading loading-dots loading-md" aria-label="Loading requests" />}
              {error && <p role="alert" className="text-error">{error}</p>}
              {!loading && !error && (
                <>
                  <span className="badge badge-secondary badge-outline">Community update</span>
                  <p>{requests}</p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <span>Civic Connect</span>
        <span>Stronger communities start with us.</span>
      </footer>
    </div>
  )
}

export default HomePage