import twilio from 'twilio';
import { formatManausDateTime } from './timezone';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

if (!accountSid || !authToken || !whatsappFrom) {
  console.error('⚠️ Twilio credentials not configured. WhatsApp notifications will not work.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface BookingNotificationData {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  servicePrice: number;
  barberName?: string;
  scheduledDate: Date;
  bookingId: string;
}

/**
 * Envia mensagem WhatsApp para o cliente confirmando o agendamento
 */
export async function sendBookingConfirmationToClient(
  data: BookingNotificationData
): Promise<{ success: boolean; error?: string }> {
  if (!client || !whatsappFrom) {
    console.error('Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const formattedDateTime = formatManausDateTime(data.scheduledDate);
    const barberInfo = data.barberName ? `\nBarbeiro: ${data.barberName}` : '';

    const message = `🎉 *Agendamento Confirmado - Jhon Jhon Barbearia*\n\n` +
      `Olá ${data.clientName}!\n\n` +
      `Seu agendamento foi confirmado com sucesso:\n\n` +
      `📅 Data/Hora: ${formattedDateTime}${barberInfo}\n` +
      `💈 Serviço: ${data.serviceName}\n` +
      `💰 Valor: R$ ${data.servicePrice.toFixed(2)}\n\n` +
      `📍 Estamos te esperando!\n\n` +
      `Para reagendar ou cancelar, entre em contato conosco.\n\n` +
      `Código do agendamento: ${data.bookingId}`;

    // Remove caracteres não-numéricos do telefone e adiciona "whatsapp:+"
    const cleanPhone = data.clientPhone.replace(/\D/g, '');
    const whatsappTo = `whatsapp:+${cleanPhone}`;

    console.log(`📱 Enviando WhatsApp para cliente: ${whatsappTo}`);

    const result = await client.messages.create({
      from: whatsappFrom,
      to: whatsappTo,
      body: message,
    });

    console.log(`✅ Mensagem enviada para cliente. SID: ${result.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao enviar WhatsApp para cliente:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao enviar mensagem' 
    };
  }
}

/**
 * Envia mensagem WhatsApp para a barbearia notificando novo agendamento
 */
export async function sendBookingNotificationToBarbershop(
  data: BookingNotificationData
): Promise<{ success: boolean; error?: string }> {
  if (!client || !whatsappFrom) {
    console.error('Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const formattedDateTime = formatManausDateTime(data.scheduledDate);
    const barberInfo = data.barberName ? `\nBarbeiro: ${data.barberName}` : ' (Sem preferência de barbeiro)';

    const message = `🔔 *Novo Agendamento Online*\n\n` +
      `Cliente: ${data.clientName}\n` +
      `Telefone: ${data.clientPhone}\n` +
      `Data/Hora: ${formattedDateTime}${barberInfo}\n` +
      `Serviço: ${data.serviceName}\n` +
      `Valor: R$ ${data.servicePrice.toFixed(2)}\n\n` +
      `Código: ${data.bookingId}`;

    // Número da barbearia (hardcoded conforme solicitado)
    const barbershopPhone = 'whatsapp:+5592985950190';

    console.log(`📱 Enviando WhatsApp para barbearia: ${barbershopPhone}`);

    const result = await client.messages.create({
      from: whatsappFrom,
      to: barbershopPhone,
      body: message,
    });

    console.log(`✅ Mensagem enviada para barbearia. SID: ${result.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao enviar WhatsApp para barbearia:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao enviar mensagem' 
    };
  }
}

/**
 * Envia ambas as notificações (cliente e barbearia)
 */
export async function sendBookingNotifications(
  data: BookingNotificationData
): Promise<{
  clientNotification: { success: boolean; error?: string };
  barbershopNotification: { success: boolean; error?: string };
}> {
  const [clientResult, barbershopResult] = await Promise.all([
    sendBookingConfirmationToClient(data),
    sendBookingNotificationToBarbershop(data),
  ]);

  return {
    clientNotification: clientResult,
    barbershopNotification: barbershopResult,
  };
}
