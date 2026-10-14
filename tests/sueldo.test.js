import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liquidar,liq,mins,pagoSem,mesTrabajo} from '../js/logica/sueldo.js';
import {ejemplo} from '../js/estado.js';

/* Parámetros: BPC $6.864, sin hijos, sin cónyuge, bono fijo $0. Tolerancia ±$1. */
var P={rateCom:399.62,rateEsp:199.81,hijos:0,conyuge:false,otros:0,bpc:6864};
function caso(nominal,extra){return liquidar(Object.assign({nominal:nominal,bono:0,minCom:0,minEsp:0},P,extra||{}))}
function desc(L){return L.mont+L.fon+L.frl+L.irpf+L.otros}
function cerca(a,b,msg){assert.ok(Math.abs(a-b)<=1,msg+': '+a.toFixed(2)+' vs '+b)}

test('solo sueldo, sin extras',function(){
  var L=caso(47954.63);
  cerca(L.N,47954.63,'nominal');
  cerca(desc(L),9399.11,'descuentos');
  cerca(L.liquido,38555.52,'líquido');
});

test('octubre 2026: 140 min de semana (2,5 h) + 1.340 min de finde/feriado',function(){
  var L=caso(47954.63,{minCom:150,minEsp:1340,bono:99.91*1340/60});
  cerca(L.N,55647.43,'nominal');
  cerca(desc(L),10906.90,'descuentos');
  cerca(L.liquido,44740.53,'líquido');
});

test('octubre 2026 desde el estado de ejemplo (horas del Excel)',function(){
  var s=ejemplo();
  assert.equal(mesTrabajo(s),'2026-10');
  assert.equal(mins(s,'sem'),140);
  assert.equal(mins(s,'fin'),1340);
  assert.equal(pagoSem(s),150);
  var L=liq(s,true);
  cerca(L.N,55647.43,'nominal');
  cerca(desc(L),10906.90,'descuentos');
  cerca(L.liquido,44740.53,'líquido');
});

test('recibo real de agosto 2026 (haberes 61.749,81)',function(){
  var L=caso(61749.81);
  cerca(desc(L),12102.96,'descuentos (recibo: 12.102,81)');
  cerca(desc(L),12102.81,'descuentos contra el recibo');
  cerca(L.liquido,49646.85,'líquido');
  cerca(L.liquido,49647,'líquido contra el recibo');
});

test('recibo real de septiembre 2026 (haberes 53.589,33)',function(){
  var L=caso(53589.33);
  cerca(desc(L),10503.51,'descuentos (recibo: 10.503,33)');
  cerca(desc(L),10503.33,'descuentos contra el recibo');
  cerca(L.liquido,43085.82,'líquido');
  cerca(L.liquido,43086,'líquido contra el recibo');
});

test('redondeo de minutos de semana a la media hora más cercana',function(){
  var s=ejemplo();s.horas=[{id:'a',fecha:'2026-10-05',tipo:'sem',min:265}];
  assert.equal(pagoSem(s),270);
  s.horas[0].min=245;assert.equal(pagoSem(s),240);
  s.perfil.horas.redondeo='no';assert.equal(pagoSem(s),245);
  s.perfil.horas.redondeo='cuarto';assert.equal(pagoSem(s),240);
  s.horas[0].min=263;assert.equal(pagoSem(s),270);
});
