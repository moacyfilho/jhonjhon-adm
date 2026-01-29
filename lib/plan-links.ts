
export const PLAN_PAYMENT_LINKS: Record<string, string> = {
    'plan-corte': 'https://www.asaas.com/c/zm6ots063sxk3gns',
    'plan-barba': 'https://www.asaas.com/c/gdnzq6egvr2y1m2c',
    'plan-corte-barba': 'https://www.asaas.com/c/0aks2fwky0pie2js'
};

export function getPaymentLink(planId: string): string | null {
    return PLAN_PAYMENT_LINKS[planId] || null;
}
