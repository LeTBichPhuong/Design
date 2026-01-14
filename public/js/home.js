document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    let currentName = '';

    const nameInput = document.getElementById('nameInput');
    const baseImage = document.getElementById('baseImage');

    let hasSetupBg = false;     // Người dùng đã chọn màu nền chưa
    let hasSetupStroke = false; // Người dùng đã chọn màu viền chưa

    // Giữ URL, chỉ load name vào input
    if (nameInput) {
        if (nameInput.value && nameInput.value.trim() !== '') {
            currentName = nameInput.value;
        } else {
            currentName = params.get('name') || '';
            nameInput.value = currentName;
        }
        
        nameInput.addEventListener('input', () => {
            currentName = nameInput.value;
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
    const svg = document.getElementById('printLayer');
    const text = document.getElementById('printName');
    const bg = document.getElementById('nameBg');

    // Cấu hình
    const fontFamily = document.getElementById('fontFamily');
    const fontSize = document.getElementById('fontSize');
    const fontSizeInput = document.getElementById('fontSizeInput');
    const textColor = document.getElementById('textColor');
    const bgColor = document.getElementById('bgColor');
    const strokeColor = document.getElementById('strokeColor');

    // Format buttons
    const btnBold = document.getElementById('btnBold');
    const btnItalic = document.getElementById('btnItalic');
    const btnUnderline = document.getElementById('btnUnderline');

    let isBold = false;
    let isItalic = false;
    let isUnderline = false;

    // FIX: Drag state - Dùng biến global để export.js truy cập được
    let isDragging = false;
    window.currentTextX = 0;
    window.currentTextY = 0;
    window.currentPatchWidth = 0;
    window.currentPatchHeight = 0;

    const paddingX = 60;
    const paddingY = 30;

    // Upload elements
    const fileInput = document.getElementById('fileInput');
    const changeImageBtn = document.getElementById('changeImageBtn');
    const uploadArea = document.getElementById('uploadArea');
    const imageContainer = document.getElementById('imageContainer');
    const newDesignBtn = document.getElementById('newDesignBtn');

    // CSRF
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    // Hỗ trợ anh high-res
    window.currentFullResImageUrl = null;

    async function loadImageForEditor(fullUrl) {
        if (!fullUrl) return;

        window.currentFullResImageUrl = fullUrl;

        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = fullUrl;
        });

        const MAX_EDIT_SIZE = 2000;
        let { naturalWidth: w, naturalHeight: h } = img;

        if (w <= MAX_EDIT_SIZE && h <= MAX_EDIT_SIZE) {
            baseImage.src = fullUrl;
        } else {
            const ratio = Math.min(MAX_EDIT_SIZE / w, MAX_EDIT_SIZE / h);
            const newW = Math.floor(w * ratio);
            const newH = Math.floor(h * ratio);

            const canvas = document.createElement('canvas');
            canvas.width = newW;
            canvas.height = newH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, newW, newH);

            const resizedDataURL = canvas.toDataURL('image/jpeg', 0.92);
            baseImage.src = resizedDataURL;
        }

        baseImage.onload = () => {
            updateSVGViewBox();
            updateName();
        };
    }

    // Sync font size
    if (fontSize && fontSizeInput) {
        function addFontSizeOption(value) {
            if (!value) return;
            const val = String(value);
            if (!fontSize.querySelector(`option[value="${val}"]`)) {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = val;
                fontSize.appendChild(option);
            }
        }

        // 1. Chọn từ "Chọn nhanh"
        fontSize.addEventListener('change', () => {
            if (fontSize.value) {
                fontSizeInput.value = fontSize.value;
                updateName();
                saveDesign();
            }
        });

        // 2. Gõ tay vào input → đồng bộ lên select
        fontSizeInput.addEventListener('input', () => {
            const val = fontSizeInput.value.trim();
            if (val) {
                addFontSizeOption(val);
                fontSize.value = val;
            } else {
                fontSize.value = '';
            }
        });

        // 3. Khi blur hoặc Enter → validate và giữ hiển thị trên select
        fontSizeInput.addEventListener('blur', () => {
            let val = parseInt(fontSizeInput.value);
            if (isNaN(val) || val < 10) val = 80;
            if (val > 500) val = 500;

            fontSizeInput.value = val;

            // Thêm option nếu chưa có và hiển thị lên select
            addFontSizeOption(val);
            fontSize.value = val;

            updateName();
            saveDesign();
        });

        fontSizeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                fontSizeInput.blur();
            }
        });
    }

    // Load saved design from localStorage
    function loadSavedDesign() {
        try {
            const saved = localStorage.getItem('currentDesign');
            if (saved) {
                const design = JSON.parse(saved);
                
                currentName = design.name || '';
                if (nameInput) nameInput.value = currentName;

                window.currentTextX = design.textX || 0;
                window.currentTextY = design.textY || 0;
                window.currentPatchWidth = design.patchWidth || 0;
                window.currentPatchHeight = design.patchHeight || 0;

                if (design.fontFamily && fontFamily) fontFamily.value = design.fontFamily;
                if (design.fontSize) {
                    if (fontSizeInput) fontSizeInput.value = design.fontSize;
                    if (fontSize) fontSize.value = design.fontSize;
                }
                if (design.textColor && textColor) textColor.value = design.textColor;
                if (design.bgColor && bgColor) bgColor.value = design.bgColor;
                if (design.strokeColor && strokeColor) strokeColor.value = design.strokeColor;

                isBold = design.isBold || false;
                isItalic = design.isItalic || false;
                isUnderline = design.isUnderline || false;

                if (btnBold) btnBold.classList.toggle('active', isBold);
                if (btnItalic) btnItalic.classList.toggle('active', isItalic);
                if (btnUnderline) btnUnderline.classList.toggle('active', isUnderline);

                if (design.imageDataUrl) {
                    baseImage.src = design.imageDataUrl;
                    baseImage.onload = () => {
                        updateSVGViewBox();
                        setTimeout(() => updateName(), 100);
                    };
                    if (uploadArea) uploadArea.style.display = 'none';
                    if (imageContainer) imageContainer.style.display = 'block';
                    if (changeImageBtn) changeImageBtn.classList.add('active');
                }
            }
        } catch (e) {
            console.error('Error loading saved design:', e);
        }
    }

    // Gọi load saved design
    function saveDesign() {
        try {
            const selectedOption = fontFamilySelect?.options[fontFamilySelect.selectedIndex];
            const customFontFile = selectedOption?.dataset?.serverFile || null;
            
            const design = {
                name: currentName,
                textX: window.currentTextX,
                textY: window.currentTextY,
                patchWidth: window.currentPatchWidth,
                patchHeight: window.currentPatchHeight,
                fontFamily: fontFamily?.value || 'Arial, sans-serif',
                fontSize: parseInt(fontSizeInput?.value || fontSize?.value || 80),
                textColor: textColor?.value || '#dec27a',
                bgColor: bgColor?.value || '#565559',
                strokeColor: strokeColor?.value || '#dec27a',
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                isBold, isItalic, isUnderline,
                imageDataUrl: baseImage.src,
                customFontFile: customFontFile  // ← THÊM DÒNG NÀY
            };
            localStorage.setItem('currentDesign', JSON.stringify(design));
        } catch (e) {
            console.error('Error saving design:', e);
        }
    }

    // Gọi load saved design ngay khi script chạy
    if (newDesignBtn) {
        newDesignBtn.addEventListener('click', () => {
            localStorage.removeItem('currentDesign');
            window.currentDesignId = null;
            window.currentBaseImage = null;
            window.currentFullResImageUrl = null;

            currentName = '';
            if (nameInput) nameInput.value = '';

            const url = new URL(window.location);
            url.searchParams.delete('name');
            window.history.replaceState({}, '', url);

            window.currentTextX = 0;
            window.currentTextY = 0;
            window.currentPatchWidth = 0;
            window.currentPatchHeight = 0;

            if (fontSizeInput) fontSizeInput.value = '80';
            if (fontFamily) fontFamily.value = 'Arial, sans-serif';
            if (textColor) textColor.value = '#dec27a';
            if (bgColor) bgColor.value = '#565559';
            if (strokeColor) strokeColor.value = '#dec27a';

            isBold = isItalic = isUnderline = false;
            if (btnBold) btnBold.classList.remove('active');
            if (btnItalic) btnItalic.classList.remove('active');
            if (btnUnderline) btnUnderline.classList.remove('active');

            if (uploadArea) uploadArea.style.display = 'flex';
            if (imageContainer) imageContainer.style.display = 'none';
            if (changeImageBtn) changeImageBtn.classList.remove('active');
            baseImage.src = '';

            if (bg) bg.style.display = 'none';
            if (text) text.style.display = 'none';

            setTimeout(() => {
                const event = new CustomEvent('designsNeedReload');
                document.dispatchEvent(event);
            }, 100);

            if (window.showToast) window.showToast('Đã tạo thiết kế mới', 'success');
        });
    }

    // Cập nhật viewBox SVG khi ảnh load xong
    function updateSVGViewBox() {
        if (!svg || !baseImage || !baseImage.complete || !baseImage.naturalWidth) return;

        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const imgHeight = baseImage.naturalHeight || baseImage.height;

        svg.setAttribute('viewBox', `0 0 ${imgWidth} ${imgHeight}`);
        svg.setAttribute('width', imgWidth);
        svg.setAttribute('height', imgHeight);

        if (window.currentTextX === 0 && window.currentTextY === 0) {
            window.currentTextX = imgWidth / 2;
            window.currentTextY = imgHeight / 2;
        }

        updateName();
    }

    if (baseImage) {
        baseImage.addEventListener('load', () => {
            updateSVGViewBox();
            updateName();
        });
    }

    // File upload
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;

            try {
                const formData = new FormData();
                formData.append('image', file, file.name || 'design.png');

                const uploadRes = await fetch('/upload-image', {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrf },
                    body: formData
                });

                if (!uploadRes.ok) throw new Error('Upload thất bại');

                const uploadData = await uploadRes.json();
                const fullImageUrl = '/' + uploadData.path.replace(/^\/+/, '');

                await loadImageForEditor(fullImageUrl);

                // UI cập nhật
                if (uploadArea) uploadArea.style.display = 'none';
                if (imageContainer) imageContainer.style.display = 'block';
                if (changeImageBtn) changeImageBtn.classList.add('active');

                currentName = '';
                if (nameInput) nameInput.value = '';
                window.currentTextX = 0;
                window.currentTextY = 0;

                saveDesign();

                if (window.showToast) window.showToast('Đã tải ảnh mới!', 'success');
            } catch (err) {
                console.error(err);
                if (window.showToast) window.showToast('Upload ảnh thất bại', 'error');
            }
        });
    }

    if (changeImageBtn) {
        changeImageBtn.addEventListener('click', () => fileInput?.click());
    }

    // Drag & drop upload area
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput?.click());

        uploadArea.addEventListener('dragover', (e) => e.preventDefault());
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (!file || !file.type.startsWith('image/')) return;

            try {
                const formData = new FormData();
                formData.append('image', file, file.name || 'design.png');

                const uploadRes = await fetch('/upload-image', {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrf },
                    body: formData
                });

                if (!uploadRes.ok) throw new Error('Upload thất bại');

                const uploadData = await uploadRes.json();
                const fullImageUrl = '/' + uploadData.path.replace(/^\/+/, '');

                await loadImageForEditor(fullImageUrl);

                if (uploadArea) uploadArea.style.display = 'none';
                if (imageContainer) imageContainer.style.display = 'block';
                if (changeImageBtn) changeImageBtn.classList.add('active');

                currentName = '';
                if (nameInput) nameInput.value = '';
                window.currentTextX = 0;
                window.currentTextY = 0;

                const url = new URL(window.location);
                url.searchParams.delete('name');
                window.history.replaceState({}, '', url);

                if (bg) bg.style.display = 'none';
                if (text) text.style.display = 'none';

                saveDesign();

                if (window.showToast) window.showToast('Đã tải ảnh mới!', 'success');
            } catch (err) {
                console.error(err);
                if (window.showToast) window.showToast('Upload ảnh thất bại', 'error');
            }
        });
    }

    // Format buttons
    if (btnBold) {
        btnBold.addEventListener('click', (e) => {
            e.stopPropagation();
            isBold = !isBold;
            btnBold.classList.toggle('active', isBold);
            updateName();
            saveDesign();
        });
    }

    if (btnItalic) {
        btnItalic.addEventListener('click', (e) => {
            e.stopPropagation();
            isItalic = !isItalic;
            btnItalic.classList.toggle('active', isItalic);
            updateName();
            saveDesign();
        });
    }

    if (btnUnderline) {
        btnUnderline.addEventListener('click', (e) => {
            e.stopPropagation();
            isUnderline = !isUnderline;
            btnUnderline.classList.toggle('active', isUnderline);
            updateName();
            saveDesign();
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                btnBold?.click();
            } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                btnItalic?.click();
            } else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                btnUnderline?.click();
            }
        }
    });

    // Config changes
    [fontFamily, fontSize].forEach(el => {
        if (el) el.addEventListener('change', () => { updateName(); saveDesign(); });
    });
    
    [textColor].forEach(el => {
        if (el) el.addEventListener('input', () => { updateName(); saveDesign(); });
    });

    if (bgColor) {
        bgColor.addEventListener('input', () => {
            hasSetupBg = true; // Đánh dấu đã tự chọn màu nền
            updateName();
            saveDesign();
        });
        bgColor.addEventListener('change', () => {
            hasSetupBg = true;
            updateName();
            saveDesign();
        });
    }

    if (strokeColor) {
        strokeColor.addEventListener('input', () => {
            hasSetupStroke = true; // Đánh dấu đã tự chọn màu viền
            updateName();
            saveDesign();
        });
        strokeColor.addEventListener('change', () => {
            hasSetupStroke = true;
            updateName();
            saveDesign();
        });
    }

    // Kéo thả patch
    let dragStartX = 0;
    let dragStartY = 0;
    
    if (bg) {
        bg.style.cursor = 'move';
        bg.style.pointerEvents = 'all';
        
        bg.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            
            const svgRect = svg.getBoundingClientRect();
            const imgWidth = baseImage.naturalWidth || baseImage.width;
            const imgHeight = baseImage.naturalHeight || baseImage.height;
            
            const scaleX = imgWidth / svgRect.width;
            const scaleY = imgHeight / svgRect.height;
            
            dragStartX = (e.clientX - svgRect.left) * scaleX - window.currentTextX;
            dragStartY = (e.clientY - svgRect.top) * scaleY - window.currentTextY;
            
            bg.style.cursor = 'grabbing';
        });
    }

    if (text) {
        text.style.cursor = 'move';
        text.style.pointerEvents = 'all';
        
        text.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            
            const svgRect = svg.getBoundingClientRect();
            const imgWidth = baseImage.naturalWidth || baseImage.width;
            const imgHeight = baseImage.naturalHeight || baseImage.height;
            
            const scaleX = imgWidth / svgRect.width;
            const scaleY = imgHeight / svgRect.height;
            
            dragStartX = (e.clientX - svgRect.left) * scaleX - window.currentTextX;
            dragStartY = (e.clientY - svgRect.top) * scaleY - window.currentTextY;
            
            text.style.cursor = 'grabbing';
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        e.preventDefault();
        
        const svgRect = svg.getBoundingClientRect();
        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const imgHeight = baseImage.naturalHeight || baseImage.height;
        
        const scaleX = imgWidth / svgRect.width;
        const scaleY = imgHeight / svgRect.height;
        
        window.currentTextX = (e.clientX - svgRect.left) * scaleX - dragStartX;
        window.currentTextY = (e.clientY - svgRect.top) * scaleY - dragStartY;
        
        window.currentTextX = Math.max(0, Math.min(imgWidth, window.currentTextX));
        window.currentTextY = Math.max(0, Math.min(imgHeight, window.currentTextY));
        
        updateName();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (bg) bg.style.cursor = 'move';
            if (text) text.style.cursor = 'move';
            saveDesign();
        }
    });

    function updateName() {
        if (!text || !bg || !baseImage) return;

        const hasText = currentName && currentName.trim() !== '';

        if (!hasText) {
            text.style.display = 'none';
            bg.style.display = 'none';
            return;
        }

        // Luôn hiện text khi có nội dung
        text.style.display = 'block';

        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const imgHeight = baseImage.naturalHeight || baseImage.height;

        if (imgWidth === 0 || imgHeight === 0) return;

        // Đặt vị trí center nếu chưa có
        if (window.currentTextX === 0 && window.currentTextY === 0) {
            window.currentTextX = imgWidth / 2;
            window.currentTextY = imgHeight / 2;
        }

        text.innerHTML = '';

        const currentFontSize = parseInt(fontSizeInput?.value || fontSize?.value || 80);

        text.setAttribute('font-size', currentFontSize);
        text.setAttribute('font-weight', isBold ? 'bold' : 'normal');
        text.setAttribute('font-style', isItalic ? 'italic' : 'normal');
        text.setAttribute('font-family', fontFamily.value);
        text.setAttribute('fill', textColor.value);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('y', window.currentTextY);

        const lines = currentName.split('\n');

        lines.forEach((line, i) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = line.toUpperCase();
            tspan.setAttribute('x', window.currentTextX);
            
            if (isUnderline) {
                tspan.setAttribute('text-decoration', 'underline');
            }
            
            if (i > 0) {
                tspan.setAttribute('dy', '1.15em');
            }
            
            text.appendChild(tspan);
        });

        if (hasSetupBg) {
            bg.style.display = 'block';

            // Tính kích thước patch dựa trên text
            requestAnimationFrame(() => {
                let box;
                try {
                    box = text.getBBox();
                } catch (e) {
                    return;
                }

                const scaleFactor = imgWidth / 11417;
                const scaledPaddingX = paddingX * scaleFactor;
                const scaledPaddingY = paddingY * scaleFactor;

                const patchWidth = box.width + scaledPaddingX * 2;
                const patchHeight = box.height + scaledPaddingY * 2;

                window.currentPatchWidth = patchWidth;
                window.currentPatchHeight = patchHeight;

                const patchX = window.currentTextX - patchWidth / 2;
                const patchY = window.currentTextY - patchHeight / 2;

                bg.setAttribute('x', patchX);
                bg.setAttribute('y', patchY);
                bg.setAttribute('width', patchWidth);
                bg.setAttribute('height', patchHeight);
                bg.setAttribute('fill', bgColor.value);

                // Viền chỉ hiện nếu người dùng đã tự chọn màu viền
                if (hasSetupStroke) {
                    bg.setAttribute('stroke', strokeColor.value);
                    bg.setAttribute('stroke-width', 12 * scaleFactor);
                } else {
                    bg.removeAttribute('stroke');
                    bg.removeAttribute('stroke-width');
                }
            });
        } else {
            // Chưa setup màu nền → ẩn hoàn toàn patch
            bg.style.display = 'none';
        }

        saveDesign();
    }
    // Inline edit
    let isEditingInline = false;

    if (text) {
        text.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isEditingInline) return;
            startInlineEdit();
        });
    }

    if (bg) {
        bg.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isEditingInline) return;
            startInlineEdit();
        });
    }

    function startInlineEdit() {
        isEditingInline = true;
        isDragging = false;
        
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('id', 'inlineEditFO');
        
        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const imgHeight = baseImage.naturalHeight || baseImage.height;
        
        fo.setAttribute('x', '0');
        fo.setAttribute('y', '0');
        fo.setAttribute('width', imgWidth);
        fo.setAttribute('height', imgHeight);
        
        const container = document.createElement('div');
        container.id = 'editContainer';
        container.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        `;
        
        const textarea = document.createElement('textarea');
        textarea.id = 'svgTextarea';
        
        const currentFontSize = parseInt(fontSize.value || 80);
        const patchX = parseFloat(bg.getAttribute('x') || 0);
        const patchY = parseFloat(bg.getAttribute('y') || 0);
        const patchWidth = parseFloat(bg.getAttribute('width') || 400);
        const patchHeight = parseFloat(bg.getAttribute('height') || 100);
        
        textarea.style.cssText = `
            position: absolute;
            left: ${patchX}px;
            top: ${patchY}px;
            width: ${patchWidth}px;
            min-height: ${patchHeight}px;
            background: transparent;
            border: 2px dashed rgba(0, 103, 184, 0.5);
            outline: none;
            color: ${textColor.value};
            font-family: ${fontFamily.value};
            font-size: ${currentFontSize}px;
            font-weight: ${isBold ? 'bold' : 'normal'};
            font-style: ${isItalic ? 'italic' : 'normal'};
            text-decoration: ${isUnderline ? 'underline' : 'none'};
            text-align: center;
            padding: 20px 40px;
            resize: none;
            overflow: hidden;
            text-transform: uppercase;
            line-height: 1.15;
            cursor: text;
            box-sizing: border-box;
            pointer-events: all;
        `;
        
        textarea.value = currentName;
        if (text) text.style.display = 'none';
        
        let updateTimeout = null;
        textarea.addEventListener('input', () => {
            currentName = textarea.value;
            if (nameInput) nameInput.value = currentName;
            
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                updatePatchSizeAndPosition(textarea);
            }, 50);
        });
        
        textarea.addEventListener('blur', () => {
            finishInlineEdit();
        });
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                finishInlineEdit();
            }
            if (e.key === 'Enter') {
                setTimeout(() => updatePatchSizeAndPosition(textarea), 10);
            }
        });
        
        container.appendChild(textarea);
        fo.appendChild(container);
        svg.appendChild(fo);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            updatePatchSizeAndPosition(textarea);
        }, 50);
    }

    function updatePatchSizeAndPosition(textarea) {
        if (!bg || !textarea) return;
        
        const currentFontSize = parseInt(fontSize.value || 80);
        const lineHeight = currentFontSize * 1.15;
        const lines = textarea.value.split('\n');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${isBold ? 'bold' : 'normal'} ${currentFontSize}px ${fontFamily.value}`;
        
        let maxWidth = currentFontSize * 3;
        lines.forEach(line => {
            if (line.trim() !== '') {
                const width = ctx.measureText(line.toUpperCase()).width;
                if (width > maxWidth) maxWidth = width;
            }
        });
        
        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const scaleFactor = imgWidth / 11417;
        const scaledPaddingX = 60 * scaleFactor;
        const scaledPaddingY = 30 * scaleFactor;
        
        const newPatchWidth = maxWidth + scaledPaddingX * 2;
        const newPatchHeight = Math.max(lines.length, 1) * lineHeight + scaledPaddingY * 2;
        
        window.currentPatchWidth = newPatchWidth;
        window.currentPatchHeight = newPatchHeight;
        
        const patchX = window.currentTextX - newPatchWidth / 2;
        const patchY = window.currentTextY - newPatchHeight / 2;
        
        bg.setAttribute('x', patchX);
        bg.setAttribute('y', patchY);
        bg.setAttribute('width', newPatchWidth);
        bg.setAttribute('height', newPatchHeight);
        
        textarea.style.left = patchX + 'px';
        textarea.style.top = patchY + 'px';
        textarea.style.width = newPatchWidth + 'px';
        textarea.style.minHeight = newPatchHeight + 'px';
        
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(newPatchHeight, textarea.scrollHeight) + 'px';
    }

    function finishInlineEdit() {
        if (!isEditingInline) return;
        
        isEditingInline = false;
        
        const fo = document.getElementById('inlineEditFO');
        if (fo) fo.remove();
        
        if (text) text.style.display = 'block';
        
        updateName();
        
        const url = new URL(window.location);
        if (currentName) {
            url.searchParams.set('name', currentName);
        } else {
            url.searchParams.delete('name');
        }
        window.history.replaceState({}, '', url);
        
        saveDesign();
    }

    // Panel
    const savedDesigns  = document.querySelector('.saved-designs');
    const leftPanel     = document.querySelector('.left-panel');
    const contentWrap   = document.getElementById('contentWrapper');
    const panelCloseBtn = document.getElementById('panelCloseBtn');

    const toolButtons = document.querySelectorAll('.tool-btn');
    const panels      = document.querySelectorAll('.panel-content');

    let currentPanelId = document.querySelector('.tool-btn.active')?.dataset.target || 'menuSaved';

    function openPanel(targetId) {
        if (!targetId) return;

        currentPanelId = targetId;

        savedDesigns.classList.remove('panel-closed');
        leftPanel.classList.remove('collapsed');
        contentWrap.classList.remove('panel-closed');

        toolButtons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.tool-btn[data-target="${targetId}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        panels.forEach(panel => {
            panel.classList.remove('active');
            panel.style.display = 'none';
        });
        
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            targetPanel.style.display = 'flex';
        }

        if (panelCloseBtn) {
            panelCloseBtn.innerHTML = "<i class='bx bx-left-arrow-alt'></i>";
            panelCloseBtn.classList.remove('closed');
        }
    }

    function closePanel() {
        savedDesigns.classList.add('panel-closed');
        leftPanel.classList.add('collapsed');
        contentWrap.classList.add('panel-closed');
        
        if (panelCloseBtn) {
            panelCloseBtn.innerHTML = "<i class='bx bx-right-arrow-alt'></i>";
            panelCloseBtn.classList.add('closed');
        }
    }

    function togglePanel() {
        const isClosed = savedDesigns.classList.contains('panel-closed');
        if (isClosed) {
            openPanel(currentPanelId);
        } else {
            closePanel();
        }
    }

    document.querySelector('.left-toolbar').addEventListener('click', (e) => {
        const toolBtn = e.target.closest('.tool-btn');
        if (toolBtn && !toolBtn.classList.contains('active')) {
            const target = toolBtn.dataset.target;
            if (target) openPanel(target);
        }
    });

    if (panelCloseBtn) {
        panelCloseBtn.addEventListener('click', togglePanel);
    }

    document.querySelectorAll('.left-panel input, .left-panel select, .left-panel textarea, .left-panel button')
        .forEach(el => {
            el.addEventListener('click', e => e.stopPropagation());
            el.addEventListener('mousedown', e => e.stopPropagation());
        });

    openPanel(currentPanelId);
    
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            closePanel();
        } else {
            openPanel(currentPanelId);
        }
    });
    
    if (window.innerWidth <= 768) {
        closePanel();
    }

