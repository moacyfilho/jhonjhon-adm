
export const PLAN_PAYMENT_LINKS: Record<string, string> = {
    'plan-corte': 'https://www.asaas.com/c/zm6ots063sxk3gns',
    'plan-barba': 'https://www.asaas.com/c/gdnzq6egvr2y1m2c',
    'plan-corte-barba': 'https://www.asaas.com/c/0aks2fwky0pie2js',
    // Exclusive plans
    'plan-exclusive-corte': 'https://www.asaas.com/c/zplpo5yvf2mzljl4',
    'plan-exclusive-barba': 'https://www.asaas.com/c/8vh6zapfornvrhd4',
    'plan-exclusive-combo': 'https://www.asaas.com/c/gmpqt581ws81umbs'
};

const LINKS_BY_NAME: Record<string, string> = {
    'Jhonjhon club Corte': 'https://www.asaas.com/c/zm6ots063sxk3gns',
    'Jhonjhon club Barba': 'https://www.asaas.com/c/gdnzq6egvr2y1m2c',
    'Jhonjhon club Corte & Barba': 'https://www.asaas.com/c/0aks2fwky0pie2js',
    // Exclusive plans
    'Assinatura Exclusiva - Só Corte': 'https://www.asaas.com/c/zplpo5yvf2mzljl4',
    'Assinatura Exclusiva - Só Barba': 'https://www.asaas.com/c/8vh6zapfornvrhd4',
    'Assinatura Exclusiva - Combo (Corte + Barba)': 'https://www.asaas.com/c/gmpqt581ws81umbs'
};

export function getPaymentLink(plan: { id: string, name: string }): string | null {
    // 1. Tentar pelo ID (caso seja do seed)
    if (PLAN_PAYMENT_LINKS[plan.id]) return PLAN_PAYMENT_LINKS[plan.id];

    // 2. Tentar pelo Nome exato
    if (LINKS_BY_NAME[plan.name]) return LINKS_BY_NAME[plan.name];

    // 3. Tentar Match Robusto (Keywords)
    const normalized = plan.name.toLowerCase().trim();

    // 4. Mapear nomes dos Planos Exclusivos (usar links exclusivos, não os do club)
    if (normalized.includes('exclusiva') && normalized.includes('combo')) return LINKS_BY_NAME['Assinatura Exclusiva - Combo (Corte + Barba)'];
    if (normalized.includes('exclusiva') && normalized.includes('só corte')) return LINKS_BY_NAME['Assinatura Exclusiva - Só Corte'];
    if (normalized.includes('exclusiva') && normalized.includes('só barba')) return LINKS_BY_NAME['Assinatura Exclusiva - Só Barba'];
    // Fallback robusto para 'exclusiva' + 'corte' se não for 'só corte'
    if (normalized.includes('exclusiva') && normalized.includes('corte') && normalized.includes('barba')) return LINKS_BY_NAME['Assinatura Exclusiva - Combo (Corte + Barba)'];
    if (normalized.includes('exclusiva') && normalized.includes('corte')) return LINKS_BY_NAME['Assinatura Exclusiva - Só Corte'];
    if (normalized.includes('exclusiva') && normalized.includes('barba')) return LINKS_BY_NAME['Assinatura Exclusiva - Só Barba'];

    // 5. Match Padrão (Planos comuns)
    if (normalized.includes('corte') && normalized.includes('barba')) return LINKS_BY_NAME['Jhonjhon club Corte & Barba'];
    if (normalized.includes('corte')) return LINKS_BY_NAME['Jhonjhon club Corte'];
    if (normalized.includes('barba')) return LINKS_BY_NAME['Jhonjhon club Barba'];

    return null;
}
