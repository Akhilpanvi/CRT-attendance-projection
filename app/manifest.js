// Web app manifest: lets students add the Tracker to their home screen
export default function manifest() {
  return {
    name: 'CRT Attendance Tracker',
    short_name: 'CRT Y24',
    description: 'Y-24 CRT attendance at a glance — an independent, student-developed portal.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1b3d',
    theme_color: '#0f1b3d',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
