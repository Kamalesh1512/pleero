import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        background: '#f6f6f7',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#fff',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,.1)',
        }}
      >
        <h1 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: 600 }}>
          Page not found
        </h1>
        <p style={{ margin: '0 0 24px', color: '#6d7175', fontSize: '14px' }}>
          The page you&apos;re looking for doesn&apos;t exist. If you arrived
          here via a link, please contact support.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: '#008060',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
