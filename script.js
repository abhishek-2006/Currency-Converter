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
        return saved ? JSON.parse(saved) : ['USD', 'EUR', 'INR', 'JPY'];
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
        fromCurrency.value = 'INR';
        toCurrency.value = 'EUR';

        // Initialize advanced features
        this.initAdvancedFeatures();
    }

    // Initialize advanced features
    initAdvancedFeatures() {
        this.initPullToRefresh();
        this.loadCurrencyNews();
        this.requestNotificationPermission();

        // Setup additional event listeners for advanced features
        this.setupAdvancedEventListeners();

        // Track analytics
        this.trackEvent('app_initialized');
    }

    // Setup advanced event listeners
    setupAdvancedEventListeners() {
        // Amount preset buttons
        document.querySelectorAll('.preset-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const amount = e.target.dataset.amount;
                document.getElementById('amount').value = amount;
                this.playSound('click');
                this.triggerHaptic('click');
                this.trackEvent('preset_amount_used', { amount });
            });
        });

        // Multi-currency toggle
        document.getElementById('multiCurrencyToggle')?.addEventListener('click', () => {
            this.toggleMultiCurrencyMode();
        });

        // Calculator mode toggle
        document.getElementById('calculatorToggle')?.addEventListener('click', () => {
            this.enableCalculatorMode();
        });

        // Export history
        document.getElementById('exportHistory')?.addEventListener('click', () => {
            this.exportConversionHistory();
        });

        // Settings button
        document.getElementById('settingsButton')?.addEventListener('click', () => {
            this.showSettingsModal();
        });
    }

    // Multi-Currency Conversion
    async convertToMultipleCurrencies(amount, fromCurrency, targetCurrencies) {
        if (!amount || !fromCurrency || !targetCurrencies.length) {
            this.showError('Please provide valid data for multi-currency conversion');
            return;
        }

        this.showLoading(true);
        const results = [];

        try {
            const data = await this.fetchWithCache(`${this.apiUrl}/${fromCurrency}`);

            for (const targetCurrency of targetCurrencies) {
                if (data.rates[targetCurrency]) {
                    const convertedAmount = (amount * data.rates[targetCurrency]).toFixed(2);
                    results.push({
                        currency: targetCurrency,
                        amount: convertedAmount,
                        rate: data.rates[targetCurrency],
                        name: this.currencyNames[targetCurrency] || targetCurrency
                    });
                }
            }

            this.displayMultiCurrencyResults(amount, fromCurrency, results);
            this.playSound('success');
            this.triggerHaptic('success');
            this.trackEvent('multi_currency_conversion', {
                fromCurrency,
                targetCurrencies: targetCurrencies.length
            });

        } catch (error) {
            this.handleError('Multi-currency conversion failed', error);
        } finally {
            this.showLoading(false);
        }
    }

    displayMultiCurrencyResults(amount, fromCurrency, results) {
        const resultContainer = document.getElementById('result');
        resultContainer.innerHTML = `
            <div class="multi-currency-results">
                <div class="result-header">
                    <h3>${this.formatNumber(amount)} ${fromCurrency}</h3>
                    <p>equals</p>
                </div>
                <div class="currency-grid">
                    ${results.map(result => `
                        <div class="currency-result-item">
                            <div class="currency-flag">${this.getCurrencyFlag(result.currency)}</div>
                            <div class="currency-info">
                                <div class="currency-amount">${this.formatNumber(result.amount)} ${result.currency}</div>
                                <div class="currency-name">${result.name}</div>
                                <div class="currency-rate">1 ${fromCurrency} = ${result.rate.toFixed(4)} ${result.currency}</div>
                            </div>
                            <button class="copy-individual" onclick="converter.copyToClipboard('${this.formatNumber(result.amount)} ${result.currency}')">
                                📋
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="multi-currency-actions">
                    <button class="export-btn" onclick="converter.exportMultiCurrencyResults(${JSON.stringify(results)}, ${amount}, '${fromCurrency}')">
                        📥 Export Results
                    </button>
                    <button class="compare-btn" onclick="converter.compareCurrencies(${JSON.stringify(results)})">
                        📊 Compare Rates
                    </button>
                    <button class="historical-btn" onclick="converter.getHistoricalRates('${fromCurrency}', '${results[0].currency}')">
                        📈 View History
                    </button>
                </div>
            </div>
        `;
        resultContainer.classList.add('show');
    }

    // Historical Rates
    async getHistoricalRates(baseCurrency, targetCurrency, days = 7) {
        this.showLoading(true);
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days);

            const historicalData = [];

            // Since we don't have a real historical API, we'll simulate it
            // In production, this would use a real historical rates API
            const currentRate = await this.getCurrentRate(baseCurrency, targetCurrency);

            for (let i = 0; i <= days; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);

                // Simulate historical rate with small variations
                const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
                const historicalRate = currentRate * (1 + variation);

                historicalData.push({
                    date: date.toISOString().split('T')[0],
                    rate: historicalRate,
                    formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                });
            }

            this.displayHistoricalRates(baseCurrency, targetCurrency, historicalData);
            this.playSound('info');
            this.trackEvent('historical_rates_viewed', { baseCurrency, targetCurrency, days });

        } catch (error) {
            this.handleError('Failed to load historical rates', error);
        } finally {
            this.showLoading(false);
        }
    }

    displayHistoricalRates(fromCurrency, toCurrency, historicalData) {
        const modal = this.createModal('Historical Exchange Rates', `
            <div class="historical-rates-container">
                <div class="rate-header">
                    <h4>${fromCurrency} to ${toCurrency}</h4>
                    <p class="rate-period">Last ${historicalData.length} days</p>
                </div>
                <div class="rates-chart">
                    ${historicalData.map((data, index) => {
                        const maxRate = Math.max(...historicalData.map(d => d.rate));
                        const minRate = Math.min(...historicalData.map(d => d.rate));
                        const range = maxRate - minRate;
                        const normalizedHeight = range > 0 ? ((data.rate - minRate) / range) * 100 : 50;
                        return `
                            <div class="rate-bar" style="height: ${normalizedHeight}%">
                                <div class="rate-tooltip">
                                    ${data.formattedDate}: ${data.rate.toFixed(4)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="rate-stats">
                    <div class="stat-item">
                        <span class="stat-label">Highest:</span>
                        <span class="stat-value">${Math.max(...historicalData.map(d => d.rate)).toFixed(4)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Lowest:</span>
                        <span class="stat-value">${Math.min(...historicalData.map(d => d.rate)).toFixed(4)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Average:</span>
                        <span class="stat-value">${(historicalData.reduce((sum, d) => sum + d.rate, 0) / historicalData.length).toFixed(4)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Change:</span>
                        <span class="stat-value change-value">${((historicalData[historicalData.length - 1].rate / historicalData[0].rate - 1) * 100).toFixed(2)}%</span>
                    </div>
                </div>
                <div class="chart-actions">
                    <button class="export-chart" onclick="converter.exportHistoricalData(${JSON.stringify(historicalData)}, '${fromCurrency}', '${toCurrency}')">
                        📥 Export Data
                    </button>
                </div>
            </div>
        `);
        this.showModal(modal);
    }

    // Currency News Integration
    async loadCurrencyNews() {
        try {
            // Simulate news API call (in production, use real news API)
            const mockNews = [
                {
                    title: "USD Strengthens Against Major Currencies",
                    summary: "The US dollar showed significant gains today amid better-than-expected economic data releases and Federal Reserve comments.",
                    source: "Financial Times",
                    timestamp: new Date().toISOString(),
                    currencies: ["USD", "EUR", "GBP"],
                    url: "#"
                },
                {
                    title: "European Central Bank Holds Interest Rates Steady",
                    summary: "ECB maintains current interest rates as inflation concerns persist across the Eurozone, market analysts predict possible future cuts.",
                    source: "Reuters",
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    currencies: ["EUR"],
                    url: "#"
                },
                {
                    title: "Asian Markets React to Currency Fluctuations",
                    summary: "Markets across Asia show mixed reactions to recent currency movements, with investors closely watching central bank policies.",
                    source: "Bloomberg",
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    currencies: ["JPY", "CNY", "KRW"],
                    url: "#"
                },
                {
                    title: "Cryptocurrency Impact on Traditional Forex Markets",
                    summary: "Growing cryptocurrency adoption is creating new dynamics in traditional forex markets, according to recent analysis.",
                    source: "CoinDesk",
                    timestamp: new Date(Date.now() - 10800000).toISOString(),
                    currencies: ["BTC", "ETH"],
                    url: "#"
                }
            ];

            this.newsArticles = mockNews;
            this.displayNews();
            this.trackEvent('news_loaded', { articles: mockNews.length });

        } catch (error) {
            console.error('Failed to load currency news:', error);
        }
    }

    displayNews() {
        const newsContainer = document.getElementById('newsContainer');
        if (!newsContainer) return;

        if (this.newsArticles.length === 0) {
            newsContainer.innerHTML = `
                <div class="news-section">
                    <p class="no-news">No news available at the moment.</p>
                </div>
            `;
            return;
        }

        newsContainer.innerHTML = `
            <div class="news-section">
                <div class="news-list">
                    ${this.newsArticles.map(article => `
                        <div class="news-item">
                            <div class="news-header">
                                <h4>${article.title}</h4>
                                <span class="news-source">${article.source}</span>
                            </div>
                            <p class="news-summary">${article.summary}</p>
                            <div class="news-footer">
                                <span class="news-time">${this.formatTime(article.timestamp)}</span>
                                <div class="news-currencies">
                                    ${article.currencies.map(curr => `<span class="currency-tag">${curr}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Export Functionality
    exportConversionHistory() {
        if (this.recentConversions.length === 0) {
            this.showError('No conversion history to export');
            return;
        }

        const csvContent = this.generateConversionHistoryCSV(this.recentConversions);
        this.downloadFile(csvContent, 'currency-conversion-history.csv', 'text/csv');
        this.showSuccess('Conversion history exported successfully');
        this.playSound('export');
        this.trackEvent('history_exported', { conversions: this.recentConversions.length });
    }

    exportMultiCurrencyResults(results, amount, fromCurrency) {
        const exportData = results.map(result => ({
            'From Currency': fromCurrency,
            'From Amount': amount,
            'To Currency': result.currency,
            'To Amount': result.amount,
            'Exchange Rate': result.rate,
            'Currency Name': result.name,
            'Export Date': new Date().toISOString()
        }));

        const csvContent = this.generateCSV(exportData);
        this.downloadFile(csvContent, 'multi-currency-conversion.csv', 'text/csv');
        this.showSuccess('Multi-currency results exported successfully');
        this.playSound('export');
        this.trackEvent('multi_currency_exported', { results: results.length });
    }

    exportHistoricalData(historicalData, fromCurrency, toCurrency) {
        const exportData = historicalData.map(data => ({
            'Date': data.date,
            'Formatted Date': data.formattedDate,
            'Exchange Rate': data.rate,
            'From Currency': fromCurrency,
            'To Currency': toCurrency
        }));

        const csvContent = this.generateCSV(exportData);
        this.downloadFile(csvContent, `historical-rates-${fromCurrency}-${toCurrency}.csv`, 'text/csv');
        this.showSuccess('Historical data exported successfully');
        this.playSound('export');
        this.trackEvent('historical_data_exported', { fromCurrency, toCurrency, days: historicalData.length });
    }

    generateConversionHistoryCSV(conversions) {
        const exportData = conversions.map(conv => ({
            'Date': new Date(conv.timestamp).toLocaleString(),
            'Amount': conv.amount,
            'From Currency': conv.fromCurrency,
            'To Amount': conv.convertedAmount,
            'To Currency': conv.toCurrency,
            'Exchange Rate': conv.rate,
            'From Currency Name': this.currencyNames[conv.fromCurrency],
            'To Currency Name': this.currencyNames[conv.toCurrency]
        }));

        return this.generateCSV(exportData);
    }

    generateCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row =>
            headers.map(header => `"${row[header]}"`).join(',')
        );

        return csvHeaders + '\n' + csvRows.join('\n');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Currency Comparison
    compareCurrencies(results) {
        const modal = this.createModal('Currency Comparison', `
            <div class="comparison-container">
                <div class="comparison-chart">
                    ${results.map(result => {
                        const maxValue = Math.max(...results.map(r => parseFloat(r.amount)));
                        const percentage = (parseFloat(result.amount) / maxValue) * 100;
                        return `
                            <div class="comparison-item">
                                <div class="comparison-label">
                                    <span class="currency-flag">${this.getCurrencyFlag(result.currency)}</span>
                                    <span class="currency-name">${result.currency} - ${result.name}</span>
                                </div>
                                <div class="comparison-bar">
                                    <div class="comparison-fill" style="width: ${percentage}%"></div>
                                    <span class="comparison-value">${this.formatNumber(result.amount)}</span>
                                </div>
                                <div class="comparison-rate">Rate: ${result.rate.toFixed(4)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="comparison-stats">
                    <div class="stat-item">
                        <span class="stat-label">Highest Value:</span>
                        <span class="stat-value">${this.formatNumber(Math.max(...results.map(r => parseFloat(r.amount))))}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Lowest Value:</span>
                        <span class="stat-value">${this.formatNumber(Math.min(...results.map(r => parseFloat(r.amount))))}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Average Value:</span>
                        <span class="stat-value">${this.formatNumber(results.reduce((sum, r) => sum + parseFloat(r.amount), 0) / results.length)}</span>
                    </div>
                </div>
                <div class="comparison-actions">
                    <button onclick="converter.exportComparisonData(${JSON.stringify(results)})">
                        📥 Export Comparison
                    </button>
                    <button onclick="converter.createComparisonChart(${JSON.stringify(results)})">
                        📊 Generate Chart
                    </button>
                </div>
            </div>
        `);
        this.showModal(modal);
        this.trackEvent('currency_comparison_viewed', { currencies: results.length });
    }

    exportComparisonData(results) {
        const exportData = results.map(result => ({
            'Currency': result.currency,
            'Currency Name': result.name,
            'Amount': result.amount,
            'Exchange Rate': result.rate,
            'Percentage of Total': ((parseFloat(result.amount) / results.reduce((sum, r) => sum + parseFloat(r.amount), 0)) * 100).toFixed(2) + '%'
        }));

        const csvContent = this.generateCSV(exportData);
        this.downloadFile(csvContent, 'currency-comparison.csv', 'text/csv');
        this.showSuccess('Comparison data exported successfully');
        this.playSound('export');
    }

    // Settings Modal
    showSettingsModal() {
        const modal = this.createModal('Settings', `
            <div class="settings-container">
                <div class="setting-group">
                    <h4>General Settings</h4>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="soundEnabled" ${this.settings.soundEnabled ? 'checked' : ''}>
                            Enable Sound Effects
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="hapticEnabled" ${this.settings.hapticEnabled ? 'checked' : ''}>
                            Enable Haptic Feedback
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="pullToRefreshEnabled" ${this.settings.pullToRefreshEnabled ? 'checked' : ''}>
                            Enable Pull to Refresh
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="notificationsEnabled" ${this.settings.notificationsEnabled ? 'checked' : ''}>
                            Enable Notifications
                        </label>
                    </div>
                </div>

                <div class="setting-group">
                    <h4>Data Settings</h4>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="autoRefresh" ${this.settings.autoRefresh ? 'checked' : ''}>
                            Auto-refresh Rates
                        </label>
                    </div>
                    <div class="setting-item">
                        <label for="refreshInterval">Refresh Interval (minutes):</label>
                        <select id="refreshInterval" class="form-select">
                            <option value="1" ${this.settings.refreshInterval === 1 ? 'selected' : ''}>1 minute</option>
                            <option value="5" ${this.settings.refreshInterval === 5 ? 'selected' : ''}>5 minutes</option>
                            <option value="15" ${this.settings.refreshInterval === 15 ? 'selected' : ''}>15 minutes</option>
                            <option value="30" ${this.settings.refreshInterval === 30 ? 'selected' : ''}>30 minutes</option>
                            <option value="60" ${this.settings.refreshInterval === 60 ? 'selected' : ''}>1 hour</option>
                        </select>
                    </div>
                </div>

                <div class="setting-group">
                    <h4>UI Settings</h4>
                    <div class="setting-item">
                        <label for="defaultAmount">Default Amount:</label>
                        <input type="number" id="defaultAmount" class="form-input" value="${this.settings.defaultAmount}" min="1">
                    </div>
                </div>

                <div class="setting-actions">
                    <button class="btn-primary" onclick="converter.saveSettingsFromModal()">Save Settings</button>
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn-danger" onclick="converter.clearAllData()">Clear All Data</button>
                </div>
            </div>
        `);
        this.showModal(modal);
    }

    saveSettingsFromModal() {
        const newSettings = {
            soundEnabled: document.getElementById('soundEnabled').checked,
            hapticEnabled: document.getElementById('hapticEnabled').checked,
            pullToRefreshEnabled: document.getElementById('pullToRefreshEnabled').checked,
            notificationsEnabled: document.getElementById('notificationsEnabled').checked,
            autoRefresh: document.getElementById('autoRefresh').checked,
            refreshInterval: parseInt(document.getElementById('refreshInterval').value),
            defaultAmount: parseInt(document.getElementById('defaultAmount').value)
        };

        this.updateSettings(newSettings);
        document.querySelector('.modal-overlay').remove();
        this.showSuccess('Settings saved successfully');
        this.playSound('success');
        this.trackEvent('settings_updated', newSettings);
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This will remove your favorites, history, and settings.')) {
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
        }
    }

    // Sound Effects
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSound(type) {
        if (!this.soundEnabled || !this.settings.soundEnabled) return;

        this.initAudioContext();
        const context = this.audioContext;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        switch (type) {
            case 'click':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.05);
                break;
            case 'success':
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.15;
                oscillator.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.15);
                break;
            case 'error':
                oscillator.frequency.value = 300;
                gainNode.gain.value = 0.2;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.2);
                break;
            case 'alert':
                oscillator.frequency.value = 1000;
                gainNode.gain.value = 0.2;
                oscillator.frequency.exponentialRampToValueAtTime(1500, context.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.2);
                break;
            case 'export':
                oscillator.frequency.value = 400;
                gainNode.gain.value = 0.15;
                oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.2);
                break;
            case 'toggle':
                oscillator.frequency.value = 500;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.1);
                break;
            case 'operator':
                oscillator.frequency.value = 700;
                gainNode.gain.value = 0.08;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.08);
                break;
            case 'equals':
                oscillator.frequency.value = 900;
                gainNode.gain.value = 0.12;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.12);
                break;
            case 'clear':
                oscillator.frequency.value = 400;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.1);
                break;
            case 'delete':
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.08;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.06);
                break;
            case 'info':
                oscillator.frequency.value = 650;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(context.currentTime + 0.15);
                break;
        }
    }

    // Haptic Feedback
    triggerHaptic(type) {
        if (!this.hapticEnabled || !this.settings.hapticEnabled) return;

        if ('vibrate' in navigator) {
            switch (type) {
                case 'click':
                    navigator.vibrate(10);
                    break;
                case 'success':
                    navigator.vibrate([10, 50, 10]);
                    break;
                case 'error':
                    navigator.vibrate([100, 50, 100]);
                    break;
                case 'notification':
                    navigator.vibrate([200, 100, 200]);
                    break;
                default:
                    navigator.vibrate(50);
            }
        }
    }

    // Modal System
    createModal(title, content) {
        return `
            <div class="modal-overlay" onclick="if(event.target === this) this.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
    }

    showModal(modalHTML) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.playSound('info');
    }

    // Notification System
    showNotification(message, type = 'info') {
        if ('Notification' in window && Notification.permission === 'granted' && this.settings.notificationsEnabled) {
            new Notification('Currency Converter Pro', {
                body: message,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: 'currency-converter'
            });
        }
    }

    // Pull to Refresh
    initPullToRefresh() {
        if (!this.pullToRefreshEnabled || !this.settings.pullToRefreshEnabled) return;

        let startY = 0;
        let isPulling = false;
        let pullStarted = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
                pullStarted = false;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;

            const currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 50 && !pullStarted) {
                pullStarted = true;
                this.showRefreshIndicator();
            }
        });

        document.addEventListener('touchend', (e) => {
            if (!isPulling || !pullStarted) return;

            const currentY = e.changedTouches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 100) {
                this.refreshData();
            }

            isPulling = false;
            pullStarted = false;
            this.hideRefreshIndicator();
        });
    }

    showRefreshIndicator() {
        let indicator = document.getElementById('refreshIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'refreshIndicator';
            indicator.innerHTML = '↻ Refreshing...';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                z-index: 9999;
                animation: spin 1s linear infinite;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(indicator);
        }
    }

    hideRefreshIndicator() {
        const indicator = document.getElementById('refreshIndicator');
        if (indicator) indicator.remove();
    }

    async refreshData() {
        await this.loadCurrencies();
        this.loadCurrencyNews();
        this.showSuccess('Data refreshed successfully');
        this.playSound('success');
        this.trackEvent('data_refreshed');
    }

    // Analytics
    trackEvent(event, data = {}) {
        const eventRecord = {
            event,
            data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        this.analytics.events.push(eventRecord);
        if (this.analytics.events.length > 1000) {
            this.analytics.events = this.analytics.events.slice(-500);
        }

        this.analytics.conversions = this.recentConversions.length;
        this.saveAnalytics();

        // In production, send to analytics service
        console.log('Analytics Event:', eventRecord);
    }

    // Storage functions for advanced features
    loadRateAlerts() {
        const saved = localStorage.getItem('currencyConverter_rateAlerts');
        return saved ? JSON.parse(saved) : [];
    }

    saveRateAlerts() {
        localStorage.setItem('currencyConverter_rateAlerts', JSON.stringify(this.rateAlerts));
    }

    loadSettings() {
        const saved = localStorage.getItem('currencyConverter_settings');
        return saved ? JSON.parse(saved) : {
            soundEnabled: true,
            hapticEnabled: true,
            pullToRefreshEnabled: true,
            theme: 'light',
            autoRefresh: false,
            refreshInterval: 5,
            notificationsEnabled: true,
            defaultAmount: 100
        };
    }

    loadAnalytics() {
        const saved = localStorage.getItem('currencyConverter_analytics');
        return saved ? JSON.parse(saved) : { events: [], conversions: 0 };
    }

    saveAnalytics() {
        localStorage.setItem('currencyConverter_analytics', JSON.stringify(this.analytics));
    }

    // Utility functions
    getCurrencyFlag(currency) {
        const flags = {
            'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧', 'JPY': '🇯🇵', 'AUD': '🇦🇺', 'CAD': '🇨🇦',
            'CHF': '🇨🇭', 'CNY': '🇨🇳', 'INR': '🇮🇳', 'BRL': '🇧🇷', 'MXN': '🇲🇽', 'RUB': '🇷🇺',
            'KRW': '🇰🇷', 'ZAR': '🇿🇦', 'NZD': '🇳🇿', 'SGD': '🇸🇬', 'HKD': '🇭🇰', 'NOK': '🇳🇴',
            'SEK': '🇸🇪', 'DKK': '🇩🇰', 'PLN': '🇵🇱', 'THB': '🇹🇭', 'IDR': '🇮🇩', 'MYR': '🇲🇾',
            'ARS': '🇦🇷', 'CLP': '🇨🇱', 'COP': '🇨🇴', 'PEN': '🇵🇪', 'UYU': '🇺🇾', 'VES': '🇻🇪'
        };
        return flags[currency] || '💱';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
        return date.toLocaleDateString();
    }

    async getCurrentRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return 1;
        const data = await this.fetchWithCache(`${this.apiUrl}/${fromCurrency}`);
        return data.rates[toCurrency] || 1;
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showSuccess('Notifications enabled!');
                this.trackEvent('notifications_enabled');
            }
        }
    }

    // Additional utility functions
    createRateAlertFromHistory(fromCurrency, toCurrency, currentRate) {
        document.querySelector('.modal-overlay').remove();
        this.showRateAlertModal();
        // Pre-fill the form with current rate
        setTimeout(() => {
            const targetRateInput = document.getElementById('targetRate');
            if (targetRateInput) {
                targetRateInput.value = currentRate.toFixed(4);
            }
        }, 100);
    }
}

// Currency data
CurrencyConverter.prototype.currencyNames = {
    "AED": "United Arab Emirates Dirham",
    "AFN": "Afghan Afghani",
    "ALL": "Albanian Lek",
    "AMD": "Armenian Dram",
    "ANG": "Netherlands Antillean Guilder",
    "AOA": "Angolan Kwanza",
    "ARS": "Argentine Peso",
    "AUD": "Australian Dollar",
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
  "CAD": "Canadian Dollar",
  "CDF": "Congolese Franc",
  "CHF": "Swiss Franc",
  "CLP": "Chilean Peso",
  "CNY": "Chinese Yuan",
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
  "EUR": "Euro",
  "FJD": "Fijian Dollar",
  "FKP": "Falkland Islands Pound",
  "FOK": "Faroese Króna",
  "GBP": "British Pound Sterling",
  "GEL": "Georgian Lari",
  "GGP": "Guernsey Pound",
  "GHS": "Ghanaian Cedi",
  "GIP": "Gibraltar Pound",
  "GMD": "Gambian Dalasi",
  "GNF": "Guinean Franc",
  "GTQ": "Guatemalan Quetzal",
  "GYD": "Guyanese Dollar",
  "HKD": "Hong Kong Dollar",
  "HNL": "Honduran Lempira",
  "HRK": "Croatian Kuna",
  "HTG": "Haitian Gourde",
  "HUF": "Hungarian Forint",
  "IDR": "Indonesian Rupiah",
  "ILS": "Israeli New Shekel",
  "IMP": "Isle of Man Pound",
  "INR": "Indian Rupee",
  "IQD": "Iraqi Dinar",
  "IRR": "Iranian Rial",
  "ISK": "Icelandic Króna",
  "JEP": "Jersey Pound",
  "JMD": "Jamaican Dollar",
  "JOD": "Jordanian Dinar",
  "JPY": "Japanese Yen",
  "KES": "Kenyan Shilling",
  "KGS": "Kyrgyzstani Som",
  "KHR": "Cambodian Riel",
  "KID": "Kiribati Dollar",
  "KMF": "Comorian Franc",
  "KRW": "South Korean Won",
  "KWD": "Kuwaiti Dinar",
  "KYD": "Cayman Islands Dollar",
  "KZT": "Kazakhstani Tenge",
  "LAK": "Lao Kip",
  "LBP": "Lebanese Pound",
  "LKR": "Sri Lankan Rupee",
  "LRD": "Liberian Dollar",
  "LSL": "Lesotho Loti",
  "LYD": "Libyan Dinar",
  "MAD": "Moroccan Dirham",
  "MDL": "Moldovan Leu",
  "MGA": "Malagasy Ariary",
  "MKD": "Macedonian Denar",
  "MMK": "Burmese Kyat",
  "MNT": "Mongolian Tögrög",
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
  "PEN": "Peruvian Sol",
  "PGK": "Papua New Guinean Kina",
  "PHP": "Philippine Peso",
  "PKR": "Pakistani Rupee",
  "PLN": "Polish Złoty",
  "PYG": "Paraguayan Guaraní",
  "QAR": "Qatari Riyal",
  "RON": "Romanian Leu",
  "RSD": "Serbian Dinar",
  "RUB": "Russian Ruble",
  "RWF": "Rwandan Franc",
  "SAR": "Saudi Riyal",
  "SBD": "Solomon Islands Dollar",
  "SCR": "Seychellois Rupee",
  "SDG": "Sudanese Pound",
  "SEK": "Swedish Krona",
  "SGD": "Singapore Dollar",
  "SHP": "Saint Helena Pound",
  "SLE": "Sierra Leonean Leone",
  "SOS": "Somali Shilling",
  "SRD": "Surinamese Dollar",
  "SSP": "South Sudanese Pound",
  "STN": "São Tomé and Príncipe Dobra",
  "SYP": "Syrian Pound",
  "SZL": "Eswatini Lilangeni",
  "THB": "Thai Baht",
  "TJS": "Tajikistani Somoni",
  "TMT": "Turkmenistani Manat",
  "TND": "Tunisian Dinar",
  "TOP": "Tongan Paʻanga",
  "TRY": "Turkish Lira",
  "TTD": "Trinidad and Tobago Dollar",
  "TVD": "Tuvaluan Dollar",
  "TWD": "New Taiwan Dollar",
  "TZS": "Tanzanian Shilling",
  "UAH": "Ukrainian Hryvnia",
  "UGX": "Ugandan Shilling",
  "USD": "United States Dollar",
  "UYU": "Uruguayan Peso",
  "UZS": "Uzbekistani Soʻm",
  "VES": "Venezuelan Bolívar",
  "VND": "Vietnamese Đồng",
  "VUV": "Vanuatu Vatu",
  "WST": "Samoan Tālā",
  "XAF": "Central African CFA Franc",
  "XCD": "East Caribbean Dollar",
  "XDR": "Special Drawing Rights",
  "XOF": "West African CFA Franc",
  "XPF": "CFP Franc",
  "YER": "Yemeni Rial",
  "ZAR": "South African Rand",
  "ZMW": "Zambian Kwacha",
  "ZWL": "Zimbabwean Dollar"
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