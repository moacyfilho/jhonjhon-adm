const { format } = require('date-fns');

// Simular a função toManausTime ATUAL
function toManausTimeCURRENT(date) {
  const MANAUS_OFFSET_HOURS = -4;
  return new Date(date.getTime() + (MANAUS_OFFSET_HOURS * 60 * 60 * 1000));
}

// Data do banco: 23:00 UTC
const dateFromDB = new Date('2026-01-08T23:00:00.000Z');

console.log('🔍 TESTANDO CONVERSÃO:\n');
console.log('Data do banco (UTC):', dateFromDB.toISOString());
console.log('Hora UTC:', dateFromDB.getUTCHours() + ':00');

// Aplicar toManausTime
const manausDate = toManausTimeCURRENT(dateFromDB);

console.log('\n📍 Após toManausTime():');
console.log('ISO:', manausDate.toISOString());
console.log('getUTCHours():', manausDate.getUTCHours());
console.log('getHours():', manausDate.getHours());

// Testar format
const formattedTime = format(manausDate, 'HH:mm');
console.log('\n📊 format(manausDate, "HH:mm"):', formattedTime);

console.log('\n✅ ESPERADO: 19:00');
console.log('❌ OBTIDO:', formattedTime);

// Explicação
console.log('\n💡 EXPLICAÇÃO:');
console.log('date-fns format() usa getHours() que retorna hora LOCAL do servidor');
console.log('getHours() considera o timezone do servidor, não o UTC!');
console.log('Se o servidor está em GMT-4, getHours() de 19:00 UTC retorna 15:00!');

// Teste correto
console.log('\n🎯 SOLUÇÃO:');
console.log('Devemos usar getUTCHours() em vez de format():');
const hours = String(manausDate.getUTCHours()).padStart(2, '0');
const minutes = String(manausDate.getUTCMinutes()).padStart(2, '0');
console.log('Horário correto:', hours + ':' + minutes);
