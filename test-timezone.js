// Simular o comportamento da função toManausTime
const MANAUS_OFFSET_HOURS = -4;

function toManausTime(date) {
  return new Date(date.getTime() + (MANAUS_OFFSET_HOURS * 60 * 60 * 1000));
}

// Data do banco: 2026-01-08T23:00:00.000Z
const dateFromDB = new Date('2026-01-08T23:00:00.000Z');

console.log('📅 Teste de Conversão de Fuso Horário\n');
console.log('Data do banco (UTC):', dateFromDB.toISOString());
console.log('Hora UTC:', dateFromDB.getUTCHours() + ':' + dateFromDB.getUTCMinutes());

const manausDate = toManausTime(dateFromDB);
console.log('\n🕐 Após toManausTime():');
console.log('Data completa:', manausDate.toISOString());
console.log('getUTCHours():', manausDate.getUTCHours() + ':' + manausDate.getUTCMinutes());
console.log('getHours():', manausDate.getHours() + ':' + manausDate.getMinutes());

// Testar o format do date-fns
const { format } = require('date-fns');

console.log('\n📊 Testando format() do date-fns:');
console.log('format(manausDate, "HH:mm"):', format(manausDate, 'HH:mm'));
console.log('format(manausDate, "yyyy-MM-dd"):', format(manausDate, 'yyyy-MM-dd'));

// O que deveria ser
console.log('\n✅ ESPERADO: 19:00 (Manaus)');
