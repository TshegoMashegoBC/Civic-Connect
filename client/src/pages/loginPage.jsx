import { useNavigate, useSearchParams } from 'react-router'
import toast from 'react-hot-toast'
import Navbar from '../components/NavBar'

const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const pageMode = searchParams.get('mode')
  const signUpMode = pageMode === 'signup'

  function toggleMode() {
    const nextMode = signUpMode ? 'login' : 'signup'
    setSearchParams((currentParams) => {
      const updatedParams = new URLSearchParams(currentParams)
      updatedParams.set('mode', nextMode)
      return updatedParams
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const destination = searchParams.get('next')
    const nextPath = destination?.startsWith('/') && !destination.startsWith('//')
      ? destination
      : '/create'

    if (signUpMode) {
      toast.success('Welcome to Civic Connect!')
    } else {
      toast.success('Welcome back!')
    }
    navigate(nextPath)
  }

  return (
    <div className="auth-page">
      <Navbar />
      <main className="login-page">
        <section className="login-panel">
          <div className="login-intro">
            <span className="badge badge-outline">{signUpMode ? 'Join your community' : 'Welcome back'}</span>
            <h1 className="login-heading">Civic Connect</h1>
            <p>{signUpMode ? 'Create an account to help make a difference.' : 'Sign in to stay connected with your community.'}</p>
          </div>
          <form className="card login-card" noValidate onSubmit={handleSubmit}>
            <div className="card-body">
              <h2 className="card-title">{signUpMode ? 'Sign up' : 'Log in'}</h2>

              <label className="form-control w-full">
                <span className="label-text">Email</span>
                <input
                  className="input input-bordered w-full"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>

              <label className="form-control w-full">
                <span className="label-text">Password</span>
                <input
                  className="input input-bordered w-full"
                  type="password"
                  name="password"
                  autoComplete={signUpMode ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
                />
              </label>

              <button className="btn btn-primary w-full" type="submit">
                {signUpMode ? 'Create account' : 'Log in'}
              </button>
              <button className="btn btn-secondary btn-outline w-full" type="button" onClick={toggleMode}>
                {signUpMode ? 'I already have an account' : 'Sign up'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
