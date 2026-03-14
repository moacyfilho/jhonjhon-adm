import { env } from './env';
import { formatManausDateTime } from './timezone';

export interface BookingNotificationData {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  servicePrice: number;
  barberName?: string;
  scheduledDate: Date;
  bookingId: string;
  barberPhone?: string;
}

// Helper to call UZAPI directly (Server-to-Server)
async function sendToUzapi(phone: string, text: string) {
  const { WHATSAPP_UZAPI_URL, WHATSAPP_UZAPI_SESSION, WHATSAPP_UZAPI_SESSION_KEY } = env;

  if (!WHATSAPP_UZAPI_URL || !WHATSAPP_UZAPI_SESSION || !WHATSAPP_UZAPI_SESSION_KEY) {
    console.error('[WhatsApp] UZAPI configuration missing in environment variables');
    return { success: false, error: 'Configuration missing' };
  }

  // Normalize phone number to 55 + Number
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone;
  }

  try {
    // Create simple timeout signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout (Netlify limit ~10s)

    console.log(`[WhatsApp] Sending to ${cleanPhone} via ${WHATSAPP_UZAPI_URL}`);

    const response = await fetch(`${WHATSAPP_UZAPI_URL}/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionkey': WHATSAPP_UZAPI_SESSION_KEY,
      },
      body: JSON.stringify({
        session: WHATSAPP_UZAPI_SESSION,
        number: cleanPhone,
        text: text
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      // UZapi bug: retorna HTTP 500 com "msg_not_found" + ID quando a mensagem
      // foi enviada mas o rastreamento interno falhou — tratar como sucesso
      try {
        const errJson = JSON.parse(responseText);
        if (errJson?.error?.code === 'msg_not_found' && errJson?.error?.id) {
          console.log(`[WhatsApp] Enviado (msg_not_found ignorado, id: ${errJson.error.id})`);
          return { success: true };
        }
      } catch {}
      console.error(`[WhatsApp] API Error ${response.status}: ${responseText}`);
      return { success: false, error: `API Error: ${responseText}` };
    }

    console.log('[WhatsApp] Success:', responseText);
    return { success: true };
  } catch (error: any) {
    console.error('[WhatsApp] Fetch Exception:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envia mensagem WhatsApp para o cliente confirmando o agendamento
 */
export async function sendBookingConfirmationToClient(
  data: BookingNotificationData
): Promise<{ success: boolean; error?: string }> {

  const formattedDateTime = formatManausDateTime(data.scheduledDate);

  // Robust split for various date formats
  let dateStr = formattedDateTime;
  let timeStr = '';

  if (formattedDateTime.includes(' às ')) {
    [dateStr, timeStr] = formattedDateTime.split(' às ');
  } else if (formattedDateTime.includes(', ')) {
    [dateStr, timeStr] = formattedDateTime.split(', ');
  } else {
    // Fallback: assume last part is time (e.g. "dd/mm/yyyy HH:mm")
    const parts = formattedDateTime.trim().split(' ');
    if (parts.length > 1) {
      timeStr = parts.pop() || '';
      dateStr = parts.join(' ');
    }
  }

  const barberInfo = data.barberName || 'Barbearia Jhon Jhon';

  const message = `*Olá ${data.clientName}!* 👋\n\n` +
    `Seu agendamento foi confirmado com sucesso! ✅\n\n` +
    `📅 *Data:* ${dateStr}\n` +
    `⏰ *Hora:* ${timeStr}\n` +
    `💈 *Serviço:* ${data.serviceName}\n` +
    `✂️ *Profissional:* ${barberInfo}\n` +
    `💰 *Valor:* R$ ${data.servicePrice.toFixed(2)}\n\n` +
    `📍 _Te esperamos no horário marcado!_\n` +
    `Caso precise reagendar, entre em contato.`;

  console.log(`📱 Notificando cliente: ${data.clientPhone}`);
  return sendToUzapi(data.clientPhone, message);
}

/**
 * Envia mensagem WhatsApp para a barbearia notificando novo agendamento
 */
export async function sendBookingNotificationToBarbershop(
  data: BookingNotificationData
): Promise<{ success: boolean; error?: string }> {

  const formattedDateTime = formatManausDateTime(data.scheduledDate);
  const barberInfo = data.barberName || 'Sem preferência';

  const message = `🔔 *NOVO AGENDAMENTO ONLINE*\n\n` +
    `👤 *Cliente:* ${data.clientName}\n` +
    `📱 *Telefone:* ${data.clientPhone}\n` +
    `📅 *Data/Hora:* ${formattedDateTime}\n` +
    `💈 *Serviço:* ${data.serviceName}\n` +
    `✂️ *Profissional:* ${barberInfo}\n` +
    `💰 *Valor:* R$ ${data.servicePrice.toFixed(2)}`;

  // Número da Barbearia (Admin)
  const barbershopPhone = '5592985950190';

  console.log(`📱 Notificando barbearia: ${barbershopPhone}`);
  return sendToUzapi(barbershopPhone, message);
}

/**
 * Envia mensagem WhatsApp para o barbeiro notificando novo agendamento
 */
export async function sendBookingNotificationToBarber(
  data: BookingNotificationData
): Promise<{ success: boolean; error?: string }> {
  if (!data.barberPhone) return { success: false, error: 'No barber phone provided' };

  const formattedDateTime = formatManausDateTime(data.scheduledDate);

  const message = `🔔 *NOVO AGENDAMENTO*\n\n` +
    `Olá ${data.barberName}, você tem um novo cliente agendado!\n\n` +
    `👤 *Cliente:* ${data.clientName}\n` +
    `📱 *Telefone:* ${data.clientPhone}\n` +
    `📅 *Data/Hora:* ${formattedDateTime}\n` +
    `💈 *Serviço:* ${data.serviceName}\n` +
    `💰 *Valor:* R$ ${data.servicePrice.toFixed(2)}`;

  console.log(`📱 Notificando barbeiro: ${data.barberPhone}`);
  return sendToUzapi(data.barberPhone, message);
}

/**
 * Envia todas as notificações
 */
export async function sendBookingNotifications(
  data: BookingNotificationData
): Promise<{
  clientNotification: { success: boolean; error?: string };
  barbershopNotification: { success: boolean; error?: string };
  barberNotification?: { success: boolean; error?: string };
}> {
  // Array de promises fixas
  const promises: Promise<{ success: boolean; error?: string }>[] = [
    sendBookingConfirmationToClient(data),
    sendBookingNotificationToBarbershop(data),
  ];

  // Adiciona notificação do barbeiro se houver telefone
  if (data.barberPhone) {
    promises.push(sendBookingNotificationToBarber(data));
  }

  const results = await Promise.all(promises);

  // Log detalhado para diagnóstico
  console.log(`[WhatsApp] clientPhone="${data.clientPhone}" → clientNotification:`, JSON.stringify(results[0]));
  console.log(`[WhatsApp] barbershopNotification:`, JSON.stringify(results[1]));
  if (results[2]) console.log(`[WhatsApp] barberNotification:`, JSON.stringify(results[2]));

  return {
    clientNotification: results[0],
    barbershopNotification: results[1],
    barberNotification: results[2], // Será undefined se não tiver barberPhone
  };
}

/**
 * Envia lembrete de agendamento para o cliente (1h antes)
 */
export async function sendAppointmentReminder(
  data: BookingNotificationData
): Promise<{ success: boolean; error?: string }> {

  const formattedDateTime = formatManausDateTime(data.scheduledDate);

  // Robust split for various date formats
  let timeStr = formattedDateTime;
  if (formattedDateTime.includes(' às ')) {
    timeStr = formattedDateTime.split(' às ')[1];
  } else if (formattedDateTime.includes(', ')) {
    // Ex: Qua, 19/02/2026, 14:00
    const parts = formattedDateTime.split(', ');
    timeStr = parts[parts.length - 1]; // Pega a última parte que deve ser a hora
  } else {
    // Fallback: assume last part is time (e.g. "dd/mm/yyyy HH:mm")
    const parts = formattedDateTime.trim().split(' ');
    if (parts.length > 1) {
      timeStr = parts.pop() || '';
    }
  }

  const barberInfo = data.barberName || 'Barbearia Jhon Jhon';

  const message = `⏰ *LEMBRETE DE AGENDAMENTO*\n\n` +
    `Olá *${data.clientName}*! Passando para lembrar do seu horário hoje.\n\n` +
    `🕒 *Horário:* ${timeStr}\n` +
    `💈 *Serviço:* ${data.serviceName}\n` +
    `✂️ *Profissional:* ${barberInfo}\n\n` +
    `📍 _Chegue com 5 minutinhos de antecedência._\n` +
    `Caso não possa comparecer, avise-nos!`;

  console.log(`📱 Enviando lembrete para: ${data.clientPhone}`);
  return sendToUzapi(data.clientPhone, message);
}
