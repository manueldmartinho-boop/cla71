import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Clã 71 · Gestão do clã', description: 'Material e tesouraria do Clã 71, Agrupamento 1008, Forte da Casa.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-PT"><body>{children}</body></html>; }
