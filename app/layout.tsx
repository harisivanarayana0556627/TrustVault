import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'TrustVault — Secure document access', description: 'Document-level access control with an auditable history.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
