import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <p className="font-mono text-[64px] font-bold leading-none text-ink">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">Off the route map</h1>
      <p className="mt-2 text-muted">
        There's no page at <code className="break-all rounded bg-paper px-1.5 py-0.5 text-ink">{pathname}</code>. It may have moved, or the link has a typo.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="btn btn-primary">{isAuthenticated ? 'Back to dashboard' : 'Go to home'}</Link>
        <Link to="/track" className="btn btn-ghost">Track cargo</Link>
      </div>
    </section>
  );
}
