document.addEventListener('DOMContentLoaded', () => {

    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const savedList = document.getElementById('savedList');

    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const PLACEHOLDER = '/images/placeholder.png';

    window.currentDesignId = null;
    window.currentBaseImage = null;

    // hỗ trợ ảnh high - res
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

        const baseImage = document.getElementById('baseImage');

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
            if (window.updateSVGViewBox) window.updateSVGViewBox();
            if (window.updateName) window.updateName();
        };
    }

    // Hiển thị thông báo
    function toast(msg, type = 'success') {
        window.showToast?.(msg, type);
    }

    // Định dạng ngày tháng
    function formatDate(date) {
        return new Date(date).toLocaleString('vi-VN');
    }

    // Lấy URL thumbnail
    function getThumbnailUrl(design) {
        let imagePath = design.export_image || design.base_image;
        if (!imagePath) return PLACEHOLDER;
        if (imagePath.startsWith('data:') || imagePath.startsWith('http')) return imagePath;
        
        imagePath = imagePath.replace(/^\/+/, '');
        
        if (imagePath.includes('exports/')) {
            let filename = imagePath.split('/').pop();
            filename = decodeURIComponent(filename);
            return `/exports/${filename}`;
        }
        
        return '/' + imagePath;
    }

    // Tạo thumbnail từ canvas
    async function generateThumbnail() {
        const baseImage = document.getElementById('baseImage');
        const printLayer = document.getElementById('printLayer');
        const text = document.getElementById('printName');
        const bg = document.getElementById('nameBg');
        
        if (!baseImage || !printLayer || !text.textContent) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 300;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = baseImage.src;
        });
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Render SVG overlay có text + patch
        const svgData = new XMLSerializer().serializeToString(printLayer);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const svgImg = new Image();
        await new Promise((resolve, reject) => {
            svgImg.onload = resolve;
            svgImg.onerror = reject;
            svgImg.src = svgUrl;
        });
        
        ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(svgUrl);
        
        return canvas.toDataURL('image/png');
    }

    // Hiển thị danh sách thiết kế đã lưu
    function renderSaved(designs) {
        if (!savedList) return;

        if (!Array.isArray(designs) || designs.length === 0) {
            savedList.innerHTML = `<div class="empty-state">Chưa có thiết kế nào</div>`;
            return;
        }

        savedList.innerHTML = '';

        designs.forEach(d => {
            const div = document.createElement('div');
            div.className = 'saved-item' + (String(d.id) === String(window.currentDesignId) ? ' active' : '');

            div.innerHTML = `
                <div class="thumb">
                    <img src="${getThumbnailUrl(d)}" onerror="this.src='${PLACEHOLDER}'">
                </div>
                <div class="saved-info">
                    <div class="saved-name">${d.name ?? 'Thiết kế'}</div>
                    <div class="saved-date">${formatDate(d.created_at)}</div>
                </div>
                <button class="delete-btn">✕</button>
            `;

            // Trong hàm renderSaved, khi load design:

            div.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-btn')) return;

                const url = new URL(window.location);
                url.searchParams.delete('name');
                window.history.replaceState({}, '', url);

                window.currentDesignId = d.id;
                window.currentBaseImage = d.base_image;

                const config = typeof d.config === 'string' ? JSON.parse(d.config) : d.config;

                console.log(' Loading design config:', config);

                // Set tọa độ CENTER trước để tránh reset về giữa
                window.currentTextX = config.x || 0;
                window.currentTextY = config.y || 0;
                window.currentPatchWidth = config.patchWidth || 0;
                window.currentPatchHeight = config.patchHeight || 0;
                window.currentPatchCornerRadius = config.patchCornerRadius || 25;
                
                //'KHÔI PHỤC ROTATION & MANUAL RESIZE
                if (config.patchRotation !== undefined) {
                    if (typeof patchRotation !== 'undefined') {
                        patchRotation = config.patchRotation;
                    } else {
                        window.patchRotation = config.patchRotation;
                    }
                }

                //'QUAN TRỌNG: RESET hasSetupBg & hasSetupStroke TRƯỚC KHI LOAD
                // Expose từ home.js
                if (window.setHasSetupBg) {
                    window.setHasSetupBg(config.hasPatch === true);
                }
                if (window.setHasSetupStroke) {
                    window.setHasSetupStroke(!!config.strokeColor);
                }

                setTimeout(() => {
                    if (window.applyPatchRotation) window.applyPatchRotation();
                    if (window.updateGroupBorder) window.updateGroupBorder();
                }, 200);

                // Load ảnh với resize nếu high-res
                let imageUrl = d.base_image.replace(/^\/+/, '');
                imageUrl = '/' + imageUrl;
                await loadImageForEditor(imageUrl);

                // Hiển thị UI
                const uploadArea = document.getElementById('uploadArea');
                const imageContainer = document.getElementById('imageContainer');
                const changeImageBtn = document.getElementById('changeImageBtn');
                if (uploadArea) uploadArea.style.display = 'none';
                if (imageContainer) imageContainer.style.display = 'block';
                if (changeImageBtn) changeImageBtn.classList.add('active');

                // Cập nhật controls
                const nameInput = document.getElementById('nameInput');
                const fontFamily = document.getElementById('fontFamily');
                const fontSize = document.getElementById('fontSize');
                const fontSizeInput = document.getElementById('fontSizeInput');
                const textColor = document.getElementById('textColor');
                const bgColor = document.getElementById('bgColor');
                const strokeColor = document.getElementById('strokeColor');
                const btnBold = document.getElementById('btnBold');
                const btnItalic = document.getElementById('btnItalic');
                const btnUnderline = document.getElementById('btnUnderline');

                if (nameInput) {
                    nameInput.value = config.text || '';
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // SET FONT FAMILY (CÓ THỂ CÓ CUSTOM FONT)
                if (fontFamily) {
                    if (config.customFontFile) {
                        let foundOption = null;
                        for (let i = 0; i < fontFamily.options.length; i++) {
                            if (fontFamily.options[i].dataset.serverFile === config.customFontFile) {
                                foundOption = fontFamily.options[i];
                                break;
                            }
                        }
                        
                        if (foundOption) {
                            fontFamily.value = foundOption.value;
                            console.log('Found custom font option:', foundOption.value);
                        } else {
                            const fontName = config.fontFamily.replace(/, sans-serif|, serif|, monospace/g, '').replace(/['"]/g, '');
                            const option = document.createElement('option');
                            option.value = `'${fontName}', sans-serif`;
                            option.textContent = fontName;
                            option.dataset.serverFile = config.customFontFile;
                            fontFamily.appendChild(option);
                            fontFamily.value = option.value;
                            console.log('Added custom font option:', option.value);
                        }
                    } else {
                        fontFamily.value = config.fontFamily || 'Arial, sans-serif';
                    }
                }
                
                if (fontSize) fontSize.value = config.fontSize || 80;
                if (fontSizeInput) fontSizeInput.value = config.fontSize || 80;
                if (textColor) textColor.value = config.textColor || '#dec27a';
                if (bgColor) bgColor.value = config.bgColor || '#565559';
                if (strokeColor) strokeColor.value = config.strokeColor || '#dec27a';

                //'Cập nhật trạng thái format
                if (btnBold) {
                    const isBold = config.fontWeight === 'bold';
                    btnBold.classList.toggle('active', isBold);
                    if (window.updateBoldState) window.updateBoldState(isBold);
                }
                if (btnItalic) {
                    const isItalic = config.fontStyle === 'italic';
                    btnItalic.classList.toggle('active', isItalic);
                    if (window.updateItalicState) window.updateItalicState(isItalic);
                }
                if (btnUnderline) {
                    const isUnderline = config.textDecoration === 'underline';
                    btnUnderline.classList.toggle('active', isUnderline);
                    if (window.updateUnderlineState) window.updateUnderlineState(isUnderline);
                }

                //'Lấy serverFile từ option đã chọn
                const selectedOption = fontFamily?.options[fontFamily.selectedIndex];
                const customFontFile = selectedOption?.dataset?.serverFile || config.customFontFile || null;

                console.log('Custom font file:', customFontFile);

                //'Cập nhật localStorage với ĐẦY ĐỦ THÔNG TIN
                localStorage.setItem('currentDesign', JSON.stringify({
                    name: config.text || '',
                    textX: config.x || 0,
                    textY: config.y || 0,
                    patchWidth: config.patchWidth || 0,
                    patchHeight: config.patchHeight || 0,
                    patchCornerRadius: config.patchCornerRadius || 0,
                    patchRotation: config.patchRotation || 0,
                    isManualResizedPatch: config.isManualResizedPatch || false,
                    
                    //'LƯU hasPatch
                    hasPatch: config.hasPatch === true,
                    
                    fontFamily: config.fontFamily || 'Arial, sans-serif',
                    fontSize: config.fontSize || 80,
                    fontWeight: config.fontWeight || 'normal',
                    fontStyle: config.fontStyle || 'normal',
                    textDecoration: config.textDecoration || 'none',
                    
                    textColor: config.textColor || '#dec27a',
                    bgColor: config.bgColor || '#565559',
                    strokeColor: config.strokeColor || '#dec27a',
                    
                    isBold: config.fontWeight === 'bold',
                    isItalic: config.fontStyle === 'italic',
                    isUnderline: config.textDecoration === 'underline',
                    
                    imageDataUrl: window.currentFullResImageUrl || baseImage.src,
                    customFontFile: customFontFile
                }));

                // Update SVG
                if (window.updateName) {
                    setTimeout(() => window.updateName(), 100);
                }

                renderSaved(designs);
                toast(`Thiết kế: ${d.name}`);
            });
            
            div.querySelector('.delete-btn').addEventListener('click', e => {
                e.stopPropagation();
                if (window.showConfirm) {
                    window.showConfirm('Xóa thiết kế này?', () => deleteDesign(d.id));
                } else if (confirm('Xóa thiết kế này?')) {
                    deleteDesign(d.id);
                }
            });

            savedList.appendChild(div);
        });
    }

    // Tải danh sách thiết kế đã lưu
    async function loadDesigns() {
        try {
            const res = await fetch('/designs', { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderSaved(data);
        } catch (e) {
            toast('Không tải được thiết kế', 'error');
        }
    }

    loadDesigns();

    // Lắng nghe sự kiện reload designs
    document.addEventListener('designsNeedReload', () => {
        loadDesigns();
    });
    
    // Lưu thiết kế
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const config = window.getExportConfig ? window.getExportConfig() : null;

            if (!config || !config.text) {
                toast('Chưa có nội dung', 'error');
                return;
            }

            const baseImage = document.getElementById('baseImage');
            if (!baseImage || !baseImage.src) {
                toast('Chưa chọn ảnh nền', 'error');
                return;
            }

            try {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Đang lưu...';

                const isUpdate = !!window.currentDesignId;
                let uploadedImagePath = window.currentBaseImage || window.currentFullResImageUrl;

                if (baseImage.src.startsWith('data:')) {
                    const blob = await (await fetch(baseImage.src)).blob();
                    const formData = new FormData();
                    formData.append('image', blob, 'design.png');

                    const uploadRes = await fetch('/upload-image', {
                        method: 'POST',
                        headers: { 'X-CSRF-TOKEN': csrf },
                        body: formData
                    });

                    if (!uploadRes.ok) throw new Error('Upload thất bại');

                    const uploadData = await uploadRes.json();
                    uploadedImagePath = uploadData.path;
                    window.currentFullResImageUrl = '/' + uploadData.path.replace(/^\/+/, '');

                    window.currentBaseImage = uploadData.path;
                }

                await new Promise(resolve => setTimeout(resolve, 200));

                const thumbnailDataUrl = await generateThumbnail();

                let thumbnailPath = null;
                if (thumbnailDataUrl) {
                    const blob = await (await fetch(thumbnailDataUrl)).blob();
                    const formData = new FormData();
                    formData.append('image', blob, 'thumbnail.png');

                    const uploadRes = await fetch('/upload-image', {
                        method: 'POST',
                        headers: { 'X-CSRF-TOKEN': csrf },
                        body: formData
                    });

                    if (uploadRes.ok) {
                        const data = await uploadRes.json();
                        thumbnailPath = data.path;
                    }
                }

                //'LẤY CUSTOM FONT FILE TỪ SELECT
                const fontFamilySelect = document.getElementById('fontFamily');
                const selectedOption = fontFamilySelect?.options[fontFamilySelect.selectedIndex];
                const customFontFile = selectedOption?.dataset?.serverFile || null;

                //'MERGE CONFIG VỚI CUSTOM FONT FILE
                const configWithFont = {
                    ...config,
                    customFontFile: customFontFile
                };

                console.log('Saving config:', configWithFont);

                const url = isUpdate ? `/designs/${window.currentDesignId}` : `/designs`;

                const res = await fetch(url, {
                    method: isUpdate ? 'PUT' : 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrf,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: config.text,
                        base_image: uploadedImagePath,
                        config: configWithFont, //'GỬI CONFIG ĐẦY ĐỦ
                        export_image: thumbnailPath
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    console.error('Save error response:', errorData);
                    throw new Error(errorData.message || 'Lưu thất bại');
                }

                const data = await res.json();
                
                window.currentDesignId = data.design.id;

                toast(isUpdate ? 'Đã cập nhật thiết kế thành công' : 'Đã lưu thiết kế thành công');
                loadDesigns();

            } catch (e) {
                console.error('Save error:', e);
                toast(e.message || 'Lưu thiết kế thất bại', 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'LƯU';
            }
        });
    }

    // Xóa thiết kế
    async function deleteDesign(id) {
        try {
            const res = await fetch(`/designs/${id}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' }
            });

            if (!res.ok) throw new Error('Xóa thất bại');

            if (String(window.currentDesignId) === String(id)) {
                window.currentDesignId = null;
                window.currentBaseImage = null;
                window.currentFullResImageUrl = null;
                if (window.resetToUploadGrid) window.resetToUploadGrid();
            }

            toast('Đã xóa thiết kế thành công');
            loadDesigns();
        } catch (e) {
            toast('Xóa lỗi', 'error');
        }
    }

    // Xuất ảnh client-side với high-res
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const baseImage = document.getElementById('baseImage');
            const printName = document.getElementById('printName');

            if (!baseImage?.src || baseImage.src === PLACEHOLDER) {
                toast('Chưa chọn ảnh nền', 'error');
                return;
            }

            if (!printName?.textContent.trim()) {
                toast('Chưa nhập nội dung text', 'error');
                return;
            }

            // Đảm bảo đã lưu thiết kế
            if (!window.currentDesignId) {
                toast('Đang tự động lưu thiết kế...', 'info');
                
                // Trigger save
                if (saveBtn) {
                    saveBtn.click();
                    
                    // Đợi save xong
                    await new Promise(resolve => {
                        const checkSaved = setInterval(() => {
                            if (window.currentDesignId) {
                                clearInterval(checkSaved);
                                resolve();
                            }
                        }, 500);
                        
                        // Timeout sau 10s
                        setTimeout(() => {
                            clearInterval(checkSaved);
                            resolve();
                        }, 10000);
                    });
                    
                    if (!window.currentDesignId) {
                        toast('Vui lòng lưu thiết kế trước', 'error');
                        return;
                    }
                }
            }

            try {
                exportBtn.disabled = true;
                exportBtn.textContent = 'Đang xuất...';

                const res = await fetch(`/designs/${window.currentDesignId}/export`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrf,
                        'Accept': 'application/json'
                    }
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    console.error('Export error:', errorData);
                    throw new Error(errorData.message || 'Xuất ảnh thất bại');
                }

                const data = await res.json();

                if (data.success) {
                    // Tự động tải về
                    const a = document.createElement('a');
                    a.href = data.url;
                    a.download = data.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    // Mở ảnh trong tab mới
                    setTimeout(() => {
                        window.open(data.url, '_blank');
                    }, 500);

                    toast('Xuất ảnh thành công!', 'success');
                    
                    // Reload designs để cập nhật thumbnail
                    setTimeout(() => loadDesigns(), 1000);
                } else {
                    throw new Error(data.message || 'Xuất ảnh thất bại');
                }

            } catch (e) {
                console.error('Export error:', e);
                toast(e.message || 'Xuất ảnh thất bại', 'error');
            } finally {
                exportBtn.disabled = false;
                exportBtn.textContent = 'XUẤT';
            }
        });
    }
});