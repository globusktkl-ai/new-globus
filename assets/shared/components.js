/**
 * Reusable UI Components
 * Globus Technical Academy ERP v1.00
 */

/* ── Status Badge ── */

function renderStatusBadge(status) {
    const color = statusColor(status);
    const bg = statusBgColor(status);
    return '<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;color:' + color + ';background:' + bg + ';white-space:nowrap;">' + status + '</span>';
}

/* ── Phone Action Buttons ── */

function renderPhoneActions(phone, countryCode) {
    countryCode = countryCode || '91';
    if (!phone) return '—';
    return '<span style="display:inline-flex;gap:6px;">' +
        '<a href="' + phoneCallLink(phone, countryCode) + '" title="Call" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#27ae60;color:#fff;text-decoration:none;font-size:14px;">📞</a>' +
        '<a href="' + phoneWhatsAppLink(phone, countryCode) + '" target="_blank" title="WhatsApp" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#25d366;color:#fff;text-decoration:none;font-size:14px;">💬</a>' +
        '<a href="' + phoneSMSLink(phone, countryCode) + '" title="SMS" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#4a90d9;color:#fff;text-decoration:none;font-size:14px;">✉</a>' +
        '</span>';
}

/* ── Student Photo ── */

function renderStudentPhoto(url, name, size) {
    size = size || 44;
    if (url) {
        return '<img src="' + url + '" alt="' + (name || '') + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid #e0e7ef;">';
    }
    const initials = (name || '?').split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#4a90d9;color:#fff;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.38) + 'px;font-weight:600;">' + initials + '</div>';
}

/* ── Empty State ── */

function renderEmptyState(message, icon) {
    icon = icon || '📭';
    return '<div style="text-align:center;padding:60px 20px;color:#999;">' +
        '<div style="font-size:48px;margin-bottom:12px;">' + icon + '</div>' +
        '<p style="font-size:16px;">' + (message || 'No data found') + '</p></div>';
}

/* ── Dashboard Stat Card ── */

function renderStatCard(label, value, icon, color) {
    color = color || '#4a90d9';
    return '<div class="stat-card" style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);display:flex;align-items:center;gap:16px;min-width:0;">' +
        '<div style="width:50px;height:50px;border-radius:12px;background:' + color + '15;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">' + icon + '</div>' +
        '<div style="min-width:0;">' +
        '<div style="font-size:24px;font-weight:700;color:#1a3a5c;">' + value + '</div>' +
        '<div style="font-size:13px;color:#888;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</div>' +
        '</div></div>';
}

/* ── Menu Button ── */

function renderMenuButton(label, icon, href, color) {
    color = color || '#4a90d9';
    return '<a href="' + href + '" class="menu-btn" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 12px;background:#fff;border-radius:14px;text-decoration:none;box-shadow:0 2px 12px rgba(0,0,0,0.06);transition:transform 0.15s,box-shadow 0.15s;cursor:pointer;">' +
        '<div style="width:48px;height:48px;border-radius:12px;background:' + color + '15;display:flex;align-items:center;justify-content:center;font-size:22px;">' + icon + '</div>' +
        '<span style="font-size:13px;font-weight:600;color:#1a3a5c;text-align:center;">' + label + '</span></a>';
}

/* ── Page Header ── */

function renderPageHeader(title, subtitle, actions) {
    actions = actions || '';
    return '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">' +
        '<div><h1 style="margin:0;font-size:22px;color:#1a3a5c;">' + title + '</h1>' +
        (subtitle ? '<p style="margin:4px 0 0;font-size:14px;color:#888;">' + subtitle + '</p>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + actions + '</div></div>';
}

/* ── Search Bar ── */

function renderSearchBar(placeholder, id) {
    id = id || 'search-input';
    return '<div style="position:relative;margin-bottom:20px;">' +
        '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:18px;color:#aaa;">🔍</span>' +
        '<input type="text" id="' + id + '" placeholder="' + (placeholder || 'Search...') + '" style="width:100%;padding:12px 14px 12px 44px;border:1px solid #e0e7ef;border-radius:10px;font-size:16px;outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor=\'#4a90d9\'" onblur="this.style.borderColor=\'#e0e7ef\'">' +
        '</div>';
}

/* ── Sort Dropdown ── */

function renderSortDropdown(options, id) {
    id = id || 'sort-select';
    let html = '<select id="' + id + '" style="padding:10px 14px;border:1px solid #e0e7ef;border-radius:10px;font-size:15px;outline:none;background:#fff;cursor:pointer;min-width:160px;">';
    for (let i = 0; i < options.length; i++) {
        html += '<option value="' + options[i].value + '">' + options[i].label + '</option>';
    }
    html += '</select>';
    return html;
}

/* ── Back Button ── */

function renderBackBtn(href, label) {
    label = label || 'Back';
    return '<a href="' + href + '" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#f5f7fa;color:#1a3a5c;text-decoration:none;font-size:14px;font-weight:500;transition:background 0.2s;">← ' + label + '</a>';
}

/* ── Primary Button ── */

function renderPrimaryBtn(label, id, color) {
    color = color || '#4a90d9';
    return '<button id="' + id + '" style="padding:12px 28px;border:none;border-radius:10px;background:' + color + ';color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:opacity 0.2s;" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">' + label + '</button>';
}

/* ── Info Row (label + value) ── */

function renderInfoRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;gap:12px;">' +
        '<span style="color:#888;font-size:14px;flex-shrink:0;">' + label + '</span>' +
        '<span style="color:#1a3a5c;font-size:15px;font-weight:500;text-align:right;word-break:break-word;">' + (value || '—') + '</span></div>';
}

/* ── Section Title ── */

function renderSectionTitle(title) {
    return '<h2 style="font-size:17px;color:#1a3a5c;margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid #eaf2fb;">' + title + '</h2>';
}

/* ── Tab Bar ── */

function renderTabBar(tabs, activeIndex) {
    activeIndex = activeIndex || 0;
    let html = '<div class="tab-bar" style="display:flex;gap:0;border-bottom:2px solid #e0e7ef;margin-bottom:20px;">';
    for (let i = 0; i < tabs.length; i++) {
        const active = i === activeIndex;
        html += '<button class="tab-btn" data-tab="' + i + '" style="padding:12px 20px;border:none;background:none;font-size:15px;font-weight:' + (active ? '600' : '400') + ';color:' + (active ? '#4a90d9' : '#888') + ';cursor:pointer;border-bottom:2px solid ' + (active ? '#4a90d9' : 'transparent') + ';margin-bottom:-2px;transition:all 0.2s;">' + tabs[i] + '</button>';
    }
    html += '</div>';
    return html;
}
