
export const PLAN_PAYMENT_LINKS: Record<string, string> = {
    'plan-corte': 'https://www.asaas.com/c/zm6ots063sxk3gns',
    'plan-barba': 'https://www.asaas.com/c/gdnzq6egvr2y1m2c',
    'plan-corte-barba': 'https://www.asaas.com/c/0aks2fwky0pie2js'
};

const LINKS_BY_NAME: Record<string, string> = {
    'Jhonjhon club Corte': 'https://www.asaas.com/c/zm6ots063sxk3gns',
    'Jhonjhon club Barba': 'https://www.asaas.com/c/gdnzq6egvr2y1m2c',
    'Jhonjhon club Corte & Barba': 'https://www.asaas.com/c/0aks2fwky0pie2js'
};

export function getPaymentLink(plan: { id: string, name: string }): string | null {
    // 1. Tentar pelo ID (caso seja do seed)
    if (PLAN_PAYMENT_LINKS[plan.id]) return PLAN_PAYMENT_LINKS[plan.id];

    // 2. Tentar pelo Nome exato
    if (LINKS_BY_NAME[plan.name]) return LINKS_BY_NAME[plan.name];

    return null;
}
