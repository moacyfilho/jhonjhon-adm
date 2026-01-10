import { useCallback } from "react";

export function useMask() {
    const maskPhone = useCallback((value: string) => {
        return value
            .replace(/\D/g, "")
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .replace(/(-\d{4})\d+?$/, "$1");
    }, []);

    const maskCurrency = useCallback((value: string) => {
        const amount = value.replace(/\D/g, "");
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(Number(amount) / 100);
    }, []);

    const unmask = useCallback((value: string) => {
        return value.replace(/\D/g, "");
    }, []);

    return { maskPhone, maskCurrency, unmask };
}
