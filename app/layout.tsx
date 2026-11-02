import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Sequence — Prompt Studio',description:'Build, run, and refine your prompt chains.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}</body></html>}
