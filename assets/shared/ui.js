/**
 * UI Utilities — Toast, Modal, Loader, Confirm
 * Globus Technical Academy ERP v1.00
 */

/* ── Toast Notifications ── */

function showToast(message, type) {
    type = type || 'info';
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;max-width:380px;width:calc(100% - 40px);';
        document.body.appendChild(container);
    }

    const colors = {
        success: { bg: '#27ae60', icon: '✓' },
        error: { bg: '#e74c3c', icon: '✕' },
        warning: { bg: '#f39c12', icon: '⚠' },
        info: { bg: '#4a90d9', icon: 'ℹ' }
    };

    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = 'background:' + c.bg + ';color:#fff;padding:14px 18px;border-radius:10px;display:flex;align-items:center;gap:10px;font-size:15px;box-shadow:0 4px 16px rgba(0,0,0,0.18);opacity:0;transform:translateX(40px);transition:all 0.3s ease;cursor:pointer;';
    toast.innerHTML = '<span style="font-size:18px;font-weight:bold;min-width:22px;text-align:center;">' + c.icon + '</span><span style="flex:1;">' + message + '</span>';
    toast.onclick = function () { dismissToast(toast); };

    container.appendChild(toast);

    /* Animate in */
    requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    /* Auto dismiss */
    setTimeout(function () { dismissToast(toast); }, 4000);
}

function dismissToast(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
}

/* ── Loading Overlay ── */

function showLoader(text) {
    text = text || 'Loading...';
    let overlay = document.getElementById('global-loader');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loader';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;';
        overlay.innerHTML = '<div style="text-align:center;"><div class="loader-spinner"></div><p style="margin-top:16px;font-size:16px;color:#1a3a5c;font-weight:500;" id="loader-text">' + text + '</p></div>';
        document.body.appendChild(overlay);
        /* Add spinner CSS if not exists */
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = '.loader-spinner{width:44px;height:44px;border:4px solid #e0e7ef;border-top-color:#4a90d9;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}@keyframes spin{to{transform:rotate(360deg)}}';
            document.head.appendChild(style);
        }
    } else {
        overlay.style.display = 'flex';
        const lt = document.getElementById('loader-text');
        if (lt) lt.textContent = text;
    }
}

function hideLoader() {
    const overlay = document.getElementById('global-loader');
    if (overlay) overlay.style.display = 'none';
}

/* ── Button Loading State ── */

function btnLoading(btn, loading, originalText) {
    if (loading) {
        btn.dataset.originalText = btn.textContent;
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.innerHTML = '<span class="loader-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Processing...';
    } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = originalText || btn.dataset.originalText || 'Submit';
    }
}

/* ── Confirm Dialog ── */

function showConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:10001;padding:20px;';

    overlay.innerHTML = '<div style="background:#fff;border-radius:14px;padding:28px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);text-align:center;">' +
        '<p style="font-size:16px;color:#333;margin-bottom:24px;line-height:1.5;">' + message + '</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;">' +
        '<button id="confirm-cancel" style="padding:10px 24px;border-radius:8px;border:1px solid #ddd;background:#f5f5f5;color:#666;font-size:15px;cursor:pointer;">Cancel</button>' +
        '<button id="confirm-ok" style="padding:10px 24px;border-radius:8px;border:none;background:#e74c3c;color:#fff;font-size:15px;cursor:pointer;font-weight:600;">Confirm</button>' +
        '</div></div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-ok').onclick = function () {
        document.body.removeChild(overlay);
        if (onConfirm) onConfirm();
    };
    overlay.querySelector('#confirm-cancel').onclick = function () {
        document.body.removeChild(overlay);
        if (onCancel) onCancel();
    };
    overlay.onclick = function (e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        }
    };
}

/* ── Modal ── */

function showModal(title, contentHTML, options) {
    options = options || {};
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:10001;padding:20px;';

    const maxW = options.maxWidth || '500px';
    overlay.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:' + maxW + ';width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
        '<div style="padding:20px 24px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">' +
        '<h3 style="margin:0;font-size:18px;color:#1a3a5c;">' + title + '</h3>' +
        '<button onclick="closeModal()" style="background:none;border:none;font-size:24px;color:#999;cursor:pointer;padding:0;line-height:1;">×</button>' +
        '</div>' +
        '<div style="padding:24px;" id="modal-body">' + contentHTML + '</div></div>';

    document.body.appendChild(overlay);

    overlay.onclick = function (e) {
        if (e.target === overlay) closeModal();
    };
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) document.body.removeChild(overlay);
}
