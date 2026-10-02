import type {NextConfig} from 'next';
const config:NextConfig={output:'standalone',experimental:{serverActions:{bodySizeLimit:'12mb'}},async headers(){return [{source:'/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}];}};
export default config;
