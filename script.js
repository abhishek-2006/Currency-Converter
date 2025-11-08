// Professional Currency Converter - Advanced Implementation
class CurrencyConverter {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.favoriteCurrencies = this.loadFavorites();
        this.recentConversions = this.loadRecentConversions();
        this.searchDebounceTimer = null;
        this.isLoading = false;

        // Advanced features
        this.multiCurrencyMode = false;
        this.selectedCurrencies = [];
        this.historicalRates = new Map();
        this.calculatorMode = false;
        this.rateAlerts = this.loadRateAlerts();
        this.settings = this.loadSettings();
        this.analytics = this.loadAnalytics();
        this.soundEnabled = true;
        this.hapticEnabled = true;
        this.pullToRefreshEnabled = false;
        this.newsArticles = [];

        // Audio context for sound effects
        this.audioContext = null;

        // Initialize tooltips
        this.tooltips = new Map();

        // Currency comparison data
        this.comparisonData = [];

        this.init();
    }

    init() {
        this.loadCurrencies();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupTheme();
        this.updateFavoritesDisplay();
        this.updateHistoryDisplay();
    }

    // Load currencies with error handling and caching
    async loadCurrencies() {
        this.showLoading(true);
        try {
            const data = await this.fetchWithCache(this.apiUrl);
            this.populateCurrencyDropdowns(data.rates);
        } catch (error) {
            this.handleError('Failed to load currencies. Please check your connection.', error);
        } finally {
            this.showLoading(false);
        }
    }

    // Fetch with caching and timeout
    async fetchWithCache(url, timeout = 10000) {
        const cacheKey = url;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }

            if (!navigator.onLine) {
                throw new Error('You are offline. Please check your internet connection.');
            }

            throw error;
        }
    }

    // Convert currency with comprehensive error handling
    async convertCurrency() {
        if (this.isLoading) return;

        const amount = parseFloat(document.getElementById('amount').value);
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;

        if (!this.validateInput(amount, fromCurrency, toCurrency)) {
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const data = await this.fetchWithCache(`${this.apiUrl}/${fromCurrency}`);

            if (!data.rates || !data.rates[toCurrency]) {
                throw new Error(`Exchange rate not available for ${toCurrency}`);
            }

            const rate = data.rates[toCurrency];
            const convertedAmount = (amount * rate).toFixed(2);

            this.displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate);
            this.saveConversion(amount, fromCurrency, convertedAmount, toCurrency, rate);

        } catch (error) {
            this.handleError(`Conversion failed: ${error.message}`, error);
        } finally {
            this.showLoading(false);
        }
    }

    // Validate user input
    validateInput(amount, fromCurrency, toCurrency) {
        if (!amount || amount <= 0 || isNaN(amount)) {
            this.showError('Please enter a valid amount greater than 0');
            return false;
        }

        if (!fromCurrency || !toCurrency) {
            this.showError('Please select both currencies');
            return false;
        }

        if (fromCurrency === toCurrency) {
            this.showError('Please select different currencies for conversion');
            return false;
        }

        return true;
    }

    // Swap currencies with animation
    swapCurrencies() {
        const fromCurrency = document.getElementById('fromCurrency');
        const toCurrency = document.getElementById('toCurrency');
        const swapButton = document.getElementById('swapButton');

        // Add rotation animation
        swapButton.classList.add('rotating');

        setTimeout(() => {
            const temp = fromCurrency.value;
            fromCurrency.value = toCurrency.value;
            toCurrency.value = temp;

            // Trigger change event for favorites update
            fromCurrency.dispatchEvent(new Event('change'));
            toCurrency.dispatchEvent(new Event('change'));

            swapButton.classList.remove('rotating');
        }, 300);
    }

    // Search and filter currencies
    searchCurrencies(searchTerm, dropdownId) {
        clearTimeout(this.searchDebounceTimer);

        this.searchDebounceTimer = setTimeout(() => {
            const dropdown = document.getElementById(dropdownId);
            const options = dropdown.querySelectorAll('option');
            const term = searchTerm.toLowerCase();

            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                const value = option.value.toLowerCase();

                if (text.includes(term) || value.includes(term)) {
                    option.style.display = 'block';
                } else {
                    option.style.display = 'none';
                }
            });
        }, 300);
    }

    // Toggle favorite currency
    toggleFavorite(currency) {
        const index = this.favoriteCurrencies.indexOf(currency);
        if (index > -1) {
            this.favoriteCurrencies.splice(index, 1);
        } else {
            this.favoriteCurrencies.push(currency);
        }

        this.saveFavorites();
        this.updateFavoritesDisplay();
    }

    // Quick select favorite currency
    selectFavoriteCurrency(currency, target) {
        const dropdown = document.getElementById(target);
        dropdown.value = currency;
        dropdown.dispatchEvent(new Event('change'));
    }

    // Setup all event listeners
    setupEventListeners() {
        // Form submission
        document.getElementById('converterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.convertCurrency();
        });

        // Convert button
        document.getElementById('convertButton').addEventListener('click', () => {
            this.convertCurrency();
        });

        // Swap button
        document.getElementById('swapButton').addEventListener('click', () => {
            this.swapCurrencies();
        });

        // Currency search
        document.getElementById('fromCurrencySearch').addEventListener('input', (e) => {
            this.searchCurrencies(e.target.value, 'fromCurrency');
        });

        document.getElementById('toCurrencySearch').addEventListener('input', (e) => {
            this.searchCurrencies(e.target.value, 'toCurrency');
        });

        // Currency changes (update favorites)
        document.getElementById('fromCurrency').addEventListener('change', (e) => {
            this.updateFavoriteButtons();
        });

        document.getElementById('toCurrency').addEventListener('change', (e) => {
            this.updateFavoriteButtons();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Clear history
        document.getElementById('clearHistory').addEventListener('click', () => {
            this.clearHistory();
        });

        // Amount input formatting
        document.getElementById('amount').addEventListener('input', (e) => {
            this.formatAmount(e.target);
        });

        // Network status
        window.addEventListener('online', () => {
            this.hideError();
            this.showSuccess('Connection restored');
        });

        window.addEventListener('offline', () => {
            this.showError('You are offline');
        });
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: Convert
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.convertCurrency();
            }

            // Ctrl/Cmd + S: Swap currencies
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.swapCurrencies();
            }

            // Ctrl/Cmd + K: Focus on amount
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('amount').focus();
            }

            // Escape: Clear form
            if (e.key === 'Escape') {
                this.resetForm();
            }

            // Ctrl/Cmd + D: Toggle theme
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    // Theme management
    setupTheme() {
        const savedTheme = localStorage.getItem('currencyConverter_theme');
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

        this.theme = savedTheme || systemPreference;
        this.applyTheme();

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('currencyConverter_theme')) {
                this.theme = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('currencyConverter_theme', this.theme);
        this.applyTheme();
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.theme);
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = this.theme === 'light' ? '🌙' : '☀️';
        }
    }

    // Format amount with thousand separators
    formatAmount(input) {
        let value = input.value.replace(/[^\d.]/g, '');
        const parts = value.split('.');

        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }

        if (parts[0]) {
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        input.value = parts.join('.');
    }

    // Display and UI methods
    displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate) {
        const resultElement = document.getElementById('result');
        resultElement.innerHTML = `
            <div class="result-main">
                <div class="result-amount">${this.formatNumber(convertedAmount)} ${toCurrency}</div>
                <div class="result-original">${this.formatNumber(amount)} ${fromCurrency}</div>
            </div>
            <div class="result-rate">
                1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}
            </div>
        `;

        resultElement.classList.add('show');

        // Copy button
        this.addCopyButton(convertedAmount, toCurrency);
    }

    formatNumber(num) {
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    addCopyButton(amount, currency) {
        const resultElement = document.getElementById('result');
        const existingButton = resultElement.querySelector('.copy-button');

        if (!existingButton) {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '📋 Copy';
            copyButton.addEventListener('click', () => {
                this.copyToClipboard(`${this.formatNumber(amount)} ${currency}`);
            });
            resultElement.appendChild(copyButton);
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('Copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess('Copied to clipboard!');
        }
    }

    // Loading states
    showLoading(show) {
        this.isLoading = show;
        const loadingOverlay = document.getElementById('loadingOverlay');
        const convertButton = document.getElementById('convertButton');

        if (show) {
            loadingOverlay?.classList.add('show');
            convertButton?.classList.add('loading');
            convertButton.disabled = true;
        } else {
            loadingOverlay?.classList.remove('show');
            convertButton?.classList.remove('loading');
            convertButton.disabled = false;
        }
    }

    // Error handling
    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        errorElement.classList.remove('success');

        // Shake animation
        errorElement.style.animation = 'shake 0.5s';
        setTimeout(() => {
            errorElement.style.animation = '';
        }, 500);
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.classList.remove('show');
    }

    showSuccess(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.add('show', 'success');

        setTimeout(() => {
            this.hideError();
        }, 3000);
    }

    handleError(message, error) {
        console.error('Currency Converter Error:', error);
        this.showError(message);
    }

    // Storage methods
    saveFavorites() {
        localStorage.setItem('currencyConverter_favorites', JSON.stringify(this.favoriteCurrencies));
    }

    loadFavorites() {
        const saved = localStorage.getItem('currencyConverter_favorites');
        return saved ? JSON.parse(saved) : ['USD', 'EUR', 'GBP', 'JPY'];
    }

    saveConversion(amount, fromCurrency, convertedAmount, toCurrency, rate) {
        const conversion = {
            id: Date.now(),
            amount,
            fromCurrency,
            convertedAmount,
            toCurrency,
            rate,
            timestamp: new Date().toISOString()
        };

        this.recentConversions.unshift(conversion);
        if (this.recentConversions.length > 10) {
            this.recentConversions = this.recentConversions.slice(0, 10);
        }

        this.saveRecentConversions();
        this.updateHistoryDisplay();
    }

    saveRecentConversions() {
        sessionStorage.setItem('currencyConverter_history', JSON.stringify(this.recentConversions));
    }

    loadRecentConversions() {
        const saved = sessionStorage.getItem('currencyConverter_history');
        return saved ? JSON.parse(saved) : [];
    }

    clearHistory() {
        this.recentConversions = [];
        this.saveRecentConversions();
        this.updateHistoryDisplay();
        this.showSuccess('History cleared');
    }

    // Update UI displays
    updateFavoritesDisplay() {
        const favoritesBar = document.getElementById('favoritesBar');
        favoritesBar.innerHTML = '';

        this.favoriteCurrencies.forEach(currency => {
            const button = document.createElement('button');
            button.className = 'favorite-btn';
            button.textContent = currency;
            button.addEventListener('click', () => {
                this.selectFavoriteCurrency(currency, 'fromCurrency');
            });
            favoritesBar.appendChild(button);
        });
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('historyContainer');
        const historyList = document.getElementById('historyList');

        if (this.recentConversions.length === 0) {
            historyContainer.style.display = 'none';
            return;
        }

        historyContainer.style.display = 'block';
        historyList.innerHTML = '';

        this.recentConversions.forEach(conversion => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const date = new Date(conversion.timestamp);
            const timeString = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            item.innerHTML = `
                <div class="history-main">
                    ${this.formatNumber(conversion.amount)} ${conversion.fromCurrency} →
                    ${this.formatNumber(conversion.convertedAmount)} ${conversion.toCurrency}
                </div>
                <div class="history-time">${timeString}</div>
                <button class="history-reload" onclick="converter.reloadConversion('${conversion.fromCurrency}', '${conversion.toCurrency}')">
                    🔄
                </button>
            `;

            historyList.appendChild(item);
        });
    }

    updateFavoriteButtons() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;

        // Update favorite indicators in dropdowns
        this.updateFavoriteIndicator('fromCurrency', fromCurrency);
        this.updateFavoriteIndicator('toCurrency', toCurrency);
    }

    updateFavoriteIndicator(dropdownId, currency) {
        const dropdown = document.getElementById(dropdownId);
        const option = dropdown.querySelector(`option[value="${currency}"]`);

        // Remove existing indicators
        dropdown.querySelectorAll('option').forEach(opt => {
            opt.textContent = opt.textContent.replace(' ⭐', '');
        });

        // Add indicator for favorites
        if (this.favoriteCurrencies.includes(currency) && option) {
            option.textContent += ' ⭐';
        }
    }

    // Reload conversion from history
    reloadConversion(fromCurrency, toCurrency) {
        document.getElementById('fromCurrency').value = fromCurrency;
        document.getElementById('toCurrency').value = toCurrency;

        // Trigger change events
        document.getElementById('fromCurrency').dispatchEvent(new Event('change'));
        document.getElementById('toCurrency').dispatchEvent(new Event('change'));

        this.showSuccess('Currencies loaded from history');
    }

    // Reset form
    resetForm() {
        document.getElementById('amount').value = '';
        document.getElementById('result').classList.remove('show');
        this.hideError();
        document.getElementById('fromCurrencySearch').value = '';
        document.getElementById('toCurrencySearch').value = '';

        // Reset currency filters
        const fromDropdown = document.getElementById('fromCurrency');
        const toDropdown = document.getElementById('toCurrency');

        [fromDropdown, toDropdown].forEach(dropdown => {
            dropdown.querySelectorAll('option').forEach(option => {
                option.style.display = 'block';
            });
        });

        document.getElementById('amount').focus();
    }

    // Populate currency dropdowns
    populateCurrencyDropdowns(rates) {
        const fromCurrency = document.getElementById('fromCurrency');
        const toCurrency = document.getElementById('toCurrency');
        const currencies = Object.keys(rates);

        // Clear existing options
        fromCurrency.innerHTML = '';
        toCurrency.innerHTML = '';

        // Sort currencies
        currencies.sort((a, b) => {
            // Show favorites first
            const aFavorite = this.favoriteCurrencies.includes(a);
            const bFavorite = this.favoriteCurrencies.includes(b);

            if (aFavorite && !bFavorite) return -1;
            if (!aFavorite && bFavorite) return 1;

            // Then alphabetically
            return a.localeCompare(b);
        });

        currencies.forEach(currency => {
            const currencyText = this.currencyNames[currency]
                ? `${currency} - ${this.currencyNames[currency]}`
                : currency;

            // Create option for "From" dropdown
            const option1 = document.createElement('option');
            option1.value = currency;
            option1.textContent = currencyText;
            fromCurrency.appendChild(option1);

            // Create option for "To" dropdown
            const option2 = document.createElement('option');
            option2.value = currency;
            option2.textContent = currencyText;
            toCurrency.appendChild(option2);
        });

        // Set defaults
        fromCurrency.value = 'USD';
        toCurrency.value = 'EUR';

        // Update favorite indicators
        this.updateFavoriteButtons();
    }
}

