import type { Metadata } from 'next';
import './globals.css';
import './portal.css';
import './operations.css';
import './workspace.css';
export const metadata: Metadata = { title: 'Clã 71 · Gestão do Clã', description: 'Material, tesouraria e progresso do Clã 71, Agrupamento 1008, Forte da Casa.',icons:{icon:'/logo-cla71.png'} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-PT"><body>{children}</body></html>; }
