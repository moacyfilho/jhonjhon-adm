
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

interface AsaasCustomer {
    name: string;
    cpfCnpj?: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
    externalReference?: string;
}

interface AsaasSubscription {
    customer: string; // Asaas Customer ID
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    value: number;
    nextDueDate: string; // YYYY-MM-DD
    cycle: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description?: string;
}

interface AsaasCharge {
    customer: string;
    billingType: 'PIX';
    value: number;
    dueDate: string;
    description?: string;
}

const headers = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
};

export const asaas = {
    async createCustomer(data: AsaasCustomer) {
        if (!ASAAS_API_KEY) return null;

        // Check if customer already exists by email (optional optimization)
        // For now, we just create or return if we stored the ID locally

        const response = await fetch(`${ASAAS_API_URL}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Asaas Create Customer Error:', err);
            throw new Error(`Asaas Error: ${err.errors?.[0]?.description || 'Unknown'}`);
        }

        return response.json();
    },

    async createSubscription(data: AsaasSubscription) {
        if (!ASAAS_API_KEY) return null;

        const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Asaas Create Subscription Error:', err);
            throw new Error(`Asaas Error: ${err.errors?.[0]?.description || 'Unknown'}`);
        }

        return response.json();
    },

    async createPixCharge(data: AsaasCharge) {
        if (!ASAAS_API_KEY) return null;

        const response = await fetch(`${ASAAS_API_URL}/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Asaas Create Payment Error:', err);
            throw new Error(`Asaas Error: ${err.errors?.[0]?.description || 'Unknown'}`);
        }

        const payment = await response.json();

        // Get Pix QR Code
        const qrResponse = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
            method: 'GET',
            headers
        });

        let qrCode = null;
        if (qrResponse.ok) {
            qrCode = await qrResponse.json();
        }

        return { ...payment, qrCode };
    }
};
