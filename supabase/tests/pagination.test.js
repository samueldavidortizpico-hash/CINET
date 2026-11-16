import { after, test } from "node:test";
import assert from "node:assert/strict";
import { applyMigrations, as, asAdmin, createDb, createUsers, errorCode, rpc } from "./db.js";
import { collectDataPages, decodeCursor, readDataPage } from "../../src/services/dataPagination.js";

const id = (n) => `${String(n).padStart(8, "0")}-8888-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1), B = id(2);
const db = await createDb();
after(() => db.close());
await createUsers(db, [{ id: A }, { id: B }]);
await asAdmin(db);
await db.query(`insert into plans(id,owner_id,client_ref,name,mode,title_id,title,place,starts_at,time_zone,details,created_at)
  select ('0000' || lpad(n::text,4,'0') || '-9999-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  $1, 'pagination-'||n, 'Plan '||n, 'home', 'tmdb-movie-1', '{"title":"Uno"}', '{"name":"Casa"}', '2030-01-01T00:00:00Z', 'UTC', '{}',
  case when n <= 225 then '2026-11-15T00:00:00.123456Z'::timestamptz else '2026-11-15T00:00:00.123457Z'::timestamptz end
  from generate_series(1,251) n`, [A]);
await db.query("insert into plan_members(plan_id,user_id,role,display_name) select id,$1,'owner','Ana' from plans", [A]);
const adapter = { rpc: async (name, args) => {
  try {
    const keys = Object.keys(args);
    const rows = (await db.query(`select public.${name}(${keys.map((key,i)=>`${key} => $${i+1}`).join(',')}) as page`, Object.values(args))).rows;
    return { data: rows[0].page };
  } catch (error) { return { error }; }
} };

test("RPC páginas de planes: 251 filas con empates y microsegundos, ninguna duplicada ni saltada", async () => {
  await as(db,A);
  const first = await readDataPage(adapter,"list_plans_page",{ p_group:null });
  assert.equal(first.items.length,50);
  assert.match(decodeCursor(first.nextCursor).createdAt, /\.123456(?:Z|[+-]\d{2}:\d{2})$/);
  const all = await collectDataPages((cursor)=>readDataPage(adapter,"list_plans_page",{p_group:null},{cursor}));
  const expected=(await db.query('select id from plans order by created_at,id')).rows.map(x=>x.id);
  assert.deepEqual(all.map(x=>x.id),expected);
  assert.equal(all.length,251);
  assert.equal(new Set(all.map(x=>x.id)).size,251);
  assert.equal(all[0].plan_members[0].user_id,A);
  const retried=await readDataPage(adapter,"list_plans_page",{p_group:null},{cursor:first.nextCursor});
  const retriedAgain=await readDataPage(adapter,"list_plans_page",{p_group:null},{cursor:first.nextCursor});
  assert.deepEqual(retried,retriedAgain);
});

test("SQL no acepta límite del cliente y RLS no abre planes a ajenos o anon", async () => {
  await as(db,A);
  assert.equal(await errorCode(db.query("select public.list_plans_page(p_limit => 100000)")),"42883");
  assert.equal(await errorCode(rpc(db,'list_plans_page',[null,'2026-11-15',null])),"CN422");
  assert.equal(await errorCode(rpc(db,'list_plans_page',[null,'infinity',id(1)])),"CN422");
  await as(db,B);
  assert.deepEqual((await readDataPage(adapter,"list_plans_page",{p_group:null})).items,[]);
  await as(db);
  assert.equal(await errorCode(rpc(db,'list_plans_page',[])),"42501");
});

let org;
test("aliados: 251 ofertas, orden completo y aislamiento de miembros y auditoría", async () => {
  await asAdmin(db);
  org=(await db.query("insert into organizations(name,kind,official_url,status,created_by) values('Aliado','cinema','https://example.test','verified',$1) returning id",[A])).rows[0].id;
  await db.query("insert into org_members(org_id,user_id,role) values($1,$2,'admin')",[org,A]);
  await db.query("insert into offers(org_id,headline,url,valid_until) select $1,'Oferta '||n,'https://example.test','2030-01-01' from generate_series(1,251)n",[org]);
  await db.query("insert into venues(org_id,name,city) select $1,'Sede '||n,'Bogotá' from generate_series(1,251)n",[org]);
  const venue=(await db.query('select id from venues where org_id=$1 limit 1',[org])).rows[0].id;
  await db.query(`insert into listings(org_id,venue_id,title_id,title,starts_at,valid_until,official_url)
    select $1,$2,'tmdb-movie-1','{"title":"Uno"}','2030-01-01','2030-01-01','https://example.test' from generate_series(1,251)`,[org,venue]);
  await db.query("insert into org_audit(id,org_id,actor,action,entity) overriding system value values(9007199254740992,$1,$2,'test','offers'),(9007199254740993,$1,$2,'test','offers')",[org,A]);
  await as(db,A);
  const all=await collectDataPages((cursor)=>readDataPage(adapter,'list_org_offers_page',{p_org:org},{cursor}));
  assert.equal(all.length,251);
  assert.equal(new Set(all.map(x=>x.id)).size,251);
  for (const name of ['list_org_venues_page','list_org_listings_page']) {
    const list=await collectDataPages((cursor)=>readDataPage(adapter,name,{p_org:org},{cursor}));
    assert.equal(list.length,251,name);
    assert.equal(new Set(list.map(x=>x.id)).size,251,name);
  }
  const audit=await collectDataPages((cursor)=>readDataPage(adapter,'list_org_audit_page',{p_org:org},{cursor,integerId:true}));
  assert.ok(audit.length>200);
  assert.ok(audit.every(row=>typeof row.id==='string'),'bigint conserva identidad sin perder precisión en JSON');
  assert.ok(audit.some(row=>row.id==='9007199254740992'));
  assert.ok(audit.some(row=>row.id==='9007199254740993'));
  for (const name of ['list_groups_page','list_my_organizations_page','list_pending_organizations_page','list_my_org_invites_page']) {
    assert.ok(Array.isArray((await readDataPage(adapter,name)).items),name);
  }
  await as(db,B);
  assert.deepEqual((await readDataPage(adapter,'list_org_members_page',{p_org:org})).items,[]);
  assert.deepEqual((await readDataPage(adapter,'list_org_audit_page',{p_org:org},{integerId:true})).items,[]);
  await as(db);
  const publicOffers=await collectDataPages((cursor)=>readDataPage(adapter,'list_title_offers_page',{p_title:'tmdb-movie-1'},{cursor}));
  assert.deepEqual(publicOffers,[],"ofertas sin ese título no aparecen por filtro");
  const publicListings=await collectDataPages((cursor)=>readDataPage(adapter,'list_title_listings_page',{p_title:'tmdb-movie-1'},{cursor}));
  assert.equal(publicListings.length,251,'cartelera pública tampoco se trunca en 100');
  assert.equal(await errorCode(rpc(db,'cinet_page_envelope',[JSON.stringify(Array(52).fill({}))])), 'CN422');
});

test("invitaciones paginadas no seleccionan token_hash ni exponen correos", async () => {
  await as(db,A);
  const [plan]=(await db.query('select id from plans limit 1')).rows;
  await rpc(db,'create_plan_invite',[plan.id,14,null]);
  const result=await readDataPage(adapter,'list_plan_invites_page',{p_plan:plan.id});
  assert.equal(result.items.length,1);
  assert.equal('token_hash' in result.items[0],false);
  await as(db,B);
  assert.deepEqual((await readDataPage(adapter,'list_plan_invites_page',{p_plan:plan.id})).items,[]);
  assert.deepEqual((await readDataPage(adapter,'list_my_org_invites_page')).items,[]);
});

test("editor no altera identidad ni envenena el cursor con infinity o una fecha inventada", async () => {
  await as(db,A);
  const venue=(await db.query("insert into venues(org_id,name,city,created_at) values($1,'Sede sellada','Bogotá','infinity') returning id,created_at",[org])).rows[0];
  assert.ok(Number.isFinite(venue.created_at.getTime()));
  await db.query("update venues set created_at='-infinity' where id=$1",[venue.id]);
  assert.equal((await db.query('select created_at from venues where id=$1',[venue.id])).rows[0].created_at.toISOString(),venue.created_at.toISOString());
  assert.equal(await errorCode(db.query('update venues set id=$1 where id=$2',[id(800),venue.id])),'CN422');
  const offer=(await db.query("insert into offers(org_id,headline,url,valid_until,created_at) values($1,'Oferta sellada','https://example.test','2030-01-01','10000-01-01') returning created_at",[org])).rows[0];
  assert.ok(Number.isFinite(offer.created_at.getTime()));
  assert.equal(await errorCode(db.query('select * from pagination_timestamp_repairs')),'42501');
});

test("migración conserva la fecha histórica inválida en registro privado sin borrar la publicación", async () => {
  const migration='20261115100000_cursor_pagination.sql';
  const legacy=await createDb({before:migration});
  try {
    await createUsers(legacy,[{id:A}]);
    const legacyOrg=(await legacy.query("insert into organizations(name,kind,official_url,status,created_by) values('Histórico','cinema','https://example.test','verified',$1) returning id",[A])).rows[0].id;
    const venue=(await legacy.query("insert into venues(org_id,name,city,created_at) values($1,'Sede histórica','Bogotá','infinity') returning id",[legacyOrg])).rows[0].id;
    const offer=(await legacy.query("insert into offers(org_id,headline,url,valid_until,created_at) values($1,'Oferta histórica','https://example.test','2030-01-01','10000-01-01') returning id",[legacyOrg])).rows[0].id;
    await applyMigrations(legacy,{from:migration});
    const repairs=(await legacy.query('select table_name,row_id,original_created_at from pagination_timestamp_repairs order by table_name')).rows;
    assert.deepEqual(repairs.map(row=>row.row_id),[offer,venue]);
    assert.match(repairs[0].original_created_at,/10000/);
    assert.equal(repairs[1].original_created_at,'infinity');
    assert.equal((await legacy.query('select name from venues where id=$1',[venue])).rows[0].name,'Sede histórica');
    assert.equal((await legacy.query('select headline from offers where id=$1',[offer])).rows[0].headline,'Oferta histórica');
    const count=(await legacy.query('select count(*)::int as n from venues where isfinite(created_at)')).rows[0].n;
    assert.equal(count,1);
  } finally { await legacy.close(); }
});
