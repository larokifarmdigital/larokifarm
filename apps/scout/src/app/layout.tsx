import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Scout · Comparador de precios farmacéuticos',
  description:
    'Compara precios de productos farmacéuticos y de parafarmacia en decenas de farmacias online españolas en tiempo real.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Scout',
  },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// IntersectionObserver global · añade `.in-view` al entrar en viewport.
const motionInitScript = `
(function(){
  if(!('IntersectionObserver' in window))return;
  function init(){
    var els=document.querySelectorAll('[data-reveal]:not(.in-view)');
    if(!els.length)return;
    var io=new IntersectionObserver(function(entries){
      for(var i=0;i<entries.length;i++){
        if(entries[i].isIntersecting){
          entries[i].target.classList.add('in-view');
          io.unobserve(entries[i].target);
        }
      }
    },{threshold:0.12,rootMargin:'0px 0px -60px 0px'});
    els.forEach(function(el){io.observe(el);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  new MutationObserver(function(){init();}).observe(document.body,{childList:true,subtree:true});
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script dangerouslySetInnerHTML={{ __html: motionInitScript }} />
      </body>
    </html>
  );
}
