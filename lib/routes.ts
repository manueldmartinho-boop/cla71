export const viewPaths = {dashboard:'/',materials:'/material',finance:'/financas',loans:'/emprestimos',people:'/pessoas',progress:'/progresso',profile:'/perfil',settings:'/definicoes'} as const;
export type View=keyof typeof viewPaths;
export function viewForPath(path:string):View {
 if(path==='/material'||path.startsWith('/material/'))return 'materials';
 if(path==='/financas'||path.startsWith('/financas/'))return 'finance';
 if(path==='/emprestimos')return 'loans';
 if(path==='/pessoas')return 'people';
 if(path==='/progresso'||path.startsWith('/progresso/'))return 'progress';
 if(path==='/perfil')return 'profile';
 if(path==='/definicoes')return 'settings';
 return 'dashboard';
}
export const SITE_URL='https://cla71.vercel.app';
export const PASSWORD_RESET_URL=SITE_URL+'/recuperar-password';
