export const dynamic = 'force-static'

export default function Home() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
      />
      <link rel="stylesheet" href="/static/styles.css" />

      <div id="root"></div>

      {/* Three.js */}
      <script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js" defer />
      <script
        src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"
        defer
      />
      {/* Main app */}
      <script src="/static/app.js" defer />
    </>
  )
}