// Currency data
CurrencyConverter.prototype.currencyNames = {
    "USD": "United States Dollar",
    "EUR": "Euro",
    "GBP": "British Pound Sterling",
    "JPY": "Japanese Yen",
    "AUD": "Australian Dollar",
    "CAD": "Canadian Dollar",
    "CHF": "Swiss Franc",
    "CNY": "Chinese Yuan",
    "INR": "Indian Rupee",
    "AED": "United Arab Emirates Dirham",
    "AFN": "Afghan Afghani",
    "ALL": "Albanian Lek",
    "AMD": "Armenian Dram",
    "ANG": "Netherlands Antillean Guilder",
    "AOA": "Angolan Kwanza",
    "ARS": "Argentine Peso",
    "AWG": "Aruban Florin",
    "AZN": "Azerbaijani Manat",
    "BAM": "Bosnia-Herzegovina Convertible Mark",
    "BBD": "Barbadian Dollar",
    "BDT": "Bangladeshi Taka",
    "BGN": "Bulgarian Lev",
    "BHD": "Bahraini Dinar",
    "BIF": "Burundian Franc",
    "BMD": "Bermudian Dollar",
    "BND": "Brunei Dollar",
    "BOB": "Bolivian Boliviano",
    "BRL": "Brazilian Real",
    "BSD": "Bahamian Dollar",
    "BTN": "Bhutanese Ngultrum",
    "BWP": "Botswana Pula",
    "BYN": "Belarusian Ruble",
    "BZD": "Belize Dollar",
    "CDF": "Congolese Franc",
    "CLP": "Chilean Peso",
    "COP": "Colombian Peso",
    "CRC": "Costa Rican Colón",
    "CUP": "Cuban Peso",
    "CVE": "Cape Verdean Escudo",
    "CZK": "Czech Koruna",
    "DJF": "Djiboutian Franc",
    "DKK": "Danish Krone",
    "DOP": "Dominican Peso",
    "DZD": "Algerian Dinar",
    "EGP": "Egyptian Pound",
    "ERN": "Eritrean Nakfa",
    "ETB": "Ethiopian Birr",
    "FJD": "Fijian Dollar",
    "FKP": "Falkland Islands Pound",
    "FOK": "Faroese króna",
    "GEL": "Georgian Lari",
    "GGP": "Guernsey Pound",
    "GHS": "Ghanaian Cedi",
    "GIP": "Gibraltar Pound",
    "GMD": "Gambian Dalasi",
    "GNF": "Guinean Franc",
    "GTQ": "Guatemalan Quetzal",
    "GYD": "Guyanaese Dollar",
    "HKD": "Hong Kong Dollar",
    "HNL": "Honduran Lempira",
    "HRK": "Croatian Kuna",
    "HTG": "Haitian Gourde",
    "HUF": "Hungarian Forint",
    "IDR": "Indonesian Rupiah",
    "ILS": "Israeli New Shekel",
    "IMP": "Isle of Man Pound",
    "IQD": "Iraqi Dinar",
    "IRR": "Iranian Rial",
    "ISK": "Icelandic Króna",
    "JEP": "Jersey Pound",
    "JMD": "Jamaican Dollar",
    "JOD": "Jordanian Dinar",
    "KES": "Kenyan Shilling",
    "KGS": "Kyrgystani Som",
    "KHR": "Cambodian Riel",
    "KMF": "Comorian Franc",
    "KRW": "South Korean Won",
    "KWD": "Kuwaiti Dinar",
    "KYD": "Cayman Islands Dollar",
    "KZT": "Kazakhstani Tenge",
    "LAK": "Laotian Kip",
    "LBP": "Lebanese Pound",
    "LKR": "Sri Lankan Rupee",
    "LRD": "Liberian Dollar",
    "LSL": "Lesotho Loti",
    "LYD": "Libyan Dinar",
    "MAD": "Moroccan Dirham",
    "MDL": "Moldovan Leu",
    "MGA": "Malagasy Ariary",
    "MKD": "Macedonian Denar",
    "MMK": "Myanma Kyat",
    "MNT": "Mongolian Tugrik",
    "MOP": "Macanese Pataca",
    "MRU": "Mauritanian Ouguiya",
    "MUR": "Mauritian Rupee",
    "MVR": "Maldivian Rufiyaa",
    "MWK": "Malawian Kwacha",
    "MXN": "Mexican Peso",
    "MYR": "Malaysian Ringgit",
    "MZN": "Mozambican Metical",
    "NAD": "Namibian Dollar",
    "NGN": "Nigerian Naira",
    "NIO": "Nicaraguan Córdoba",
    "NOK": "Norwegian Krone",
    "NPR": "Nepalese Rupee",
    "NZD": "New Zealand Dollar",
    "OMR": "Omani Rial",
    "PAB": "Panamanian Balboa",
    "PEN": "Peruvian Nuevo Sol",
    "PGK": "Papua New Guinean Kina",
    "PHP": "Philippine Peso",
    "PKR": "Pakistani Rupee",
    "PLN": "Polish Zloty",
    "PYG": "Paraguayan Guarani",
    "QAR": "Qatari Rial",
    "RON": "Romanian Leu",
    "RSD": "Serbian Dinar",
    "RUB": "Russian Ruble",
    "RWF": "Rwandan Franc",
    "SAR": "Saudi Riyal",
    "SCR": "Seychellois Rupee",
    "SDG": "Sudanese Pound",
    "SEK": "Swedish Krona",
    "SGD": "Singapore Dollar",
    "SHP": "Saint Helena Pound",
    "SLL": "Sierra Leonean Leone",
    "SOS": "Somali Shilling",
    "SRD": "Surinamese Dollar",
    "SSP": "South Sudanese Pound",
    "SYP": "Syrian Pound",
    "SZL": "Swazi Lilangeni",
    "THB": "Thai Baht",
    "TJS": "Tajikistani Somoni",
    "TMT": "Turkmenistani Manat",
    "TND": "Tunisian Dinar",
    "TRY": "Turkish Lira",
    "TTD": "Trinidad and Tobago Dollar",
    "TWD": "New Taiwan Dollar",
    "TZS": "Tanzanian Shilling",
    "UAH": "Ukrainian Hryvnia",
    "UGX": "Ugandan Shilling",
    "UYU": "Uruguayan Peso",
    "UZS": "Uzbekistan Som",
    "VES": "Venezuelan Bolívar",
    "VND": "Vietnamese Dong",
    "XAF": "Central African CFA Franc",
    "XCD": "East Caribbean Dollar",
    "XOF": "West African CFA Franc",
    "XPF": "CFP Franc",
    "YER": "Yemeni Rial",
    "ZAR": "South African Rand",
    "ZMW": "Zambian Kwacha"
};

CurrencyConverter.prototype.apiUrl = `https://open.er-api.com/v6/latest`;

// Global instance
let converter;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    converter = new CurrencyConverter();
});

// Global function for button onclick
function convertCurrency() {
    if (converter) {
        converter.convertCurrency();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CurrencyConverter;
}