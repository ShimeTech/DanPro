import { Link, Outlet, useLocation } from 'react-router-dom';

export default function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="public-layout">
      <header className={isHome ? 'public-header public-header-home' : 'public-header'}>
        <div className="public-brand">
          <span className="public-logo">B</span>
          <div>
            <strong>BuildPro IMS</strong>
            <small>Construction Integrated Management System</small>
          </div>
        </div>

        <nav className="public-nav">
          <Link to="/">Home</Link>
          <a href="/#about">About</a>
          <a href="/#sectors">Our Work</a>
          <a href="/#system">System</a>
          <a href="/#contact">Contact</a>
          <Link to="/login" className="public-login">
            Login
          </Link>
        </nav>
      </header>

      <Outlet />
    </div>
  );
}