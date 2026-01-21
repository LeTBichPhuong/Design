document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    let currentName = '';

    const nameInput = document.getElementById('nameInput');
    const baseImage = document.getElementById('baseImage');
    const togglePatchCheckbox = document.getElementById('togglePatchCheckbox');
    const cornerRadiusSlider = document.getElementById('cornerRadiusSlider');
    const cornerRadiusInput = document.getElementById('cornerRadiusInput');

    let hasSetupBg = false;     // Người dùng đã chọn màu nền chưa
    let hasSetupStroke = false; // Người dùng đã chọn màu viền chưa
    // Biến lưu corner radius
    let currentCornerRadius = 25;   
    let currentPaddingX = 60;
    let currentPaddingY = 30; 
    
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
    let patchRotation = 0;
    let isManualResizedPatch = false;

    // Drag & drop
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
            
            // Không có saved design → Hiện lưới upload
            if (!saved) {
                console.log('No saved design - showing upload grid');
                hasSetupBg = false;
                hasSetupStroke = false;
                
                if (uploadArea) uploadArea.style.display = 'flex';
                if (imageContainer) imageContainer.style.display = 'none';
                if (changeImageBtn) changeImageBtn.classList.remove('active');
                
                return;
            }
            
            const design = JSON.parse(saved);
            
            // Saved design không có ảnh → Xóa & hiện lưới upload
            if (!design.imageDataUrl || design.imageDataUrl === '') {
                console.log('Saved design has no image - showing upload grid');
                hasSetupBg = false;
                hasSetupStroke = false;
                
                if (uploadArea) uploadArea.style.display = 'flex';
                if (imageContainer) imageContainer.style.display = 'none';
                if (changeImageBtn) changeImageBtn.classList.remove('active');
                
                localStorage.removeItem('currentDesign');
                return;
            }
            
            // kiểm tra thêm điều kiện: nếu không có name param & không phải đang edit design có sẵn → xóa localStorage
            const hasNameParam = new URLSearchParams(window.location.search).has('name');
            const isEditingExistingDesign = window.currentDesignId !== null && window.currentDesignId !== undefined;
            
            if (!hasNameParam && !isEditingExistingDesign) {
                console.log('Fresh page load without active design - clearing localStorage & showing upload grid');
                
                hasSetupBg = false;
                hasSetupStroke = false;
                
                if (uploadArea) uploadArea.style.display = 'flex';
                if (imageContainer) imageContainer.style.display = 'none';
                if (changeImageBtn) changeImageBtn.classList.remove('active');
                
                // Xóa localStorage để bắt đầu mới
                localStorage.removeItem('currentDesign');
                return;
            }
            
            // nếu đến đây thì load design bình thường
            console.log('Loading saved design with image', {
                hasNameParam: hasNameParam,
                currentDesignId: window.currentDesignId
            });
            
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

            hasSetupBg = design.hasPatch === true;
            hasSetupStroke = design.hasPatch === true && !!design.strokeColor;
            
            console.log('Loaded design:', {
                hasPatch: design.hasPatch,
                hasSetupBg: hasSetupBg,
                hasSetupStroke: hasSetupStroke
            });

            // Hiển thị ảnh
            if (design.imageDataUrl) {
                baseImage.src = design.imageDataUrl;
                baseImage.onload = () => {
                    updateSVGViewBox();
                    
                    // Khôi phục rotation
                    if (design.patchRotation !== undefined) {
                        patchRotation = design.patchRotation;
                        console.log('Loaded rotation from design:', patchRotation);
                    }
                    
                    if (design.isManualResizedPatch !== undefined) {
                        isManualResizedPatch = design.isManualResizedPatch;
                    }
                    
                    setTimeout(() => {
                        updateName();

                        // Khôi phục trạng thái element
                        if (text && bg) {
                            saveElementState(text, bg); // Lưu rotation vào element
                            applyPatchRotation();
                        }
                    }, 100);
                };
                
                // Ẩn lưới upload
                if (uploadArea) uploadArea.style.display = 'none';
                if (imageContainer) imageContainer.style.display = 'block';
                if (changeImageBtn) changeImageBtn.classList.add('active');
            }
            
        } catch (e) {
            console.error('Error loading saved design:', e);
            
            // Nếu có lỗi → hiển thị lưới upload
            hasSetupBg = false;
            hasSetupStroke = false;
            
            if (uploadArea) uploadArea.style.display = 'flex';
            if (imageContainer) imageContainer.style.display = 'none';
            if (changeImageBtn) changeImageBtn.classList.remove('active');
            
            // Xóa localStorage bị lỗi
            localStorage.removeItem('currentDesign');
        }
    }

    // Gọi load saved design
    function saveElementState(textElement, bgElement) {
        if (!textElement) return;
        
        textElement.dataset.rotation = patchRotation;
        textElement.dataset.centerX = window.currentTextX;
        textElement.dataset.centerY = window.currentTextY;
        textElement.dataset.patchWidth = window.currentPatchWidth;
        textElement.dataset.patchHeight = window.currentPatchHeight;
        textElement.dataset.manualResized = isManualResizedPatch;
        textElement.dataset.bold = isBold;
        textElement.dataset.italic = isItalic;
        textElement.dataset.underline = isUnderline;
        
        if (bgElement) {
            bgElement.dataset.rotation = patchRotation;
            bgElement.dataset.centerX = window.currentTextX;
            bgElement.dataset.centerY = window.currentTextY;
        }
        
        console.log('Saved state for element:', {
            rotation: patchRotation,
            x: window.currentTextX,
            y: window.currentTextY
        });
    }

    // Load state từ element
    function loadElementState(textElement, bgElement) {
        if (!textElement) return;
        // Lấy rotation từ data-attribute
        try {
            const saved = localStorage.getItem('currentDesign');
            if (saved) {
                const design = JSON.parse(saved);
                if (design.patchRotation !== undefined) {
                    patchRotation = design.patchRotation;
                    console.log('Loaded rotation from localStorage:', patchRotation);
                }
            }
        } catch (e) {
            console.log('No saved rotation in localStorage');
        }
        
        // Nếu chưa có rotation từ localStorage thì lấy từ dataset
        if (patchRotation === 0 && textElement.dataset.rotation) {
            patchRotation = parseFloat(textElement.dataset.rotation || 0);
            console.log('Loaded rotation from dataset:', patchRotation);
        }
        
        window.currentTextX = parseFloat(textElement.dataset.centerX || 0);
        window.currentTextY = parseFloat(textElement.dataset.centerY || 0);
        window.currentPatchWidth = parseFloat(textElement.dataset.patchWidth || 400);
        window.currentPatchHeight = parseFloat(textElement.dataset.patchHeight || 100);
        isManualResizedPatch = textElement.dataset.manualResized === 'true';
        isBold = textElement.dataset.bold === 'true';
        isItalic = textElement.dataset.italic === 'true';
        isUnderline = textElement.dataset.underline === 'true';
    }

    // Gọi load saved design
    function saveDesign() {
        try {
            const fontFamilySelect = document.getElementById('fontFamily');
            const selectedOption = fontFamilySelect?.options[fontFamilySelect.selectedIndex];
            const customFontFile = selectedOption?.dataset?.serverFile || null;
            
            const design = {
                name: currentName,
                textX: window.currentTextX,
                textY: window.currentTextY,
                patchWidth: window.currentPatchWidth,
                patchHeight: window.currentPatchHeight,
                patchRotation: patchRotation || 0, // ✅ ĐÃ LƯU
                isManualResizedPatch: isManualResizedPatch || false,
                patchCornerRadius: currentCornerRadius || 25,
                
                paddingX: currentPaddingX || 60,
                paddingY: currentPaddingY || 30,
                
                hasPatch: hasSetupBg,
                
                fontFamily: fontFamily?.value || 'Arial, sans-serif',
                fontSize: parseInt(fontSizeInput?.value || fontSize?.value || 80),
                textColor: textColor?.value || '#dec27a',
                bgColor: bgColor?.value || '#565559',
                strokeColor: strokeColor?.value || '#dec27a',
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                isBold, 
                isItalic, 
                isUnderline,
                imageDataUrl: baseImage?.src || '',
                customFontFile: customFontFile
            };
            
            localStorage.setItem('currentDesign', JSON.stringify(design));
            console.log('Saved design - rotation:', patchRotation, design); // ✅ KIỂM TRA
            
            if (text && bg) {
                saveElementState(text, bg);
            }
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
            patchRotation = 0;
            if (fontSizeInput) fontSizeInput.value = '80';
            if (fontFamily) fontFamily.value = 'Arial, sans-serif';
            if (textColor) textColor.value = '#dec27a';
            if (bgColor) bgColor.value = '#565559';
            if (strokeColor) strokeColor.value = '#dec27a';

            isBold = isItalic = isUnderline = false;
            if (btnBold) btnBold.classList.remove('active');
            if (btnItalic) btnItalic.classList.remove('active');
            if (btnUnderline) btnUnderline.classList.remove('active');

            // reset trạng thái patch
            hasSetupBg = false;
            hasSetupStroke = false;
            console.log('New design created - hasSetupBg reset to:', hasSetupBg);

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

    // Gọi load saved design
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

    // Change image button
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

    // Load patch state
    function loadPatchState() {
        try {
            const saved = localStorage.getItem('currentDesign');
            if (saved) {
                const design = JSON.parse(saved);
                
                // Load hasSetupBg
                const hasPatch = design.hasPatch === true;
                hasSetupBg = hasPatch;
                
                if (togglePatchCheckbox) {
                    togglePatchCheckbox.checked = hasPatch;
                }
                
                // Load corner radius
                if (design.patchCornerRadius !== undefined) {
                    currentCornerRadius = design.patchCornerRadius;
                    window.currentPatchCornerRadius = currentCornerRadius;
                    
                    if (cornerRadiusInput) cornerRadiusInput.value = currentCornerRadius;
                    if (cornerRadiusSlider) cornerRadiusSlider.value = currentCornerRadius;
                }
                
                console.log(' Loaded patch state:', {
                    hasPatch: hasPatch,
                    cornerRadius: currentCornerRadius
                });
            }
        } catch (e) {
            console.error('Error loading patch state:', e);
        }
    }

    // Gọi load patch state
    window.setHasSetupBg = function(value) {
        hasSetupBg = !!value;
        
        if (togglePatchCheckbox) {
            togglePatchCheckbox.checked = hasSetupBg;
        }
        
        console.log('Set hasSetupBg:', hasSetupBg);
    };
        
    // Gọi load patch state
    window.setPatchCornerRadius = function(value) {
        currentCornerRadius = value;
        window.currentPatchCornerRadius = value;
        
        if (cornerRadiusInput) cornerRadiusInput.value = value;
        if (cornerRadiusSlider) cornerRadiusSlider.value = value;
        
        updateName();
    };
    
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
            console.log('User selected by color - hasSetupBg:', hasSetupBg);
            updateName();
            saveDesign();
        });
        bgColor.addEventListener('change', () => {
            hasSetupBg = true;
            console.log('User selected by color - hasSetupBg:', hasSetupBg);
            updateName();
            saveDesign();
        });
    }

    if (strokeColor) {
        strokeColor.addEventListener('input', () => {
            hasSetupStroke = true;  // Đánh dấu đã tự chọn màu viền
            console.log('User selected stroke color - hasSetupStroke:', hasSetupStroke);
            updateName();
            saveDesign();
        });
        strokeColor.addEventListener('change', () => {
            hasSetupStroke = true;
            console.log('User selected stroke color - hasSetupStroke:', hasSetupStroke);
            updateName();
            saveDesign();
        });
    }

    // Toggle patch
    if (togglePatchCheckbox) {
        togglePatchCheckbox.addEventListener('change', () => {
            const isChecked = togglePatchCheckbox.checked;
            
            // bật/tắt patch
            hasSetupBg = isChecked;
            
            // Nếu bật → auto bật stroke
            if (isChecked) {
                hasSetupStroke = true;
            } else {
                hasSetupStroke = false;
            }
            
            console.log('Patch toggled:', {
                isChecked: isChecked,
                hasSetupBg: hasSetupBg,
                hasSetupStroke: hasSetupStroke
            });
            
            // Update để ẩn/hiện patch
            updateName();
            saveDesign();
            
            if (window.showToast) {
                window.showToast(
                    isChecked ? 'Đã bật patch nền' : 'Đã tắt patch nền', 
                    'success'
                );
            }
        });
    }
        
    // Corner radius sync
    if (cornerRadiusSlider && cornerRadiusInput) {
        // Sync slider → input
        cornerRadiusSlider.addEventListener('input', () => {
            const value = parseInt(cornerRadiusSlider.value);
            cornerRadiusInput.value = value;
            currentCornerRadius = value;
            window.currentPatchCornerRadius = value;
            
            updateName();
        });
        
        // Sync input → slider
        cornerRadiusInput.addEventListener('input', () => {
            let value = parseInt(cornerRadiusInput.value);
            if (isNaN(value)) value = 25;
            if (value < 0) value = 0;
            if (value > 200) value = 200;
            
            cornerRadiusSlider.value = value;
            currentCornerRadius = value;
            window.currentPatchCornerRadius = value;
            
            updateName();
        });
        
        // Save on blur
        cornerRadiusInput.addEventListener('blur', () => {
            let value = parseInt(cornerRadiusInput.value);
            if (isNaN(value) || value < 0) value = 0;
            if (value > 200) value = 200;
            
            cornerRadiusInput.value = value;
            cornerRadiusSlider.value = value;
            currentCornerRadius = value;
            window.currentPatchCornerRadius = value;
            
            saveDesign();
        });
    }

    // Padding sync
    const paddingXSlider = document.getElementById('paddingXSlider');
    const paddingXInput = document.getElementById('paddingXInput');
    const paddingYSlider = document.getElementById('paddingYSlider');
    const paddingYInput = document.getElementById('paddingYInput');

    // Padding X sync
    if (paddingXSlider && paddingXInput) {
        paddingXSlider.addEventListener('input', () => {
            const value = parseInt(paddingXSlider.value);
            paddingXInput.value = value;
            currentPaddingX = value;
            window.currentPaddingX = value;
            isManualResizedPatch = false;
            updateName();
        });
        
        paddingXInput.addEventListener('input', () => {
            let value = parseInt(paddingXInput.value);
            if (isNaN(value)) value = 60;
            if (value < 0) value = 0;
            if (value > 200) value = 200;
            
            paddingXSlider.value = value;
            currentPaddingX = value;
            window.currentPaddingX = value;
            updateName();
        });
        
        paddingXInput.addEventListener('blur', () => {
            let value = parseInt(paddingXInput.value);
            if (isNaN(value) || value < 0) value = 0;
            if (value > 200) value = 200;
            
            paddingXInput.value = value;
            paddingXSlider.value = value;
            currentPaddingX = value;
            window.currentPaddingX = value;
            saveDesign();
        });
    }

    // Padding Y sync
    if (paddingYSlider && paddingYInput) {
        paddingYSlider.addEventListener('input', () => {
            const value = parseInt(paddingYSlider.value);
            paddingYInput.value = value;
            currentPaddingY = value;
            window.currentPaddingY = value;
            isManualResizedPatch = false;
            updateName();
        });
        
        paddingYInput.addEventListener('input', () => {
            let value = parseInt(paddingYInput.value);
            if (isNaN(value)) value = 30;
            if (value < 0) value = 0;
            if (value > 200) value = 200;
            
            paddingYSlider.value = value;
            currentPaddingY = value;
            window.currentPaddingY = value;
            updateName();
        });
        
        paddingYInput.addEventListener('blur', () => {
            let value = parseInt(paddingYInput.value);
            if (isNaN(value) || value < 0) value = 0;
            if (value > 200) value = 200;
            
            paddingYInput.value = value;
            paddingYSlider.value = value;
            currentPaddingY = value;
            window.currentPaddingY = value;
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

    // Mouse move
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

    function calculateMultiLinePatchSize(lines, fontSize, fontFamily, isBold, isItalic, scaleFactor) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const fontWeight = isBold ? 'bold' : 'normal';
        const fontStyle = isItalic ? 'italic' : 'normal';
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        
        let maxLineWidth = 0;
        let maxLineHeight = 0;
        
        lines.forEach((line, index) => {
            if (line.trim() !== '') {
                const metrics = ctx.measureText(line.toUpperCase());
                const lineWidth = metrics.width;
                maxLineWidth = Math.max(maxLineWidth, lineWidth);
                
                if (index === 0 || maxLineHeight === 0) {
                    const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                    if (actualHeight > 0) {
                        maxLineHeight = actualHeight;
                    }
                }
            }
        });
        
        if (maxLineHeight === 0) {
            maxLineHeight = fontSize;
        }
        
        const lineHeight = fontSize * 1.15;
        const totalLines = lines.length;
        const textBlockHeight = (totalLines > 1) 
            ? ((totalLines - 1) * lineHeight + maxLineHeight)
            : maxLineHeight;
        
        //  Áp dụng padding
        const paddingX = window.currentPaddingX || currentPaddingX || 60;
        const paddingY = window.currentPaddingY || currentPaddingY || 30;
        
        const scaledPaddingX = paddingX * scaleFactor;
        const scaledPaddingY = paddingY * scaleFactor;
        
        return {
            width: maxLineWidth + scaledPaddingX * 2,
            height: textBlockHeight + scaledPaddingY * 2,
            textWidth: maxLineWidth,
            textHeight: textBlockHeight,
            lineCount: totalLines
        };
    }

    // Cập nhật tên hiển thị
    function updateName() {
        if (!text || !bg || !baseImage) return;

        const hasText = currentName && currentName.trim() !== '';

        if (!hasText) {
            text.style.display = 'none';
            bg.style.display = 'none';
            return;
        }

        text.style.display = 'block';

        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const imgHeight = baseImage.naturalHeight || baseImage.height;

        if (imgWidth === 0 || imgHeight === 0) return;

        if (window.currentTextX === 0 && window.currentTextY === 0) {
            window.currentTextX = imgWidth / 2;
            window.currentTextY = imgHeight / 2;
        }

        text.innerHTML = '';

        const currentFontSize = parseInt(fontSizeInput?.value || fontSize?.value || 80);
        const centerX = window.currentTextX;
        const centerY = window.currentTextY;

        // Cấu hình text element
        text.setAttribute('font-size', currentFontSize);
        text.setAttribute('font-weight', isBold ? 'bold' : 'normal');
        text.setAttribute('font-style', isItalic ? 'italic' : 'normal');
        text.setAttribute('font-family', fontFamily?.value || 'Arial, sans-serif');
        text.setAttribute('fill', textColor?.value || '#dec27a');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');

        if (!isManualResizedPatch && window.currentPatchWidth > 0) {
            const scaleFactor = imgWidth / 11417;
            const paddingX = (window.currentPaddingX || currentPaddingX || 60) * scaleFactor;
            const availableWidth = window.currentPatchWidth - (paddingX * 2);
            
            // Nếu text hiện tại quá rộng, tự động wrap
            const unwrapped = unwrapText(currentName);
            const unwrappedWidth = measureTextWidth(unwrapped, currentFontSize, fontFamily?.value || 'Arial', isBold, isItalic);
            
            if (unwrappedWidth > availableWidth) {
                const wrappedText = autoWrapText(
                    unwrapped,
                    availableWidth,
                    currentFontSize,
                    fontFamily?.value || 'Arial, sans-serif',
                    isBold,
                    isItalic
                );
                
                if (wrappedText !== currentName) {
                    currentName = wrappedText;
                    if (nameInput) nameInput.value = wrappedText;
                }
            }
        }

        const lines = currentName.split('\n');
        const lineHeight = currentFontSize * 1.15;
        const totalLines = lines.length;

        // Measure maxLineHeight
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontWeight = isBold ? 'bold' : 'normal';
        const fontStyle = isItalic ? 'italic' : 'normal';
        ctx.font = `${fontStyle} ${fontWeight} ${currentFontSize}px ${fontFamily?.value || 'Arial'}`;
        
        let maxLineHeight = 0;
        lines.forEach((line, index) => {
            if (line.trim() !== '') {
                const metrics = ctx.measureText(line.toUpperCase());
                const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                if (actualHeight > 0 && (index === 0 || maxLineHeight === 0)) {
                    maxLineHeight = actualHeight;
                }
            }
        });
        
        if (maxLineHeight === 0) {
            maxLineHeight = currentFontSize;
        }

        // Tính tổng chiều cao text
        const totalTextHeight = (totalLines > 1) 
            ? ((totalLines - 1) * lineHeight + maxLineHeight)
            : maxLineHeight;

        // Tọa độ Y của dòng đầu tiên
        const firstLineY = centerY - totalTextHeight / 2 + maxLineHeight / 2;

        lines.forEach((line, i) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = line.toUpperCase();
            tspan.setAttribute('x', centerX);
            
            if (i === 0) {
                // Dòng đầu: set Y
                tspan.setAttribute('y', firstLineY);
            } else {
                // Các dòng sau: dùng dy
                tspan.setAttribute('dy', lineHeight);
            }
            
            if (isUnderline) {
                tspan.setAttribute('text-decoration', 'underline');
            }
            
            text.appendChild(tspan);
        });

        if (hasSetupBg && bg) {
            bg.style.display = 'block';

            requestAnimationFrame(() => {
                const scaleFactor = imgWidth / 11417;
                const baseCornerRadius = window.currentPatchCornerRadius || currentCornerRadius || 25;
                const scaledCornerRadius = baseCornerRadius * scaleFactor;

                let patchWidth, patchHeight;
                
                // tính toán kích thước patch
                const patchSize = calculateMultiLinePatchSize(
                    lines,
                    currentFontSize,
                    fontFamily?.value || 'Arial, sans-serif',
                    isBold,
                    isItalic,
                    scaleFactor
                );
                
                if (isManualResizedPatch && window.currentPatchWidth > 0 && window.currentPatchHeight > 0) {
                    // Manual size
                    patchWidth = Math.max(window.currentPatchWidth, patchSize.width);
                    patchHeight = Math.max(window.currentPatchHeight, patchSize.height);
                    
                    // Update lại biến global
                    window.currentPatchWidth = patchWidth;
                    window.currentPatchHeight = patchHeight;
                } else {
                    // Auto size
                    patchWidth = patchSize.width;
                    patchHeight = patchSize.height;
                    
                    window.currentPatchWidth = patchWidth;
                    window.currentPatchHeight = patchHeight;
                }

                // centerX/Y - width/height / 2
                const patchX = centerX - patchWidth / 2;
                const patchY = centerY - patchHeight / 2;

                bg.setAttribute('x', patchX);
                bg.setAttribute('y', patchY);
                bg.setAttribute('width', patchWidth);
                bg.setAttribute('height', patchHeight);
                bg.setAttribute('fill', bgColor?.value || '#565559');
                bg.setAttribute('rx', scaledCornerRadius);
                bg.setAttribute('ry', scaledCornerRadius);

                if (hasSetupStroke) {
                    bg.setAttribute('stroke', strokeColor?.value || '#dec27a');
                    bg.setAttribute('stroke-width', 12 * scaleFactor);
                } else {
                    bg.removeAttribute('stroke');
                    bg.removeAttribute('stroke-width');
                }
                
                if (typeof applyPatchRotation === 'function') applyPatchRotation();
            });
        } else {
            bg.style.display = 'none';
        }

        if (typeof saveDesign === 'function') saveDesign();
    }

    // Hàm cập nhật tên hiển thị ra bên ngoài
    window.updateName = updateName;
        
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

    // Cập nhật kích thước và vị trí patch khi chỉnh sửa inline
    function updatePatchSizeAndPosition(textarea) {
        if (!bg || !textarea) return;
        
        
        const currentFontSize = parseInt(fontSize.value || 80);
        const lines = textarea.value.split('\n');
        
        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const scaleFactor = imgWidth / 11417;
        
        // sử dụng hàm tính kích thước patch
        const patchSize = calculateMultiLinePatchSize(
            lines,
            currentFontSize,
            fontFamily.value,
            isBold,
            isItalic,
            scaleFactor
        );
    
        const newPatchWidth = patchSize.width;
        const newPatchHeight = patchSize.height;
        
        window.currentPatchWidth = newPatchWidth;
        window.currentPatchHeight = newPatchHeight;
        
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

    // Kết thúc chỉnh sửa inline
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

    // Mở panel
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

    // Đóng panel
    function closePanel() {
        savedDesigns.classList.add('panel-closed');
        leftPanel.classList.add('collapsed');
        contentWrap.classList.add('panel-closed');
        
        if (panelCloseBtn) {
            panelCloseBtn.innerHTML = "<i class='bx bx-right-arrow-alt'></i>";
            panelCloseBtn.classList.add('closed');
        }
    }

    // Chuyển đổi trạng thái panel
    function togglePanel() {
        const isClosed = savedDesigns.classList.contains('panel-closed');
        if (isClosed) {
            openPanel(currentPanelId);
        } else {
            closePanel();
        }
    }

    // Xử lý click trên toolbar
    document.querySelector('.left-toolbar').addEventListener('click', (e) => {
        const toolBtn = e.target.closest('.tool-btn');
        if (toolBtn && !toolBtn.classList.contains('active')) {
            const target = toolBtn.dataset.target;
            if (target) openPanel(target);
        }
    });

    // Xử lý nút đóng panel
    if (panelCloseBtn) {
        panelCloseBtn.addEventListener('click', togglePanel);
    }

    // Ngăn không cho click vào form bên trong panel đóng panel
    document.querySelectorAll('.left-panel input, .left-panel select, .left-panel textarea, .left-panel button')
        .forEach(el => {
            el.addEventListener('click', e => e.stopPropagation());
            el.addEventListener('mousedown', e => e.stopPropagation());
        });

        // Mở panel ban đầu
        openPanel(currentPanelId);
        
        // Đóng panel
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                closePanel();
            } else {
                openPanel(currentPanelId);
            }
        });
        
        // Mở/đóng panel theo kích thước ban đầu
        if (window.innerWidth <= 768) {
            closePanel();
        }

        // Upload font custom
        const uploadFontBtn = document.getElementById('uploadFontBtn');
        const fontFileInput = document.getElementById('fontFileInput');
        const fontFamilySelect = document.getElementById('fontFamily');

        // Danh sách font custom đã lưu (từ localStorage)
        let customFonts = JSON.parse(localStorage.getItem('customFonts') || '[]');

        // Hàm thêm font vào document và select
        function addCustomFont(fontName, fontUrl, serverFileName) {
            
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
                option.dataset.serverFile = serverFileName;
                fontFamilySelect.appendChild(option);
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
                            'Accept': 'application/json'    
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

                    const fontName = data.name.replace(/\.[^/.]+$/, "");
                    const fontUrl = data.url;
                    const serverFileName = data.serverFileName;

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
                    fontFileInput.value = '';
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
        loadPatchState();
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
        
        // Lấy config để export
        window.getExportConfig = function() {
            const fontFamilySelect = document.getElementById('fontFamily');
            const fontSizeInput = document.getElementById('fontSizeInput');
            const fontSize = document.getElementById('fontSize');
            const textColor = document.getElementById('textColor');
            const bgColor = document.getElementById('bgColor');
            const strokeColor = document.getElementById('strokeColor');
            
            const currentFontSize = parseInt(fontSizeInput?.value || fontSize?.value || 80);
            
            const selectedOption = fontFamilySelect?.options[fontFamilySelect.selectedIndex];
            const customFontFile = selectedOption?.dataset?.serverFile || null;
            
            let fontFamilyValue = fontFamilySelect?.value || 'Arial, sans-serif';
            if (customFontFile) {
                fontFamilyValue = fontFamilyValue.replace(/, sans-serif|, serif|, monospace/g, '').replace(/['"]/g, '');
            }
            
            // lấy corner radius hiện tại từ bg
            const currentCornerRadius = parseFloat(bg?.getAttribute('rx') || 25);
            
            // tính corner radius gốc dựa trên kích thước ảnh
            const imgWidth = baseImage?.naturalWidth || baseImage?.width || 11417;
            const scaleFactor = imgWidth / 11417;
            const baseCornerRadius = currentCornerRadius / scaleFactor;
            
            //  tính kích thước patch cuối cùng
            let finalPatchWidth = 0;
            let finalPatchHeight = 0;
            
            if (hasSetupBg && bg && bg.style.display !== 'none') {
                // Patch đang hiển thị - lấy size thực tế
                finalPatchWidth = parseFloat(bg.getAttribute('width') || 0);
                finalPatchHeight = parseFloat(bg.getAttribute('height') || 0);
            } else if (currentName && currentName.trim() !== '') {
                // Không có patch nhưng có text - tính size theo text
                const lines = currentName.split('\n');
                const patchSize = calculateMultiLinePatchSize(
                    lines,
                    currentFontSize,
                    fontFamily?.value || 'Arial, sans-serif',
                    isBold,
                    isItalic,
                    scaleFactor
                );
                
                finalPatchWidth = patchSize.width;
                finalPatchHeight = patchSize.height;
            }
            
            console.log('Export Config - Patch Size:', {
                hasSetupBg: hasSetupBg,
                bgDisplay: bg?.style.display,
                finalPatchWidth: finalPatchWidth,
                finalPatchHeight: finalPatchHeight,
                cornerRadius: baseCornerRadius
            });
            
            const config = {
                text: currentName,
                x: window.currentTextX,
                y: window.currentTextY,
                
                // lấy kích thước patch cuối cùng
                patchWidth: finalPatchWidth,
                patchHeight: finalPatchHeight,
                
                patchRotation: patchRotation || 0,
                isManualResizedPatch: isManualResizedPatch || false,
                
                // lưu corner radius gốc
                patchCornerRadius: baseCornerRadius || 25,
                
                hasPatch: hasSetupBg === true,
                
                fontFamily: fontFamilyValue,
                fontSize: currentFontSize,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                
                textColor: textColor?.value || '#dec27a',
                bgColor: hasSetupBg ? (bgColor?.value || '#565559') : null,
                strokeColor: hasSetupStroke ? (strokeColor?.value || '#dec27a') : null,
                paddingX: window.currentPaddingX || currentPaddingX || 60,
                paddingY: window.currentPaddingY || currentPaddingY || 30,
                customFontFile: customFontFile
            };
            
            console.log('Final Export Config:', config);
            
            return config;
        };

        window.updateBoldState = (value) => isBold = value;
        window.updateItalicState = (value) => isItalic = value;
        window.updateUnderlineState = (value) => isUnderline = value;

        window.startInlineTextEdit = startInlineEdit;
        window.finishInlineTextEdit = finishInlineEdit;

        // BIẾN CHO RESIZE & ROTATION
        let isResizingImage = false;
        let imageResizeHandle = null;
        let imageStartWidth = 0;
        let imageStartHeight = 0;
        let imageStartX = 0;
        let imageStartY = 0;
        let imageAspectRatio = 1;

        // group (text + patch)
        let isResizingGroup = false;
        let groupResizeHandle = null;
        let groupStartWidth = 0;
        let groupStartHeight = 0;
        let groupStartX = 0;
        let groupStartY = 0;
        let originalGroupFontSize = 0;

        let isRotatingGroup = false;
        let rotationStartAngle = 0;

        // Trạng thái border
        let imageBorderActive = false;

        // sửa pointer-events sau khi cập nhật viewBox
        const originalUpdateSVGViewBox = window.updateSVGViewBox;
        window.updateSVGViewBox = function() {
            if (originalUpdateSVGViewBox) originalUpdateSVGViewBox();
            
            if (svg) svg.style.pointerEvents = 'none';
            if (bg) bg.style.pointerEvents = 'all';
            if (text) text.style.pointerEvents = 'all';
        };

        if (window.updateSVGViewBox) window.updateSVGViewBox();

        // resize image
        function createImageResizeBorder() {
            if (document.getElementById('imageBorderOverlay')) return;
            
            const borderOverlay = document.createElement('div');
            borderOverlay.id = 'imageBorderOverlay';
            borderOverlay.style.cssText = `
                position: absolute;
                top: -3px;
                left: -3px;
                right: -3px;
                bottom: -3px;
                pointer-events: none;
                display: none;
                z-index: 9999;
                box-sizing: border-box;
            `;
            
            const borderStyles = [
                { side: 'top', styles: 'top: 0; left: 0; width: 100%; height: 3px;' },
                { side: 'right', styles: 'top: 0; right: 0; width: 3px; height: 100%;' },
                { side: 'bottom', styles: 'bottom: 0; left: 0; width: 100%; height: 3px;' },
                { side: 'left', styles: 'top: 0; left: 0; width: 3px; height: 100%;' }
            ];
            
            borderStyles.forEach(({ side, styles }) => {
                const border = document.createElement('div');
                border.className = `border-${side}`;
                border.style.cssText = `
                    position: absolute;
                    background: #0067b8;
                    pointer-events: none;
                    ${styles}
                `;
                borderOverlay.appendChild(border);
            });
            
            const handles = [
                { pos: 'nw', cursor: 'nwse-resize', top: '-15px', left: '-15px' },
                { pos: 'ne', cursor: 'nesw-resize', top: '-15px', right: '-15px' },
                { pos: 'sw', cursor: 'nesw-resize', bottom: '-15px', left: '-15px' },
                { pos: 'se', cursor: 'nwse-resize', bottom: '-15px', right: '-15px' }
            ];
            
            handles.forEach(({ pos, cursor, ...styles }) => {
                const handle = document.createElement('div');
                handle.className = `image-resize-handle image-resize-${pos}`;
                handle.dataset.position = pos;
                handle.style.cssText = `
                    position: absolute;
                    width: 24px;
                    height: 24px;
                    background: white;
                    border: 3px solid #0067b8;
                    border-radius: 4px;
                    cursor: ${cursor};
                    pointer-events: all;
                    z-index: 10000;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    transition: all 0.2s ease;
                `;
                Object.entries(styles).forEach(([k, v]) => handle.style[k] = v);
                
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startImageResize(e, pos);
                });
                
                borderOverlay.appendChild(handle);
            });
            
            if (imageContainer) {
                imageContainer.appendChild(borderOverlay);
            }
        }

        // hàm đo chiều rộng text
        function measureTextWidth(text, fontSize, fontFamily, isBold, isItalic) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const fontWeight = isBold ? 'bold' : 'normal';
            const fontStyle = isItalic ? 'italic' : 'normal';
            ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            return ctx.measureText(text.toUpperCase()).width;
        }

        // hàm tự động xuống dòng
        function autoWrapText(text, maxWidth, fontSize, fontFamily, isBold, isItalic) {
            const words = text.split(/\s+/);
            const lines = [];
            let currentLine = '';
            
            words.forEach(word => {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const testWidth = measureTextWidth(testLine, fontSize, fontFamily, isBold, isItalic);
                
                if (testWidth > maxWidth && currentLine !== '') {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            
            if (currentLine !== '') {
                lines.push(currentLine);
            }
            
            return lines.join('\n');
        }

        // hàm gỡ bỏ khoảng trắng thừa và xuống dòng
        function unwrapText(text) {
            return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }


        // Bắt đầu resize image
        function startImageResize(e, position) {
            isResizingImage = true;
            imageResizeHandle = position;
            isDragging = false;
            
            const rect = imageContainer.getBoundingClientRect();
            imageStartWidth = rect.width;
            imageStartHeight = rect.height;
            imageStartX = e.clientX;
            imageStartY = e.clientY;
            imageAspectRatio = imageStartWidth / imageStartHeight;
            
            document.body.style.cursor = e.target.style.cursor;
        }

        // Kích hoạt border khi click vào imageContainer
        if (imageContainer) {
            imageContainer.addEventListener('click', (e) => {
                if (e.target === baseImage || e.target === imageContainer) {
                    imageBorderActive = true;
                    
                    const imageBorder = document.getElementById('imageBorderOverlay');
                    if (imageBorder) imageBorder.style.display = 'block';
                    
                    const groupBorder = document.getElementById('groupBorderOverlay');
                    if (groupBorder) groupBorder.style.display = 'none';
                    
                    e.stopPropagation();
                }
            });
        }

        // group resize và rotation
        function createGroupResizeControls() {
            if (document.getElementById('groupBorderOverlay')) return;
            
            const borderGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            borderGroup.id = 'groupBorderOverlay';
            borderGroup.style.display = 'none';
            borderGroup.style.pointerEvents = 'none';
            
            // Border chính
            const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            borderRect.id = 'groupBorderRect';
            borderRect.setAttribute('fill', 'none');
            borderRect.setAttribute('stroke', '#0067b8');
            borderRect.setAttribute('stroke-width', '3');
            borderRect.setAttribute('stroke-dasharray', '12,6');
            borderRect.style.pointerEvents = 'none';
            borderGroup.appendChild(borderRect);
            
            // 8 resize handles
            const handles = [
                { pos: 'nw', cursor: 'nwse-resize' },
                { pos: 'n', cursor: 'ns-resize' },
                { pos: 'ne', cursor: 'nesw-resize' },
                { pos: 'e', cursor: 'ew-resize' },
                { pos: 'se', cursor: 'nwse-resize' },
                { pos: 's', cursor: 'ns-resize' },
                { pos: 'sw', cursor: 'nesw-resize' },
                { pos: 'w', cursor: 'ew-resize' }
            ];
            
            handles.forEach(({ pos, cursor }) => {
                const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                handle.classList.add('group-resize-handle');
                handle.dataset.position = pos;
                handle.setAttribute('width', '20');
                handle.setAttribute('height', '20');
                handle.setAttribute('fill', 'white');
                handle.setAttribute('stroke', '#0067b8');
                handle.setAttribute('stroke-width', '3');
                handle.setAttribute('rx', '3');
                handle.style.cursor = cursor;
                handle.style.pointerEvents = 'all';
                
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startGroupResize(e, pos);
                });
                            handle.addEventListener('mouseenter', () => {
                const isHorizontal = ['e', 'w', 'ne', 'nw', 'se', 'sw'].includes(pos);
                if (isHorizontal) {
                    handle.setAttribute('data-tooltip', 'Kéo để tự động xuống dòng');
                }
            });
                borderGroup.appendChild(handle);
            });
            
            // rotation handle
            const rotationHandle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            rotationHandle.id = 'groupRotationHandle';
            rotationHandle.style.pointerEvents = 'all';
            rotationHandle.style.cursor = 'grab';
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('stroke', '#0067b8');
            line.setAttribute('stroke-width', '2');
            rotationHandle.appendChild(line);
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', '14');
            circle.setAttribute('fill', 'white');
            circle.setAttribute('stroke', '#0067b8');
            circle.setAttribute('stroke-width', '3');
            rotationHandle.appendChild(circle);
            
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            icon.setAttribute('d', 'M 0,-7 A 7,7 0 1,1 0,7');
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', '#0067b8');
            icon.setAttribute('stroke-width', '2.5');
            icon.setAttribute('stroke-linecap', 'round');
            rotationHandle.appendChild(icon);
            
            rotationHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startGroupRotation(e);
            });
            
            borderGroup.appendChild(rotationHandle);
            
            if (svg) svg.appendChild(borderGroup);


        }

        function startGroupResize(e, position) {
            isResizingGroup = true;
            groupResizeHandle = position;
            isDragging = false;
            
            const svgRect = svg.getBoundingClientRect();
            const imgWidth = baseImage.naturalWidth || baseImage.width;
            const imgHeight = baseImage.naturalHeight || baseImage.height;
            
            const scaleX = imgWidth / svgRect.width;
            const scaleY = imgHeight / svgRect.height;
            
            groupStartX = (e.clientX - svgRect.left) * scaleX;
            groupStartY = (e.clientY - svgRect.top) * scaleY;
            
            groupStartWidth = window.currentPatchWidth || 400;
            groupStartHeight = window.currentPatchHeight || 100;
            
            originalGroupFontSize = parseInt(fontSizeInput?.value || fontSize?.value || 80);
            
            // lưu lại text gốc chưa unwrap
            window.originalUnwrappedText = unwrapText(currentName);
            
            document.body.style.cursor = e.target.style.cursor;
        }

        // Bắt đầu xoay group
        function startGroupRotation(e) {
            isRotatingGroup = true;
            isDragging = false;
            
            const svgRect = svg.getBoundingClientRect();
            const imgWidth = baseImage.naturalWidth || baseImage.width;
            const imgHeight = baseImage.naturalHeight || baseImage.height;
            
            const scaleX = imgWidth / svgRect.width;
            const scaleY = imgHeight / svgRect.height;
            
            const mouseX = (e.clientX - svgRect.left) * scaleX;
            const mouseY = (e.clientY - svgRect.top) * scaleY;
            
            const dx = mouseX - window.currentTextX;
            const dy = mouseY - window.currentTextY;
            rotationStartAngle = Math.atan2(dy, dx) * 180 / Math.PI - patchRotation;
            
            document.body.style.cursor = 'grabbing';
        }

        // Cập nhật border group
        function updateGroupBorder() {
            const borderGroup = document.getElementById('groupBorderOverlay');
            const borderRect = document.getElementById('groupBorderRect');
            if (!borderGroup || !borderRect) return;
            
            // Nếu chưa có patch, dùng text bbox
            let x, y, w, h;
            
            if (bg && bg.style.display !== 'none') {
                x = parseFloat(bg.getAttribute('x') || 0);
                y = parseFloat(bg.getAttribute('y') || 0);
                w = parseFloat(bg.getAttribute('width') || 0);
                h = parseFloat(bg.getAttribute('height') || 0);
            } else if (text) {
                try {
                    const bbox = text.getBBox();
                    x = bbox.x;
                    y = bbox.y;
                    w = bbox.width;
                    h = bbox.height;
                } catch (e) {
                    return;
                }
            } else {
                return;
            }
            
            if (w === 0 || h === 0) return;
            
            const padding = 15;
            borderRect.setAttribute('x', x - padding);
            borderRect.setAttribute('y', y - padding);
            borderRect.setAttribute('width', w + padding * 2);
            borderRect.setAttribute('height', h + padding * 2);
            
            const transform = `rotate(${patchRotation}, ${window.currentTextX}, ${window.currentTextY})`;
            borderRect.setAttribute('transform', transform);
            
            // cập nhật vị trí handles
            const positions = {
                'nw': { x: x - padding - 10, y: y - padding - 10 },
                'n':  { x: x + w/2 - 10, y: y - padding - 10 },
                'ne': { x: x + w + padding - 10, y: y - padding - 10 },
                'e':  { x: x + w + padding - 10, y: y + h/2 - 10 },
                'se': { x: x + w + padding - 10, y: y + h + padding - 10 },
                's':  { x: x + w/2 - 10, y: y + h + padding - 10 },
                'sw': { x: x - padding - 10, y: y + h + padding - 10 },
                'w':  { x: x - padding - 10, y: y + h/2 - 10 }
            };
            
            borderGroup.querySelectorAll('.group-resize-handle').forEach(handle => {
                const pos = handle.dataset.position;
                if (positions[pos]) {
                    handle.setAttribute('x', positions[pos].x);
                    handle.setAttribute('y', positions[pos].y);
                    handle.setAttribute('transform', transform);
                }
            });
            
            // Rotation handle
            const rotationHandle = document.getElementById('groupRotationHandle');
            if (rotationHandle) {
                const rotHandleX = x + w/2;
                const rotHandleY = y - padding - 50;
                
                rotationHandle.setAttribute('transform', `translate(${rotHandleX}, ${rotHandleY}) rotate(${patchRotation})`);
                
                const line = rotationHandle.querySelector('line');
                line.setAttribute('x1', 0);
                line.setAttribute('y1', 0);
                line.setAttribute('x2', 0);
                line.setAttribute('y2', 45);
            }
        }

        // Áp dụng xoay patch
        function applyPatchRotation() {
            if (!text) return;
            
            const transform = `rotate(${patchRotation}, ${window.currentTextX}, ${window.currentTextY})`;
            
            if (bg && bg.style.display !== 'none') {
                bg.setAttribute('transform', transform);
            }
            text.setAttribute('transform', transform);
            
            updateGroupBorder();
        }

        // Click events
        if (bg) {
            bg.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                imageBorderActive = false;
                
                const groupBorder = document.getElementById('groupBorderOverlay');
                if (groupBorder) {
                    groupBorder.style.display = 'block';
                    updateGroupBorder();
                }
                
                const imageBorder = document.getElementById('imageBorderOverlay');
                if (imageBorder) imageBorder.style.display = 'none';
            });
        }

        if (text) {
            text.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                imageBorderActive = false;
                
                const groupBorder = document.getElementById('groupBorderOverlay');
                if (groupBorder) {
                    groupBorder.style.display = 'block';
                    updateGroupBorder();
                }
                
                const imageBorder = document.getElementById('imageBorderOverlay');
                if (imageBorder) imageBorder.style.display = 'none';
            });
        }

        // MOUSEMOVE
        document.addEventListener('mousemove', (e) => {
                if (isResizingImage) {
                    e.preventDefault();
                    
                    const deltaX = e.clientX - imageStartX;
                    let newWidth = imageStartWidth;
                    
                    switch(imageResizeHandle) {
                        case 'se':
                        case 'ne':
                            newWidth = imageStartWidth + deltaX;
                            break;
                        case 'sw':
                        case 'nw':
                            newWidth = imageStartWidth - deltaX;
                            break;
                    }
                    
                    newWidth = Math.max(300, newWidth);
                    const newHeight = newWidth / imageAspectRatio;
                    
                    imageContainer.style.width = newWidth + 'px';
                    imageContainer.style.height = newHeight + 'px';
                    
                    if (window.updateSVGViewBox) window.updateSVGViewBox();
                }
                
                if (isResizingGroup) {
            e.preventDefault();
            
            const svgRect = svg.getBoundingClientRect();
            const imgWidth = baseImage.naturalWidth || baseImage.width;
            const imgHeight = baseImage.naturalHeight || baseImage.height;
            
            const scaleX = imgWidth / svgRect.width;
            const scaleY = imgHeight / svgRect.height;
            
            const currentX = (e.clientX - svgRect.left) * scaleX;
            const currentY = (e.clientY - svgRect.top) * scaleY;
            
            const deltaX = currentX - groupStartX;
            const deltaY = currentY - groupStartY;
            
            let newWidth = groupStartWidth;
            let newHeight = groupStartHeight;
            
            // Chỉ resize theo chiều NGANG (E/W handles) mới auto-wrap
            const isHorizontalResize = ['e', 'w', 'ne', 'nw', 'se', 'sw'].includes(groupResizeHandle);
            
            if (['nw', 'ne', 'sw', 'se'].includes(groupResizeHandle)) {
                switch(groupResizeHandle) {
                    case 'se':
                        newWidth = groupStartWidth + deltaX;
                        newHeight = groupStartHeight + deltaY;
                        break;
                    case 'sw':
                        newWidth = groupStartWidth - deltaX;
                        newHeight = groupStartHeight + deltaY;
                        break;
                    case 'ne':
                        newWidth = groupStartWidth + deltaX;
                        newHeight = groupStartHeight - deltaY;
                        break;
                    case 'nw':
                        newWidth = groupStartWidth - deltaX;
                        newHeight = groupStartHeight - deltaY;
                        break;
                }
            } else {
                switch(groupResizeHandle) {
                    case 'n':
                        newHeight = groupStartHeight - deltaY;
                        break;
                    case 's':
                        newHeight = groupStartHeight + deltaY;
                        break;
                    case 'e':
                        newWidth = groupStartWidth + deltaX;
                        break;
                    case 'w':
                        newWidth = groupStartWidth - deltaX;
                        break;
                }
            }
            
            newWidth = Math.max(100, newWidth);
            newHeight = Math.max(50, newHeight);
            
            //  Auto-wrap text nếu resize ngang
            if (isHorizontalResize && window.originalUnwrappedText) {
                const scaleFactor = imgWidth / 11417;
                const paddingX = (window.currentPaddingX || currentPaddingX || 60) * scaleFactor;
                
                // Available width cho text (trừ padding)
                const availableWidth = newWidth - (paddingX * 2);
                
                // Auto wrap
                const wrappedText = autoWrapText(
                    window.originalUnwrappedText,
                    availableWidth,
                    originalGroupFontSize,
                    fontFamily?.value || 'Arial, sans-serif',
                    isBold,
                    isItalic
                );
                
                // Cập nhật text
                if (wrappedText !== currentName) {
                    currentName = wrappedText;
                    if (nameInput) nameInput.value = wrappedText;
                }
            }
            
            window.currentPatchWidth = newWidth;
            window.currentPatchHeight = newHeight;
            
            isManualResizedPatch = true;
            
            // Scale font size theo tỷ lệ
            const scaleFactor = Math.min(newWidth / groupStartWidth, newHeight / groupStartHeight);
            const newFontSize = Math.round(originalGroupFontSize * scaleFactor);
            
            if (fontSizeInput) fontSizeInput.value = Math.max(10, Math.min(500, newFontSize));
            if (fontSize) fontSize.value = Math.max(10, Math.min(500, newFontSize));
            
            updateName();
            updateGroupBorder();
        }
    
        // Rotate group
        if (isRotatingGroup) {
            e.preventDefault();
            
            const svgRect = svg.getBoundingClientRect();
            const imgWidth = baseImage.naturalWidth || baseImage.width;
            const imgHeight = baseImage.naturalHeight || baseImage.height;
            
            const scaleX = imgWidth / svgRect.width;
            const scaleY = imgHeight / svgRect.height;
            
            const mouseX = (e.clientX - svgRect.left) * scaleX;
            const mouseY = (e.clientY - svgRect.top) * scaleY;
            
            const dx = mouseX - window.currentTextX;
            const dy = mouseY - window.currentTextY;
            const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            patchRotation = currentAngle - rotationStartAngle;
            
            while (patchRotation > 180) patchRotation -= 360;
            while (patchRotation < -180) patchRotation += 360;
            
            applyPatchRotation();
        }
    });

    // MOUSEUP
    document.addEventListener('mouseup', () => {
        if (isResizingImage) {
            isResizingImage = false;
            imageResizeHandle = null;
            document.body.style.cursor = '';
            if (typeof saveDesign === 'function') saveDesign();
        }
        
        if (isResizingGroup) {
            isResizingGroup = false;
            groupResizeHandle = null;
            document.body.style.cursor = '';
            if (typeof saveDesign === 'function') saveDesign();
        }
        
        if (isRotatingGroup) {
            isRotatingGroup = false;
            document.body.style.cursor = '';
            if (typeof saveDesign === 'function') saveDesign();
        }
    });

    // CLICK BÊN NGOÀI
    document.addEventListener('click', (e) => {
        const clickedImageArea = e.target === baseImage || 
                                e.target === imageContainer ||
                                e.target.closest('#imageBorderOverlay');
        
        const clickedGroupArea = e.target === bg || 
                                e.target === text ||
                                e.target.closest('#groupBorderOverlay') ||
                                e.target.closest('.group-resize-handle');
        
        if (!clickedImageArea && !clickedGroupArea) {
            imageBorderActive = false;
            
            const imageBorder = document.getElementById('imageBorderOverlay');
            if (imageBorder) imageBorder.style.display = 'none';
            
            const groupBorder = document.getElementById('groupBorderOverlay');
            if (groupBorder) groupBorder.style.display = 'none';
        }
    });

    // OVERRIDE updateName() - TEXT CENTERED IN PATCH
    const originalUpdateName = window.updateName;
    window.updateName = function() {
        if (!text || !baseImage) return;

        const hasText = currentName && currentName.trim() !== '';

        if (!hasText) {
            text.style.display = 'none';
            if (bg) bg.style.display = 'none';
            return;
        }

        text.style.display = 'block';

        const imgWidth = baseImage.naturalWidth || baseImage.width;
        const imgHeight = baseImage.naturalHeight || baseImage.height;

        if (imgWidth === 0 || imgHeight === 0) return;

        if (window.currentTextX === 0 && window.currentTextY === 0) {
            window.currentTextX = imgWidth / 2;
            window.currentTextY = imgHeight / 2;
        }

        text.innerHTML = '';

        const currentFontSize = parseInt(fontSizeInput?.value || fontSize?.value || 80);
        const centerX = window.currentTextX;
        const centerY = window.currentTextY;

        text.setAttribute('font-size', currentFontSize);
        text.setAttribute('font-weight', isBold ? 'bold' : 'normal');
        text.setAttribute('font-style', isItalic ? 'italic' : 'normal');
        text.setAttribute('font-family', fontFamily?.value || 'Arial, sans-serif');
        text.setAttribute('fill', textColor?.value || '#dec27a');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');

        if (!isManualResizedPatch && window.currentPatchWidth > 0) {
            const scaleFactor = imgWidth / 11417;
            const paddingX = (window.currentPaddingX || currentPaddingX || 60) * scaleFactor;
            const availableWidth = window.currentPatchWidth - (paddingX * 2);
            
            // Nếu text hiện tại quá rộng, tự động wrap
            const unwrapped = unwrapText(currentName);
            const unwrappedWidth = measureTextWidth(unwrapped, currentFontSize, fontFamily?.value || 'Arial', isBold, isItalic);
            
            if (unwrappedWidth > availableWidth) {
                const wrappedText = autoWrapText(
                    unwrapped,
                    availableWidth,
                    currentFontSize,
                    fontFamily?.value || 'Arial, sans-serif',
                    isBold,
                    isItalic
                );
                
                if (wrappedText !== currentName) {
                    currentName = wrappedText;
                    if (nameInput) nameInput.value = wrappedText;
                }
            }
        }

        const lines = currentName.split('\n');
        const lineHeight = currentFontSize * 1.15;
        const totalLines = lines.length;

        const verticalOffset = (totalLines - 1) * lineHeight / 2;

        lines.forEach((line, i) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = line.toUpperCase();
            tspan.setAttribute('x', centerX);
            
            if (i === 0) {
                // Y = centerY - offset (để toàn bộ block căn giữa)
                tspan.setAttribute('y', centerY - verticalOffset);
            } else {
                // Các dòng sau: tăng dy
                tspan.setAttribute('dy', lineHeight);
            }
            
            if (isUnderline) {
                tspan.setAttribute('text-decoration', 'underline');
            }
            
            text.appendChild(tspan);
        });

        if (hasSetupBg && bg) {
            bg.style.display = 'block';

            requestAnimationFrame(() => {
                const scaleFactor = imgWidth / 11417;
                const scaledPaddingX = paddingX * scaleFactor;
                const scaledPaddingY = paddingY * scaleFactor;

                const baseCornerRadius = window.currentPatchCornerRadius || currentCornerRadius || 25;
                const scaledCornerRadius = baseCornerRadius * scaleFactor;

                let patchWidth, patchHeight;
                
                if (isManualResizedPatch && window.currentPatchWidth > 0 && window.currentPatchHeight > 0) {
                    patchWidth = window.currentPatchWidth;
                    patchHeight = window.currentPatchHeight;
                } else {
                    const patchSize = calculateMultiLinePatchSize(
                        lines,
                        currentFontSize,
                        fontFamily?.value || 'Arial, sans-serif',
                        isBold,
                        isItalic,
                        scaleFactor
                    );
                    
                    patchWidth = patchSize.width;
                    patchHeight = patchSize.height;
                    
                    window.currentPatchWidth = patchWidth;
                    window.currentPatchHeight = patchHeight;
                }

                // Patch centered on centerX, centerY
                const patchX = centerX - patchWidth / 2;
                const patchY = centerY - patchHeight / 2;

                bg.setAttribute('x', patchX);
                bg.setAttribute('y', patchY);
                bg.setAttribute('width', patchWidth);
                bg.setAttribute('height', patchHeight);
                bg.setAttribute('fill', bgColor?.value || '#565559');

                // corner radius
                bg.setAttribute('rx', scaledCornerRadius);
                bg.setAttribute('ry', scaledCornerRadius);

                if (hasSetupStroke) {
                    bg.setAttribute('stroke', strokeColor?.value || '#dec27a');
                    bg.setAttribute('stroke-width', 12 * scaleFactor);
                } else {
                    bg.removeAttribute('stroke');
                    bg.removeAttribute('stroke-width');
                }
                
                applyPatchRotation();
            });
        } else {
            if (bg) bg.style.display = 'none';
        }

        if (typeof saveDesign === 'function') saveDesign();
    };

    // OVERRIDE saveDesign()
    const originalSaveDesign = window.saveDesign || saveDesign;
    window.saveDesign = saveDesign = function() {
        try {
            const fontFamilySelect = document.getElementById('fontFamily');
            const selectedOption = fontFamilySelect?.options[fontFamilySelect.selectedIndex];
            const customFontFile = selectedOption?.dataset?.serverFile || null;
            
            const design = {
                name: currentName,
                textX: window.currentTextX,
                textY: window.currentTextY,
                patchWidth: window.currentPatchWidth,
                patchHeight: window.currentPatchHeight,
                patchRotation: patchRotation || 0,
                isManualResizedPatch: isManualResizedPatch || false,
                
                // LƯU CORNER RADIUS
                patchCornerRadius: window.currentPatchCornerRadius || currentCornerRadius || 25,
                
                // LƯU ĐÚNG hasPatch
                hasPatch: hasSetupBg,
                
                fontFamily: fontFamily?.value || 'Arial, sans-serif',
                fontSize: parseInt(fontSizeInput?.value || fontSize?.value || 80),
                textColor: textColor?.value || '#dec27a',
                bgColor: bgColor?.value || '#565559',
                strokeColor: strokeColor?.value || '#dec27a',
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                isBold, 
                isItalic, 
                isUnderline,
                imageDataUrl: baseImage?.src || '',
                customFontFile: customFontFile
            };
            
            localStorage.setItem('currentDesign', JSON.stringify(design));
            console.log('Saved design - hasPatch:', hasSetupBg, design);
        } catch (e) {
            console.error('Error saving design:', e);
        }
    };

    // KHỞI TẠO
    setTimeout(() => {
        createImageResizeBorder();
        createGroupResizeControls();
        
        try {
            const saved = localStorage.getItem('currentDesign');
            if (saved) {
                const design = JSON.parse(saved);
                
                if (design.patchRotation !== undefined) {
                    patchRotation = design.patchRotation;
                }
                
                if (design.isManualResizedPatch !== undefined) {
                    isManualResizedPatch = design.isManualResizedPatch;
                }
                
                if (isManualResizedPatch && design.patchWidth && design.patchHeight) {
                    window.currentPatchWidth = design.patchWidth;
                    window.currentPatchHeight = design.patchHeight;
                }
                
                setTimeout(() => {
                    applyPatchRotation();
                }, 100);
            }
        } catch (e) {
            console.error('Error restoring rotation:', e);
        }
    }, 200);

    // CSS
    const resizeStyle = document.createElement('style');
    resizeStyle.textContent = `
        #printLayer {
            pointer-events: none !important;
        }
        
        #nameBg, #printName {
            pointer-events: all !important;
        }
        
        .image-resize-handle {
            transition: all 0.2s ease;
        }
        
        .image-resize-handle:hover {
            transform: scale(1.2);
            background: #0067b8 !important;
            border-color: white !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        
        .group-resize-handle {
            transition: all 0.2s ease;
        }
        
        .group-resize-handle:hover {
            transform: scale(1.25);
            filter: drop-shadow(0 4px 10px #0067b8);
        }
        
        #groupRotationHandle {
            transition: all 0.2s ease;
        }
        
        #groupRotationHandle:hover circle {
            transform: scale(1.2);
            filter: drop-shadow(0 4px 10px #0067b8);
        }
        
        #groupRotationHandle:active {
            cursor: grabbing !important;
        }
            
        .group-resize-handle[data-position="e"],
        .group-resize-handle[data-position="w"],
        .group-resize-handle[data-position="ne"],
        .group-resize-handle[data-position="nw"],
        .group-resize-handle[data-position="se"],
        .group-resize-handle[data-position="sw"] {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
    `;
    document.head.appendChild(resizeStyle);

    window.applyPatchRotation = applyPatchRotation;
    window.updateGroupBorder = updateGroupBorder;

    window.setHasSetupBg = function(value) {
        hasSetupBg = !!value;
        console.log('Set hasSetupBg:', hasSetupBg);
    };

    window.setHasSetupStroke = function(value) {
        hasSetupStroke = !!value;
        console.log('Set hasSetupStroke:', hasSetupStroke);
    };

    window.getHasSetupBg = function() {
        return hasSetupBg;
    };

    window.getHasSetupStroke = function() {
        return hasSetupStroke;
    };
    window.setPatchRotation = function(rotation) {
    patchRotation = parseFloat(rotation || 0);
    console.log('✅ setPatchRotation called:', patchRotation);
};

window.getPatchRotation = function() {
    return patchRotation;
};
});