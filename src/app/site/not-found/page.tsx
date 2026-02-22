export default function SiteNotFound() {
  return (
    <html lang="en">
      <head>
        <title>Site Not Available</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '12px' }}>
            This site is not yet available
          </h1>
          <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '400px', margin: '0 auto 40px' }}>
            The website you&apos;re looking for is being set up. Please check back soon.
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>
            Powered by{' '}
            <a
              href="https://brightautomations.org"
              style={{ color: '#2E7D8A', textDecoration: 'none' }}
            >
              Bright Automations
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}
