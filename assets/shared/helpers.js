/**
 * Helper Utilities
 * Globus Technical Academy ERP v1.00
 */

/* ── Date Helpers ── */

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateInput(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    return new Date(dateStr).toISOString().split('T')[0];
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

/* ── Currency Helpers ── */

function formatCurrency(amount, symbol) {
    symbol = symbol || '₹';
    const num = parseFloat(amount) || 0;
    return symbol + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ── Phone Helpers ── */

function cleanPhone(phone) {
    return (phone || '').replace(/[^0-9]/g, '');
}

function phoneCallLink(phone, countryCode) {
    countryCode = countryCode || '91';
    const clean = cleanPhone(phone);
    return 'tel:+' + countryCode + clean;
}

function phoneWhatsAppLink(phone, countryCode) {
    countryCode = countryCode || '91';
    const clean = cleanPhone(phone);
    return 'https://wa.me/' + countryCode + clean;
}

function phoneSMSLink(phone, countryCode) {
    countryCode = countryCode || '91';
    const clean = cleanPhone(phone);
    return 'sms:+' + countryCode + clean;
}

/* ── Validation Helpers ── */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    const clean = cleanPhone(phone);
    return clean.length >= 10 && clean.length <= 12;
}

function isNotEmpty(val) {
    return val !== null && val !== undefined && val.toString().trim() !== '';
}

/* ── String Helpers ── */

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function titleCase(str) {
    if (!str) return '';
    return str.split(' ').map(w => capitalize(w)).join(' ');
}

function truncate(str, len) {
    len = len || 30;
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '…' : str;
}

/* ── URL Param Helpers ── */

function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
}

/* ── Debounce ── */

function debounce(fn, delay) {
    delay = delay || 300;
    let timer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
}

/* ── Status Badge Helpers ── */

function statusColor(status) {
    switch (status) {
        case 'Active': return '#4a90d9';
        case 'Course Finished': return '#27ae60';
        case 'Discontinued': return '#e74c3c';
        case 'Archived': return '#95a5a6';
        default: return '#7f8c8d';
    }
}

function statusBgColor(status) {
    switch (status) {
        case 'Active': return '#eaf2fb';
        case 'Course Finished': return '#eafaf1';
        case 'Discontinued': return '#fdecea';
        case 'Archived': return '#f0f0f0';
        default: return '#f5f5f5';
    }
}

/* ── Local Storage Wrapper ── */

function lsGet(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch (e) {
        return null;
    }
}

function lsSet(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

function lsRemove(key) {
    localStorage.removeItem(key);
}
