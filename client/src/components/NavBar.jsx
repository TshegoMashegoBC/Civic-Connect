import { Link } from 'react-router'
import { Plus, ScanHeart } from 'lucide-react'

const Navbar = () => {
  return (
    <header className="civic-navbar">
      <nav className="navbar civic-navbar-inner" aria-label="Main navigation">
        <Link to="/" className="civic-brand" aria-label="Civic Connect home">
          <span className="civic-brand-mark"><ScanHeart aria-hidden="true" /></span>
          <span>Civic<span className="civic-brand-accent">Connect</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login?next=%2Fcreate" className="btn btn-ghost btn-sm">Log in</Link>
          <Link to="/login?mode=signup&next=%2Fcreate" className="btn btn-ghost btn-sm">Sign up</Link>
          <Link to="/login?next=%2Fcreate" className="btn btn-primary btn-sm sm:btn-md">
            <Plus aria-hidden="true" size={18} />
            Add request
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Navbar