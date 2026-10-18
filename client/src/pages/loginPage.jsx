const LoginPage = () => {
  return (
    <main className="login-page">
      <section className="login-panel">
        <h1 className="login-heading">Civic Connect</h1>
        <form className="card login-card" onSubmit={(event) => event.preventDefault()}>
          <div className="card-body">
            <h2 className="card-title">Log in</h2>

            <label className="form-control w-full">
              <span className="label-text">Email</span>
              <input
                className="input input-bordered w-full"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text">Password</span>
              <input
                className="input input-bordered w-full"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </label>

            <button className="btn btn-primary w-full" type="submit">
              Log in
            </button>
            <button className="btn btn-secondary w-full" type="button">
              Sign up
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
