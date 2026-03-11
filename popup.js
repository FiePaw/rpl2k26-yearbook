/**
 * Custom Popup/Modal System
 * Mengganti semua alert() dengan pop-up yang lebih estetik
 */

(function() {
    class CustomPopup {
        constructor() {
            this.activePopup = null;
        }

        /**
         * Tampilkan pop-up dengan tipe tertentu
         * @param {string} message - Pesan yang akan ditampilkan
         * @param {string} type - Tipe pop-up: 'info', 'success', 'error', 'warning', 'confirm'
         * @param {function} callback - Callback untuk confirm/cancel
         */
        show(message, type = 'info', callback = null) {
            // Remove existing popup if any
            const existing = document.getElementById('customPopupContainer');
            if (existing) existing.remove();

            const container = document.createElement('div');
            container.id = 'customPopupContainer';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            `;

            const popup = document.createElement('div');
            popup.className = `popup popup-${type}`;
            popup.style.cssText = `
                background: var(--bg-card, white);
                border-radius: 10px;
                padding: 2rem;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
                border-left: 5px solid ${this.getColorForType(type)};
            `;

            const iconMap = {
                info: 'fas fa-info-circle',
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                confirm: 'fas fa-question-circle'
            };

            const icon = iconMap[type] || 'fas fa-info-circle';
            const title = this.getTitleForType(type);

            popup.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 1rem;">
                    <i class="${icon}" style="font-size: 1.5rem; color: ${this.getColorForType(type)}; margin-top: 0.3rem; flex-shrink: 0;"></i>
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--text-color); font-size: 1.1rem;">${title}</h3>
                        <p style="margin: 0; color: var(--text-secondary); line-height: 1.5;">${this.escapeHtml(message)}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
                    <button class="popup-btn-cancel" style="padding: 0.6rem 1.2rem; border: 1px solid var(--border-color); background: var(--light-bg); color: var(--text-color); border-radius: 5px; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                        ${type === 'confirm' ? 'Cancel' : 'Close'}
                    </button>
                    ${type === 'confirm' ? `<button class="popup-btn-confirm" style="padding: 0.6rem 1.2rem; border: none; background: ${this.getColorForType(type)}; color: white; border-radius: 5px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Confirm</button>` : ''}
                </div>
            `;

            container.appendChild(popup);
            document.body.appendChild(container);

            // Add styles for animations
            if (!document.getElementById('popupStyles')) {
                const style = document.createElement('style');
                style.id = 'popupStyles';
                style.innerHTML = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .popup-btn-cancel:hover { background: var(--border-color); }
                    .popup-btn-confirm:hover { opacity: 0.9; transform: scale(1.02); }
                `;
                document.head.appendChild(style);
            }

            // Event listeners
            const cancelBtn = popup.querySelector('.popup-btn-cancel');
            cancelBtn.addEventListener('click', () => {
                container.remove();
                if (callback) callback(false);
            });

            if (type === 'confirm') {
                const confirmBtn = popup.querySelector('.popup-btn-confirm');
                confirmBtn.addEventListener('click', () => {
                    container.remove();
                    if (callback) callback(true);
                });
            }

            // Close on overlay click
            container.addEventListener('click', (e) => {
                if (e.target === container) {
                    container.remove();
                    if (type !== 'confirm' && callback) callback(false);
                }
            });

            this.activePopup = container;
            return this;
        }

        info(message, callback = null) {
            return this.show(message, 'info', callback);
        }

        success(message, callback = null) {
            return this.show(message, 'success', callback);
        }

        error(message, callback = null) {
            return this.show(message, 'error', callback);
        }

        warning(message, callback = null) {
            return this.show(message, 'warning', callback);
        }

        confirm(message, callback = null) {
            return this.show(message, 'confirm', callback);
        }

        getColorForType(type) {
            const colors = {
                info: '#2196F3',
                success: '#4CAF50',
                error: '#F44336',
                warning: '#FF9800',
                confirm: '#2196F3'
            };
            return colors[type] || colors.info;
        }

        getTitleForType(type) {
            const titles = {
                info: 'Information',
                success: 'Success',
                error: 'Error',
                warning: 'Warning',
                confirm: 'Confirmation'
            };
            return titles[type] || 'Message';
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Create global instance
    if (!window.popup) {
        window.popup = new CustomPopup();
    }

    // Override alert() globally
    window.alert = function(message) {
        window.popup.info(message);
    };

    // Export
    window.CustomPopup = CustomPopup;

})();
