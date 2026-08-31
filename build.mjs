import { readFile, mkdir, writeFile } from 'node:fs/promises';

const html=await readFile('index.html','utf8');
const hasOverride=process.env.SUPABASE_URL!==undefined||process.env.SUPABASE_PUBLISHABLE_KEY!==undefined;
let embedded={};
if(!hasOverride){
  const value=html.match(/window\.BRIEV_CONFIG\s*=\s*(\{[^;]*\});/);
  if(value){try{embedded=JSON.parse(value[1]);}catch{throw new Error('La configuración pública del HTML no es JSON válido.');}}
}
const supabaseUrl=(hasOverride?process.env.SUPABASE_URL:embedded.supabaseUrl)?.trim();
const supabaseKey=(hasOverride?process.env.SUPABASE_PUBLISHABLE_KEY:embedded.supabaseKey)?.trim();
if(!supabaseUrl||!supabaseKey)throw new Error('Configura ambas variables SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY, o utiliza el HTML con configuración pública incluida.');
const url=new URL(supabaseUrl);
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('SUPABASE_URL debe ser una URL HTTPS de proyecto, sin credenciales.');
let allowed=supabaseKey.startsWith('sb_publishable_');
if(!allowed){try{allowed=JSON.parse(Buffer.from(supabaseKey.split('.')[1],'base64url').toString()).role==='anon';}catch{}}
if(!allowed)throw new Error('Usa una clave publishable o anon. NUNCA service_role ni una secret key.');
const config=JSON.stringify({supabaseUrl:url.origin,supabaseKey}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const marker=/\/\* BRIEV_CONFIG_START \*\/[\s\S]*?\/\* BRIEV_CONFIG_END \*\//;
if(!marker.test(html))throw new Error('No se encontró el bloque de configuración del HTML.');
await mkdir('dist',{recursive:true});
await writeFile('dist/index.html',html.replace(marker,()=>`/* BRIEV_CONFIG_START */\nwindow.BRIEV_CONFIG = ${config};\n/* BRIEV_CONFIG_END */`));
console.log('Briev listo: dist/index.html. No se imprimieron claves.');
