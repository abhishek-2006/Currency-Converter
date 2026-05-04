const baseAmount = document.getElementById('amount');
const fromSelect = document.getElementById('fromSelect');
const toSelect = document.getElementById('toSelect');
const resultDisplay = document.getElementById('result');
const dashGrid = document.getElementById('dashGrid');
const rateDetail = document.getElementById('rateDetail');
const timestamp = document.getElementById('timestamp');

const API_SOURCE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";
let marketRates = {};
let isDashActive = true;

// Institutional Watchlist (National Currencies Only)
const proWatchlist = ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'sgd', 'aed', 'chf', 'hkd', 'inr'];

async function initTerminal() {
    try {
        const resp = await fetch(`${API_SOURCE}.json`);
        const list = await resp.json();
        
        // EXCLUSION LIST: Crypto and Invalid Codes
        const cryptoExclude = ['btc', 'eth', 'ltc', 'sol', 'usdt', 'xrp', 'doge', 'ada', 'matic', 'dot'];
        
        Object.entries(list).forEach(([code, name]) => {
            if(!name || cryptoExclude.includes(code.toLowerCase())) return;
            const optionText = `${code.toUpperCase()} — ${name}`;
            fromSelect.add(new Option(optionText, code));
            toSelect.add(new Option(optionText, code));
        });

        fromSelect.value = 'inr';
        toSelect.value = 'usd';
        
        syncMarket();
    } catch (e) {
        resultDisplay.innerText = "LINK LOST";
    }
}

async function syncMarket() {
    const from = fromSelect.value;
    try {
        const resp = await fetch(`${API_SOURCE}/${from}.json`);
        const data = await resp.json();
        marketRates = data[from];
        
        const now = new Date();
        timestamp.innerText = `Synced: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        updateUI();
    } catch (e) {
        console.error("Market synchronization failed.");
    }
}

function updateUI() {
    const amountVal = parseFloat(baseAmount.value) || 0;
    const to = toSelect.value;
    const currentRate = marketRates[to];

    // Main Terminal Output
    if (currentRate) {
        const total = amountVal * currentRate;
        resultDisplay.innerText = total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        rateDetail.innerText = `1.0000 ${fromSelect.value.toUpperCase()} = ${currentRate.toFixed(4)} ${to.toUpperCase()}`;
    }

    // Dashboard Render
    dashGrid.innerHTML = '';
    if (isDashActive) {
        proWatchlist.forEach(code => {
            if (code === fromSelect.value) return;
            const r = marketRates[code];
            if (!r) return;

            const converted = (amountVal * r).toLocaleString(undefined, { maximumFractionDigits: 2 });
            const card = document.createElement('div');
            card.className = "glass p-5 rounded-3xl hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden";
            card.innerHTML = `
                <div class="flex justify-between items-center relative z-10">
                    <div>
                        <span class="text-[9px] font-black text-slate-500 uppercase tracking-tighter">${code} / ${fromSelect.value.toUpperCase()}</span>
                        <div class="text-xl font-black mt-0.5 text-white">${converted}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] font-mono text-indigo-400 font-bold">${r.toFixed(4)}</div>
                        <div class="flex gap-0.5 mt-2 justify-end">
                            ${[1,2,3,4,5].map(i => `<div class="w-1 h-3 rounded-full ${i <= 3 ? 'bg-indigo-500' : 'bg-slate-800'}"></div>`).join('')}
                        </div>
                    </div>
                </div>
            `;
            dashGrid.appendChild(card);
        });
    }
}

// Global Interaction Listeners
baseAmount.addEventListener('input', updateUI);
fromSelect.addEventListener('change', syncMarket);
toSelect.addEventListener('change', updateUI);

document.getElementById('swapBtn').addEventListener('click', () => {
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    syncMarket();
});

document.getElementById('refreshBtn').addEventListener('click', syncMarket);
document.getElementById('toggleDash').addEventListener('click', () => {
    isDashActive = !isDashActive;
    dashGrid.classList.toggle('hidden');
    document.getElementById('toggleDash').innerText = isDashActive ? "Hide Watchlist" : "Show Watchlist";
});

initTerminal();