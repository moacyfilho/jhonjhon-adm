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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for production

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

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[WhatsApp] API Error ${response.status}: ${errText}`);
      return { success: false, error: `API Error: ${errText}` };
    }

    // Try to parse JSON strictly
    try {
      const data = await response.json();
      console.log('[WhatsApp] Success:', JSON.stringify(data));
    } catch (e) {
      // Ignore JSON parse error if status was OK
      console.log('[WhatsApp] Sent (Non-JSON response)');
    }

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

  return {
    clientNotification: results[0],
    barbershopNotification: results[1],
    barberNotification: results[2], // Será undefined se não tiver barberPhone
  };
}
