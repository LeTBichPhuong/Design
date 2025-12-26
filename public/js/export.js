document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const saveBtn   = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const savedList = document.getElementById('savedList');
    const newDesignBtn = document.getElementById('newDesignBtn');

    const csrf = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

    const BASE_IMAGE = 'us-marines.jpg';
    
    const STORAGE_URL = window.storageUrl || '/storage';
    const PLACEHOLDER = `${STORAGE_URL}/placeholder.png`;

    window.currentDesignId = null;

    // Toast function
    function toast(msg, type = 'success') {
        window.showToast?.(msg, type);
    }

    function formatDate(date) {
        return new Date(date).toLocaleString('vi-VN');
    }

    // Reset SVG to default
    function resetSVGToDefault() {
        const rect = document.getElementById('nameBg');
        const text = document.getElementById('printName');
        const nameInput = document.getElementById('nameInput');

        if (!rect || !text) return;

        const defaultValues = {
            rectX: 1416,
            rectY: 7748,
            rectWidth: 140,
            rectHeight: 31,
            bgColor: '#565559',
            strokeColor: '#dec27a',
            textColor: '#dec27a',
            fontSize: 160,
            fontFamily: 'Arial',
            fontWeight: 600,
            centerX: 1416,
            centerY: 7748
        };

        rect.setAttribute('x', defaultValues.rectX);
        rect.setAttribute('y', defaultValues.rectY);
        rect.setAttribute('width', defaultValues.rectWidth);
        rect.setAttribute('height', defaultValues.rectHeight);
        rect.setAttribute('fill', defaultValues.bgColor);
        rect.setAttribute('stroke', defaultValues.strokeColor);
        rect.style.display = 'none';

        text.textContent = '';
        text.setAttribute('fill', defaultValues.textColor);
        text.setAttribute('font-size', defaultValues.fontSize);
        text.setAttribute('font-family', defaultValues.fontFamily);
        text.setAttribute('font-weight', defaultValues.fontWeight);
        text.style.display = 'none';

        if (nameInput) {
            nameInput.value = '';
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const controls = {
            posX: document.getElementById('posX'),
            posY: document.getElementById('posY'),
            longPosX: document.getElementById('longPosX'),
            longPosY: document.getElementById('longPosY'),
            fontFamily: document.getElementById('fontFamily'),
            textColor: document.getElementById('textColor'),
            bgColor: document.getElementById('bgColor'),
            strokeColor: document.getElementById('strokeColor'),
            fontWeight: document.getElementById('fontWeight')
        };

        if (controls.posX) controls.posX.value = defaultValues.centerX;
        if (controls.posY) controls.posY.value = defaultValues.centerY;
        if (controls.longPosX) controls.longPosX.value = defaultValues.centerX;
        if (controls.longPosY) controls.longPosY.value = defaultValues.centerY;
        if (controls.fontFamily) controls.fontFamily.value = defaultValues.fontFamily;
        if (controls.textColor) controls.textColor.value = defaultValues.textColor;
        if (controls.bgColor) controls.bgColor.value = defaultValues.bgColor;
        if (controls.strokeColor) controls.strokeColor.value = defaultValues.strokeColor;
        if (controls.fontWeight) controls.fontWeight.value = defaultValues.fontWeight;

        const displays = {
            posXValue: document.getElementById('posXValue'),
            posYValue: document.getElementById('posYValue'),
            longPosXValue: document.getElementById('longPosXValue'),
            longPosYValue: document.getElementById('longPosYValue'),
            fontWeightValue: document.getElementById('fontWeightValue')
        };

        if (displays.posXValue) displays.posXValue.textContent = defaultValues.centerX;
        if (displays.posYValue) displays.posYValue.textContent = defaultValues.centerY;
        if (displays.longPosXValue) displays.longPosXValue.textContent = defaultValues.centerX;
        if (displays.longPosYValue) displays.longPosYValue.textContent = defaultValues.centerY;
        if (displays.fontWeightValue) displays.fontWeightValue.textContent = defaultValues.fontWeight;

        const url = new URL(window.location);
        url.searchParams.delete('name');
        window.history.replaceState({}, '', url);

        window.currentDesignId = null;

        loadDesigns();
    }

    // Nút tạo thiết kế mới
    if (newDesignBtn) {
        newDesignBtn.addEventListener('click', () => {
            resetSVGToDefault();
            toast('Đã tạo thiết kế mới', 'success');
        });
    }

    // Lấy config từ SVG và inputs
    function getConfig() {
        const nameInput = document.getElementById('nameInput');
        const rect = document.getElementById('nameBg');
        const text = document.getElementById('printName');
        const posX = document.getElementById('posX');
        const posY = document.getElementById('posY');
        const longPosX = document.getElementById('longPosX');
        const longPosY = document.getElementById('longPosY');
        const fontFamily = document.getElementById('fontFamily');
        const fontWeight = document.getElementById('fontWeight');
        const textColor = document.getElementById('textColor');
        const bgColor = document.getElementById('bgColor');
        const strokeColor = document.getElementById('strokeColor');

        if (!rect || !text) {
            console.error('SVG elements not found');
            return null;
        }

        // Lấy tọa độ thực tế từ SVG
        return {
            text: nameInput?.value || '',
            x: Number(rect.getAttribute('x')),
            y: Number(rect.getAttribute('y')),
            patchWidth: Number(rect.getAttribute('width')),
            patchHeight: Number(rect.getAttribute('height')),
            fontSize: Number(text.getAttribute('font-size')),
            fontFamily: text.getAttribute('font-family') || 'Arial',
            fontWeight: Number(text.getAttribute('font-weight')) || 600,
            textColor: text.getAttribute('fill') || '#dec27a',
            bgColor: rect.getAttribute('fill') || '#565559',
            strokeColor: rect.getAttribute('stroke') || '#dec27a',
            // Lưu slider values để restore
            centerX_short: Number(posX?.value || 1416),
            topY_short: Number(posY?.value || 7748),
            centerX_long: Number(longPosX?.value || 1416),
            topY_long: Number(longPosY?.value || 7748)
        };
    }

    // Render danh sách thiết kế đã lưu
    function renderSaved(designs) {
        if (!savedList) return;

        if (!Array.isArray(designs) || designs.length === 0) {
            savedList.innerHTML = `<div class="empty-state">Chưa có thiết kế nào</div>`;
            return;
        }

        savedList.innerHTML = '';

        designs.forEach(d => {
            const div = document.createElement('div');
            div.className = 'saved-item';
            div.dataset.designId = d.id;
            
            if (String(d.id) === String(window.currentDesignId)) {
                div.classList.add('active');
            }

            const imageUrl = d.export_image ? `${STORAGE_URL}/${d.export_image}` : PLACEHOLDER;

            div.innerHTML = `
                <div class="thumb">
                    <img
                        src="${imageUrl}"
                        alt="${d.name ?? 'Thiết kế'}"
                        onerror="this.onerror=null; this.src='${PLACEHOLDER}'"
                    >
                </div>
                <div class="saved-info">
                    <div class="saved-name">${d.name ?? 'Thiết kế'}</div>
                    <div class="saved-date">${formatDate(d.created_at)}</div>
                </div>
                <button class="delete-btn" title="Xóa">✕</button>
            `;

            // Select design
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) return;
                
                window.currentDesignId = d.id;
                renderSaved(designs);
                
                // Update URL
                const url = new URL(window.location);
                if (d.name) {
                    url.searchParams.set('name', d.name);
                } else {
                    url.searchParams.delete('name');
                }
                window.history.replaceState({}, '', url);
                
                // Load design to main
                loadDesignToMain(d);
                
                toast(`Thiết kế: ${d.name ?? 'thiết kế'}`, 'success');
            });

            // Xóa design
            div.querySelector('.delete-btn').addEventListener('click', e => {
                e.stopPropagation();

                showConfirm(
                    'Bạn có chắc chắn muốn xóa thiết kế này? Hành động này không thể hoàn tác.',
                    () => executeDelete(d.id)
                );
            });

            savedList.appendChild(div);
        });
    }

    // Load design từ server
    async function loadDesigns() {
        try {
            const res = await fetch('/designs', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            renderSaved(data);
            
            highlightFromUrl(data);

        } catch (e) {
            console.error('Load designs error:', e);
        }
    }

    loadDesigns();

    // Hightlight design từ URL
    function highlightFromUrl(designs) {
        const urlParams = new URLSearchParams(window.location.search);
        const nameFromUrl = urlParams.get('name');
        
        if (!nameFromUrl || !Array.isArray(designs)) return;
        
        // Tìm design có tên khớp với URL
        const matchedDesign = designs.find(d => d.name === nameFromUrl);
        
        if (matchedDesign) {
            window.currentDesignId = matchedDesign.id;
            
            renderSaved(designs);
            
            loadDesignToMain(matchedDesign);
        }
    }

    // Load design vào main từ design object
    function loadDesignToMain(design) {
        const cfg = typeof design.config === 'string' ? JSON.parse(design.config) : design.config;

        const nameInput = document.getElementById('nameInput');
        const posX = document.getElementById('posX');
        const posY = document.getElementById('posY');
        const longPosX = document.getElementById('longPosX');
        const longPosY = document.getElementById('longPosY');
        const fontFamily = document.getElementById('fontFamily');
        const fontWeight = document.getElementById('fontWeight');
        const textColor = document.getElementById('textColor');
        const bgColor = document.getElementById('bgColor');
        const strokeColor = document.getElementById('strokeColor');

        // Cập nhật các control inputs
        if (cfg.centerX_short) posX.value = cfg.centerX_short;
        if (cfg.topY_short) posY.value = cfg.topY_short;
        if (cfg.centerX_long) longPosX.value = cfg.centerX_long;
        if (cfg.topY_long) longPosY.value = cfg.topY_long;
        if (cfg.fontFamily) fontFamily.value = cfg.fontFamily;
        if (cfg.fontWeight) fontWeight.value = cfg.fontWeight;
        if (cfg.textColor) textColor.value = cfg.textColor;
        if (cfg.bgColor) bgColor.value = cfg.bgColor;
        if (cfg.strokeColor) strokeColor.value = cfg.strokeColor;

        // Cập nhật hiển thị giá trị
        const displays = {
            posXValue: document.getElementById('posXValue'),
            posYValue: document.getElementById('posYValue'),
            longPosXValue: document.getElementById('longPosXValue'),
            longPosYValue: document.getElementById('longPosYValue'),
            fontWeightValue: document.getElementById('fontWeightValue')
        };

        if (displays.posXValue && cfg.centerX_short) displays.posXValue.textContent = cfg.centerX_short;
        if (displays.posYValue && cfg.topY_short) displays.posYValue.textContent = cfg.topY_short;
        if (displays.longPosXValue && cfg.centerX_long) displays.longPosXValue.textContent = cfg.centerX_long;
        if (displays.longPosYValue && cfg.topY_long) displays.longPosYValue.textContent = cfg.topY_long;
        if (displays.fontWeightValue) displays.fontWeightValue.textContent = cfg.fontWeight || 600;

        // Cập nhật SVG
        if (nameInput) {
            nameInput.value = cfg.text || '';
            
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Lưu thiết kế
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {

            const config = getConfig();
            if (!config || !config.text) {
                toast('Vui lòng nhập tên', 'error');
                return;
            }

            saveBtn.disabled = true;
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'LƯU';

            try {
                const isUpdate = window.currentDesignId && 
                                !String(window.currentDesignId).startsWith('guest_');
                
                const url = isUpdate ? `/designs/${window.currentDesignId}` : '/designs';
                const method = isUpdate ? 'PUT' : 'POST';

                // BƯỚC 1: Lưu thiết kế
                const res = await fetch(url, {
                    method: method,
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRF-TOKEN': csrf,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: config.text || null,
                        base_image: BASE_IMAGE,
                        config
                    })
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();

                if (data.design) {
                    window.currentDesignId = data.design.id;
                    
                    // Xuất ảnh tự động sau khi lưu
                    try {
                        const exportRes = await fetch(
                            `/designs/${window.currentDesignId}/export`,
                            {
                                method: 'POST',
                                credentials: 'same-origin',
                                headers: {
                                    'X-CSRF-TOKEN': csrf,
                                    'Accept': 'application/json'
                                }
                            }
                        );

                        if (exportRes.ok) {
                            const exportData = await exportRes.json();
                            console.log('Auto export success:', exportData);
                        }
                    } catch (exportError) {
                        console.error('Auto export error:', exportError);
                    }
                    
                    toast(isUpdate ? 'Đã cập nhật thành công' : 'Đã lưu thành công', 'success');
                    await loadDesigns();
                } else {
                    toast('Đã lưu tạm thời', 'success');
                    renderSaved(data.designs);
                }

            } catch (e) {
                console.error('Save error:', e);
                toast('Lưu thất bại', 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        });
    }
    // Xóa thiết kế
    function deleteDesign(id) {
        if (typeof window.showConfirm !== 'function') {
            if (!confirm('Xác nhận xóa thiết kế này?')) return;
            executeDelete(id);
        } else {
            window.showConfirm('Xác nhận xóa thiết kế này?', () => executeDelete(id));
        }
    }

    async function executeDelete(id) {
        try {
            const res = await fetch(`/designs/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // Nếu đang chọn design bị xóa
            if (String(window.currentDesignId) === String(id)) {
                window.currentDesignId = null;
            }

            showToast('Đã xóa thành công', 'success');

            await loadDesigns();

        } catch (e) {
            console.error('Delete error:', e);
            showToast('Xóa thất bại', 'error');
        }
    }

    // Xuất thiết kế
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {

            if (!window.currentDesignId) {
                toast('Vui lòng chọn thiết kế để xuất', 'error');
                return;
            }

            exportBtn.disabled = true;
            const originalText = exportBtn.textContent;
            exportBtn.textContent = 'XUẤT';

            try {
                const res = await fetch(
                    `/designs/${window.currentDesignId}/export`,
                    {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'X-CSRF-TOKEN': csrf,
                            'Accept': 'application/json'
                        }
                    }
                );

                const contentType = res.headers.get('content-type');
                
                if (!res.ok) {
                    const error = contentType?.includes('application/json') 
                        ? await res.json() 
                        : { error: await res.text() };
                    throw new Error(error.message || error.error || 'Export failed');
                }

                if (!contentType?.includes('application/json')) {
                    throw new Error('Invalid response');
                }

                const data = await res.json();
                
                if (!data.url) {
                    throw new Error('No URL returned');
                }

                // Tạo link tải file
                const downloadLink = document.createElement('a');
                downloadLink.href = data.url;
                downloadLink.download = data.filename || `design-${window.currentDesignId}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                // Hoặc mở file trong tab mới
                setTimeout(() => window.open(data.url, '_blank'), 100);
                
                toast('Đã xuất thành công', 'success');
                await loadDesigns();

            } catch (e) {
                console.error('Export error:', e);
                toast('Xuất thất bại', 'error');
            } finally {
                exportBtn.disabled = false;
                exportBtn.textContent = originalText;
            }
        });
    }

});