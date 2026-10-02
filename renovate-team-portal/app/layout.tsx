import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Team Member Portal | The Renovate Team',description:'Private team workspace for The Renovate Team.',manifest:'/manifest.webmanifest',icons:{icon:'/renovate-team-logo.png',apple:'/renovate-team-logo.png'}};
export const viewport: Viewport={themeColor:'#15252b',width:'device-width',initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
