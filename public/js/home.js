document.addEventListener('DOMContentLoaded', () => {
    // Name từ URL và input
    const params = new URLSearchParams(window.location.search);
    let currentName = params.get('name') || '';

    const nameInput = document.getElementById('nameInput');
    if (nameInput) {
        nameInput.value = currentName;
        nameInput.addEventListener('input', () => {
            currentName = nameInput.value.trim();

            const url = new URL(window.location);
            if (currentName) {
                url.searchParams.set('name', currentName);
            } else {
                url.searchParams.delete('name');
            }
            window.history.replaceState({}, '', url);

            updateName();
        });
    }

    // SVG elements
    const text = document.getElementById('printName');
    const bg   = document.getElementById('nameBg');

    // Cấu hình
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const longPosX = document.getElementById('longPosX');
    const longPosY = document.getElementById('longPosY');
    const fontFamily = document.getElementById('fontFamily');
    const textColor = document.getElementById('textColor');
    const bgColor = document.getElementById('bgColor');
    const strokeColor = document.getElementById('strokeColor');
    const fontWeight = document.getElementById('fontWeight');

    const SHORT_LIMIT = 13;
    const MAX_PER_LINE = 20;

    const paddingX = 60;
    const paddingY = 30;

    const baseFontSize = 160;
    const minFontSize = 110;
    const maxPatchWidth = 1800;

    // Sụ kiện thay đổi cấu hình
    [posX, posY, longPosX, longPosY, fontFamily, textColor, bgColor, strokeColor, fontWeight]
        .forEach(el => el && el.addEventListener('input', updateName));

    // Cập nhật tên hiển thị
    function updateName() {
        if (!currentName) {
            bg.style.display = 'none';
            text.style.display = 'none';
            return;
        }

        bg.style.display = 'block';
        text.style.display = 'block';

        const upper = currentName.toUpperCase();

        text.innerHTML = '';
        text.setAttribute('font-size', baseFontSize);
        text.setAttribute('font-weight', fontWeight.value);
        text.setAttribute('font-family', fontFamily.value);
        text.setAttribute('fill', textColor.value);
        text.setAttribute('text-anchor', 'middle');

        // Sử dụng giá trị từ range sliders
        const isShort = upper.length <= SHORT_LIMIT;
        const baseX = isShort ? parseInt(posX.value) : parseInt(longPosX.value);
        const baseY = isShort ? parseInt(posY.value) : parseInt(longPosY.value);

        // Chia thành nhiều dòng
        const lines = [];
        for (let i = 0; i < upper.length; i += MAX_PER_LINE) {
            lines.push(upper.slice(i, i + MAX_PER_LINE));
        }

        lines.forEach((line, i) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = line;
            tspan.setAttribute('x', baseX);
            if (i === 0) tspan.setAttribute('y', 0);
            else tspan.setAttribute('dy', '1.15em');
            text.appendChild(tspan);
        });

        requestAnimationFrame(() => {
            let size = baseFontSize;
            let box = text.getBBox();

            while (box.width + paddingX * 2 > maxPatchWidth && size > minFontSize) {
                size--;
                text.setAttribute('font-size', size);
                box = text.getBBox();
            }

            const patchWidth = box.width + paddingX * 2;
            const patchHeight = box.height + paddingY * 2;

            // Sử dụng baseY từ range slider
            bg.setAttribute('x', baseX - patchWidth / 2);
            bg.setAttribute('y', baseY);
            bg.setAttribute('width', patchWidth);
            bg.setAttribute('height', patchHeight);
            bg.setAttribute('fill', bgColor.value);
            bg.setAttribute('stroke', strokeColor.value);

            const textY = baseY + paddingY - box.y;
            text.querySelector('tspan')?.setAttribute('y', textY);
        });
    }

    updateName();

    // Toast notification
    const toast = document.getElementById('toast');
    const toastMessage = toast?.querySelector('.toast-message');
    const toastClose = toast?.querySelector('.toast-close');
    const toastProgress = toast?.querySelector('.toast-progress');

    let toastTimer = null;

    window.showToast = function (message, type = 'success', duration = 3000) {
        if (!toast) return;

        if (toastTimer) clearTimeout(toastTimer);

        toast.className = 'toast';
        toast.classList.add(type, 'show');

        if (toastMessage) toastMessage.textContent = message;

        if (toastProgress) {
            toastProgress.style.transition = 'none';
            toastProgress.style.width = '100%';

            setTimeout(() => {
                toastProgress.style.transition = `width ${duration}ms linear`;
                toastProgress.style.width = '0%';
            }, 10);
        }

        toastTimer = setTimeout(hideToast, duration);
    };

    function hideToast() {
        toast?.classList.remove('show');
        if (toastTimer) clearTimeout(toastTimer);
    }

    toastClose?.addEventListener('click', hideToast);

    // thông báo xác nhận xóa 
    const confirmModal = document.getElementById('confirmModal');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmDelete  = document.getElementById('confirmDelete');

    let deleteCallback = null;

    window.showConfirm = function (message, onConfirm) {
        if (!confirmModal) {
            console.error('confirmModal not found');
            return;
        }

        const msgEl = confirmModal.querySelector('p');
        if (msgEl) msgEl.textContent = message;

        confirmModal.classList.remove('hidden');
        deleteCallback = onConfirm;
    };

    function hideConfirm() {
        confirmModal?.classList.add('hidden');
        deleteCallback = null;
    }

    confirmCancel?.addEventListener('click', hideConfirm);

    confirmDelete?.addEventListener('click', () => {
        if (typeof deleteCallback === 'function') {
            deleteCallback();
        }
        hideConfirm();
    });

    confirmModal?.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            hideConfirm();
        }
    });

    // Dropdown menus
    const menuText = document.getElementById('menuText');
    const menuPositionShort = document.getElementById('menuPositionShort');
    const menuPositionLong = document.getElementById('menuPositionLong');
    const menuFont = document.getElementById('menuFont');
    const menuColors = document.getElementById('menuColors');

    const dropdownText = document.getElementById('dropdownText');
    const dropdownShort = document.getElementById('dropdownShort');
    const dropdownLong = document.getElementById('dropdownLong');
    const dropdownFont = document.getElementById('dropdownFont');
    const dropdownColors = document.getElementById('dropdownColors');

    function closeAllDropdowns() {
        [dropdownText, dropdownShort, dropdownLong, dropdownFont, dropdownColors].forEach(d => {
            if (d) d.classList.remove('show');
        });
        [menuText, menuPositionShort, menuPositionLong, menuFont, menuColors].forEach(m => {
            if (m) m.classList.remove('active');
        });
    }

    [dropdownText, dropdownShort, dropdownLong, dropdownFont, dropdownColors].forEach(dropdown => {
        if (dropdown) {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    });

    // Mở menu con
    if (menuText) {
        menuText.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownText?.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen && dropdownText) {
                dropdownText.classList.add('show');
                menuText.classList.add('active');
            }
        });
    }

    if (menuPositionShort) {
        menuPositionShort.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownShort?.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen && dropdownShort) {
                dropdownShort.classList.add('show');
                menuPositionShort.classList.add('active');
            }
        });
    }

    if (menuPositionLong) {
        menuPositionLong.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownLong?.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen && dropdownLong) {
                dropdownLong.classList.add('show');
                menuPositionLong.classList.add('active');
            }
        });
    }

    if (menuFont) {
        menuFont.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownFont?.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen && dropdownFont) {
                dropdownFont.classList.add('show');
                menuFont.classList.add('active');
            }
        });
    }

    if (menuColors) {
        menuColors.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownColors?.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen && dropdownColors) {
                dropdownColors.classList.add('show');
                menuColors.classList.add('active');
            }
        });
    }

    // Đóng menu con khi nhấn Enter trong input
    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                closeAllDropdowns();
                nameInput.blur();
            }
        });
    }

    // Đóng menu con khi click ra ngoài
    document.addEventListener('click', (e) => {
        const clickedInsideMenu = e.target.closest('.menu-item') || e.target.closest('.dropdown-menu');
        if (!clickedInsideMenu) {
            closeAllDropdowns();
        }
    });

    // Cập nhật giá trị hiển thị của sliders
    if (posX) posX.oninput = () => {
        const val = document.getElementById('posXValue');
        if (val) val.textContent = posX.value;
    };
    if (posY) posY.oninput = () => {
        const val = document.getElementById('posYValue');
        if (val) val.textContent = posY.value;
    };
    if (longPosX) longPosX.oninput = () => {
        const val = document.getElementById('longPosXValue');
        if (val) val.textContent = longPosX.value;
    };
    if (longPosY) longPosY.oninput = () => {
        const val = document.getElementById('longPosYValue');
        if (val) val.textContent = longPosY.value;
    };
    if (fontWeight) fontWeight.oninput = () => {
        const val = document.getElementById('fontWeightValue');
        if (val) val.textContent = fontWeight.value;
    };

    // Áp dụng cấu hình vào SVG
    function applyConfigToSVG(cfg) {
        const rect = document.getElementById('nameBg');
        const text = document.getElementById('printName');

        // Patch
        rect.setAttribute('x', cfg.x - cfg.patchWidth / 2);
        rect.setAttribute('y', cfg.y - cfg.patchHeight / 2);
        rect.setAttribute('width', cfg.patchWidth);
        rect.setAttribute('height', cfg.patchHeight);
        rect.setAttribute('fill', cfg.bgColor);
        rect.setAttribute('stroke', cfg.strokeColor);

        // Text
        text.textContent = cfg.text;
        text.setAttribute('x', cfg.x);
        text.setAttribute('y', cfg.y);
        text.setAttribute('fill', cfg.textColor);
        text.setAttribute('font-size', cfg.fontSize);

        // Nếu có input name → sync lại
        const nameInput = document.getElementById('printNameInput');
        if (nameInput) {
            nameInput.value = cfg.text;
        }
    }

    // Định dạng ngày tháng
    function formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    window.updateName = updateName; 
});