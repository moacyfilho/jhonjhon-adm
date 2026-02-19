
async function main() {
    try {
        console.log("Testing URL: https://jhonjhonbarbearia.com.br/performance");
        const res = await fetch("https://jhonjhonbarbearia.com.br/performance", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        console.log(`Status Code: ${res.status}`);
        console.log(`Redirected: ${res.redirected}`);
        console.log(`Final URL: ${res.url}`);

        const text = await res.text();
        console.log("--- Body Preview ---");
        console.log(text.substring(0, 300));

        if (text.includes("Desempenho de Serviços") || text.includes("Performance")) {
            console.log("SUCCESS: Found report content keywords.");
        } else if (text.includes("Login") || text.includes("Entrar")) {
            console.log("INFO: Redirected to Login page (Expected if not authenticated). Page exists.");
        } else {
            console.log("WARNING: Content unclear.");
        }

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

main();
