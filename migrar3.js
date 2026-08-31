const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Hocxoq-7gunji-moxgop@db.bbjjmcuiwlebqljmwbms.supabase.co:5432/postgres' });
const sql = `
create extension if not exists "uuid-ossp";
create table if not exists negocios (
    id uuid default uuid_generate_v4() primary key,
    nombre text not null,
    owner_email text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create table if not exists menu_items (
    id uuid default uuid_generate_v4() primary key,
    negocio_id uuid references negocios(id) on delete cascade not null,
    nombre text not null,
    precio numeric not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create table if not exists finanzas_registros (
    id uuid default uuid_generate_v4() primary key,
    negocio_id uuid references negocios(id) on delete cascade not null,
    fecha date not null default current_date,
    monto numeric not null,
    tipo text check (tipo in ('Ingreso', 'Gasto')) not null,
    categoria text not null,
    descripcion text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table negocios enable row level security;
alter table menu_items enable row level security;
alter table finanzas_registros enable row level security;
create policy "Permitir todo temporalmente negocios" on negocios for all using (true);
create policy "Permitir todo temporalmente menu" on menu_items for all using (true);
create policy "Permitir todo temporalmente finanzas" on finanzas_registros for all using (true);
insert into negocios (id, nombre, owner_email) values ('11111111-1111-1111-1111-111111111111', 'Restaurante Prueba', 'admin@prueba.com') on conflict do nothing;
`;
client.connect().then(() => client.query(sql)).then(() => {
    console.log('EXITO: Tablas creadas en Supabase.');
    process.exit(0);
}).catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
});
