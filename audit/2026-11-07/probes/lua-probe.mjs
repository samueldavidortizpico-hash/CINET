// Ejecuta RATE_SCRIPT (el real, importado del repo) en Lua 5.3 (fengari) con un Redis en memoria y reloj simulado.
import fengari from "fengari";
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;
const repo = "file:///C:/Users/samue/OneDrive/Escaneos/Documentos/GIT/CINET/server/tmdbProxy.js";
const { RATE_SCRIPT } = await import(repo);
const OLD = `local a=redis.call('INCR',KEYS[1]); if a==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; local b=redis.call('INCR',KEYS[2]); if b==1 then redis.call('PEXPIRE',KEYS[2],ARGV[1]); end; return {a,b,redis.call('PTTL',KEYS[1]),redis.call('PTTL',KEYS[2])}`;

function makeRedis(clock) {
  const data = new Map(); // key -> {v, exp}
  const live = (k) => { const e = data.get(k); if (e && e.exp !== null && e.exp <= clock.now) { data.delete(k); return undefined; } return e; };
  return {
    call(cmd, ...a) {
      switch (cmd) {
        case "GET": { const e = live(a[0]); return e ? String(e.v) : false; }
        case "INCR": { const e = live(a[0]) ?? { v: 0, exp: null }; e.v += 1; data.set(a[0], e); return e.v; }
        case "PEXPIRE": { const e = live(a[0]); if (e) e.exp = clock.now + Number(a[1]); return e ? 1 : 0; }
        case "PTTL": { const e = live(a[0]); if (!e) return -2; return e.exp === null ? -1 : e.exp - clock.now; }
        default: throw new Error("cmd " + cmd);
      }
    },
    data,
  };
}

function evalScript(script, redis, keys, argv) {
  const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
  const push = (v) => typeof v === "number" ? lua.lua_pushinteger(L, v) : v === false ? lua.lua_pushboolean(L, false) : lua.lua_pushstring(L, to_luastring(String(v)));
  lua.lua_newtable(L);
  lua.lua_pushjsfunction(L, (L2) => {
    const n = lua.lua_gettop(L2); const args = [];
    for (let i = 1; i <= n; i++) args.push(lua.lua_type(L2, i) === lua.LUA_TNUMBER ? lua.lua_tonumber(L2, i) : to_jsstring(lua.lua_tostring(L2, i)));
    const r = redis.call(...args); push.call(null, r);
    // push onto L2 (same state)
    return 1;
  });
  lua.lua_setfield(L, -2, to_luastring("call"));
  lua.lua_setglobal(L, to_luastring("redis"));
  const setArr = (name, arr) => { lua.lua_newtable(L); arr.forEach((v, i) => { lua.lua_pushstring(L, to_luastring(String(v))); lua.lua_rawseti(L, -2, i + 1); }); lua.lua_setglobal(L, to_luastring(name)); };
  setArr("KEYS", keys); setArr("ARGV", argv);
  if (lauxlib.luaL_loadstring(L, to_luastring(script)) !== 0 || lua.lua_pcall(L, 0, 1, 0) !== 0) throw new Error(to_jsstring(lua.lua_tostring(L, -1)));
  const out = []; const len = lua.lua_rawlen(L, -1);
  for (let i = 1; i <= len; i++) { lua.lua_rawgeti(L, -1, i); out.push(lua.lua_tointeger(L, -1)); lua.lua_pop(L, 1); }
  return out;
}

const W = 60000;
function run(label, script, decide, seq, clock = { now: 0 }) {
  const redis = makeRedis(clock); const log = [];
  for (const step of seq) {
    if (step.advance) { clock.now += step.advance; continue; }
    const bucket = Math.floor(clock.now / W);
    const keys = script === OLD ? [`id:${step.who}:${bucket}`, `global:${bucket}`] : [`id:${step.who}:${bucket}`, `global:${bucket}`, `rejected:${bucket}`];
    const argv = script === OLD ? [W] : [W, 1, 3];
    log.push(`${step.who}@${clock.now}ms→${decide(evalScript(script, redis, keys, argv))}`);
  }
  console.log(label, log.join("  "), "| global=", redis.data.get(`global:0`)?.v ?? redis.data.get(`global:1`)?.v, "rejected=", redis.data.get("rejected:0")?.v ?? 0);
}
const decideOld = ([a, b]) => (a > 1 || b > 3 ? "429" : "200");
const decideNew = ([ok, reason, ttl]) => (ok === 1 ? "200" : `429(${reason === 1 ? "id" : "global"},ttl=${ttl})`);
const seq = [{ who: "A" }, { who: "A" }, { who: "A" }, { who: "B" }, { who: "C" }, { who: "D" }, { who: "E" }];
console.log("V15 — límite identidad 1, global 3:");
run("  ANTES:", OLD, decideOld, seq);
run("  AHORA:", RATE_SCRIPT, decideNew, seq);
console.log("V19 — frontera de ventana (A agota, se espera a la siguiente ventana):");
run("  AHORA:", RATE_SCRIPT, decideNew, [{ who: "A" }, { who: "A" }, { advance: 59999 }, { who: "A" }, { advance: 1 }, { who: "A" }]);