const uploadFontBtn = document.getElementById('uploadFontBtn');
    const fontFileInput = document.getElementById('fontFileInput');
    const fontFamilySelect = document.getElementById('fontFamily');

    // Danh sách font custom đã lưu (từ localStorage)
    let customFonts = JSON.parse(localStorage.getItem('customFonts') || '[]');

    // Hàm thêm font vào document và select
    function addCustomFont(fontName, fontUrl, serverFileName) {
        console.log('Adding custom font:', { fontName, fontUrl, serverFileName });
        
        // Thêm @font-face động
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: '${fontName}';
                src: url('${fontUrl}') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
        `;
        document.head.appendChild(style);

        // Thêm vào select (nếu chưa có)
        if (!fontFamilySelect.querySelector(`option[value="'${fontName}', sans-serif"]`)) {
            const option = document.createElement('option');
            option.value = `'${fontName}', sans-serif`;
            option.textContent = fontName;
            option.dataset.serverFile = serverFileName; // ĐÂY LÀ QUAN TRỌNG
            fontFamilySelect.appendChild(option);
            console.log('Added option with serverFile:', option.dataset.serverFile);
        }
    }

    // Load tất cả font custom từ localStorage khi trang load
    if (customFonts.length > 0) {
        customFonts.forEach(font => {
            addCustomFont(font.name, font.url, font.serverFileName);
        });
    }

    // Xử lý nút tải lên
    if (uploadFontBtn && fontFileInput) {
        uploadFontBtn.addEventListener('click', () => {
            fontFileInput.click();
        });

        fontFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Kiểm tra định dạng
            const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
            const fileName = file.name.toLowerCase();
            const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
            
            if (!hasValidExt) {
                showToast('Chỉ chấp nhận file .ttf, .otf, .woff, .woff2', 'error');
                fontFileInput.value = '';
                return;
            }

            try {
                showToast('Đang tải lên font...', 'info');
                
                // Upload lên server
                const formData = new FormData();
                formData.append('font', file);

                const uploadRes = await fetch('/upload-font', {
                    method: 'POST',
                    headers: { 
                        'X-CSRF-TOKEN': csrf,
                        'Accept': 'application/json' // Quan trọng!
                    },
                    body: formData
                });

                // Kiểm tra response type
                const contentType = uploadRes.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await uploadRes.text();
                    console.error('Server response:', text);
                    throw new Error('Server không trả về JSON. Kiểm tra route /upload-font');
                }

                const data = await uploadRes.json();
                
                if (!uploadRes.ok) {
                    throw new Error(data.message || 'Upload thất bại');
                }

                if (!data.success) {
                    throw new Error(data.message || 'Upload không thành công');
                }

                const fontName = data.name.replace(/\.[^/.]+$/, ""); // Tên font không đuôi
                const fontUrl = data.url; // URL công khai: /storage/fonts/abc.ttf
                const serverFileName = data.serverFileName; // Tên file trên server

                // Lưu vào localStorage
                customFonts.push({
                    name: fontName,
                    url: fontUrl,
                    serverFileName: serverFileName
                });
                localStorage.setItem('customFonts', JSON.stringify(customFonts));

                // Thêm font vào UI
                addCustomFont(fontName, fontUrl, serverFileName);

                // Tự động chọn font mới
                fontFamilySelect.value = `'${fontName}', sans-serif`;
                updateName();
                saveDesign();

                showToast('Đã tải lên phông chữ thành công!', 'success');

            } catch (err) {
                console.error('Upload font error:', err);
                showToast(err.message || 'Tải lên phông chữ thất bại', 'error');
            } finally {
                fontFileInput.value = ''; // Reset input
            }
        });
    }
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

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    };

    if (toastClose) toastClose.addEventListener('click', () => toast.classList.remove('show'));

    // Confirm modal
    const confirmModal = document.getElementById('confirmModal');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmDelete = document.getElementById('confirmDelete');

    let deleteCallback = null;

    window.showConfirm = function (message, onConfirm) {
        if (!confirmModal) return;

        const msgEl = confirmModal.querySelector('p');
        if (msgEl) msgEl.textContent = message;

        confirmModal.classList.remove('hidden');
        deleteCallback = onConfirm;
    };

    function hideConfirm() {
        confirmModal?.classList.add('hidden');
        deleteCallback = null;
    }

    if (confirmCancel) confirmCancel.addEventListener('click', hideConfirm);
    if (confirmDelete) confirmDelete.addEventListener('click', () => {
        if (typeof deleteCallback === 'function') deleteCallback();
        hideConfirm();
    });

    if (confirmModal) confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) hideConfirm();
    });

    // Khởi tạo
    localStorage.removeItem('currentDesign');
    loadSavedDesign();
    
    setTimeout(() => {
        if (svg && baseImage && baseImage.src) {
            updateSVGViewBox();
            setTimeout(() => updateName(), 100);
        }
    }, 100);

    // Expose functions cho export.js
    window.updateName = updateName;
    window.updateSVGViewBox = updateSVGViewBox;
    window.loadSavedDesign = loadSavedDesign;
    window.resetToUploadGrid = function() {
        if (uploadArea) uploadArea.style.display = 'flex';
        if (imageContainer) imageContainer.style.display = 'none';
        if (changeImageBtn) changeImageBtn.classList.remove('active');
        baseImage.src = '';
        if (bg) bg.style.display = 'none';
        if (text) text.style.display = 'none';
        currentName = '';
        if (nameInput) nameInput.value = '';
        const url = new URL(window.location);
        url.searchParams.delete('name');
        window.history.replaceState({}, '', url);
        localStorage.removeItem('currentDesign');
    };
    
    // Lấy config để xuất
    window.getExportConfig = function() {
        const fontFamilySelect = document.getElementById('fontFamily');
        const fontSizeInput = document.getElementById('fontSizeInput');
        const fontSize = document.getElementById('fontSize');
        const textColor = document.getElementById('textColor');
        const bgColor = document.getElementById('bgColor');
        const strokeColor = document.getElementById('strokeColor');
        
        const currentFontSize = parseInt(fontSizeInput?.value || fontSize?.value || 80);
        
        // Lấy customFontFile từ option đã chọn
        const selectedOption = fontFamilySelect?.options[fontFamilySelect.selectedIndex];
        const customFontFile = selectedOption?.dataset?.serverFile || null;
        
        console.log('=== getExportConfig DEBUG ===');
        console.log('Selected option:', selectedOption);
        console.log('dataset:', selectedOption?.dataset);
        console.log('serverFile:', selectedOption?.dataset?.serverFile);
        console.log('customFontFile:', customFontFile);
        
        const config = {
            text: currentName,
            x: window.currentTextX,
            y: window.currentTextY,
            patchWidth: window.currentPatchWidth,
            patchHeight: window.currentPatchHeight,
            fontFamily: fontFamilySelect.value,
            fontSize: currentFontSize,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            textDecoration: isUnderline ? 'underline' : 'none',
            textColor: textColor.value,
            bgColor: bgColor.value,
            strokeColor: strokeColor.value,
            customFontFile: customFontFile 
        };
        
        console.log('=== FINAL CONFIG ===');
        console.log(JSON.stringify(config, null, 2));
        
        return config;
    };

    window.updateBoldState = (value) => isBold = value;
    window.updateItalicState = (value) => isItalic = value;
    window.updateUnderlineState = (value) => isUnderline = value;

    window.startInlineTextEdit = startInlineEdit;
    window.finishInlineTextEdit = finishInlineEdit;
});