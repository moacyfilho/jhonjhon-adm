'use client';

import { useEffect } from "react";

export function VersionLogger() {
    useEffect(() => {
        console.log("%c --- JHON JHON ADMIN V3.0 (PATCHED) --- ", "background: #222; color: #bada55; font-size: 14px");
    }, []);

    return null;
}
