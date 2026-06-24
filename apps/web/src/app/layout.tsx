import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'ZENTRAVIX — Organisation Intelligence Platform',
  description: 'Real-time organisation intelligence for every role',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="spa-redirect" strategy="beforeInteractive">{`
          (function(){
            var p = window.location.search.match(/[?&]p=([^&]+)/);
            if (p) {
              var path = decodeURIComponent(p[1]);
              var q = window.location.search.match(/[?&]q=([^&]+)/);
              var query = q ? '?' + decodeURIComponent(q[1]).replace(/~and~/g, '&') : '';
              window.history.replaceState(null, null, path + query + window.location.hash);
            }
          })();
        `}</Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
