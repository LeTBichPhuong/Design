document.addEventListener('DOMContentLoaded', () => {
    /**
     * Lấy config từ home.js
     */
    function getDesignConfig() {
        // Lấy từ window nếu có export
        if (window.currentName !== undefined) {
            return {
                currentName: window.currentName,
                isBold: window.isBold,
                isItalic: window.isItalic,
                isUnderline: window.isUnderline,
                hasSetupBg: window.hasSetupBg,
                hasSetupStroke: window.hasSetupStroke,
                patchRotation: window.patchRotation,
                currentTextX: window.currentTextX,
                currentTextY: window.currentTextY,
                fontFamily: window.fontFamily,
                fontSize: window.fontSize,
                fontSizeInput: window.fontSizeInput,
                textColor: window.textColor,
                bgColor: window.bgColor,
                strokeColor: window.strokeColor
            };
        }
        
        // Hoặc lấy từ DOM
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
        
        return {
            currentName: nameInput?.value || '',
            isBold: btnBold?.classList.contains('active') || false,
            isItalic: btnItalic?.classList.contains('active') || false,
            isUnderline: btnUnderline?.classList.contains('active') || false,
            hasSetupBg: window.getHasSetupBg ? window.getHasSetupBg() : false,
            hasSetupStroke: window.getHasSetupStroke ? window.getHasSetupStroke() : false,
            patchRotation: window.getPatchRotation ? window.getPatchRotation() : 0,
            currentTextX: window.currentTextX || 0,
            currentTextY: window.currentTextY || 0,
            fontFamily: fontFamily,
            fontSize: fontSize,
            fontSizeInput: fontSizeInput,
            textColor: textColor,
            bgColor: bgColor,
            strokeColor: strokeColor
        };
    }

    /**
     * Tạo blob URL cho ảnh với patch/text
     */
    async function generatePreviewBlob() {
        try {
            const svg = document.getElementById('printLayer');
            const baseImage = document.getElementById('baseImage');
            const text = document.getElementById('printName');
            const bg = document.getElementById('nameBg');
            
            if (!baseImage || !baseImage.src) {
                throw new Error('Chưa có ảnh');
            }
            
            // Lấy config
            const config = getDesignConfig();
            
            const imgWidth = baseImage.naturalWidth || baseImage.width;
            const imgHeight = baseImage.naturalHeight || baseImage.height;
            
            console.log('Tạo view preview:', {
                imgWidth, 
                imgHeight, 
                hasText: !!config.currentName,
                hasPatch: config.hasSetupBg 
            });

            // Tạo canvas để render
            const canvas = document.createElement('canvas');
            canvas.width = imgWidth;
            canvas.height = imgHeight;
            const ctx = canvas.getContext('2d');
            
            // Vẽ ảnh gốc
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = baseImage.src;
            });
            
            ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
            
            // Vẽ patch nếu có
            if (config.hasSetupBg && bg && bg.style.display !== 'none') {
                const patchX = parseFloat(bg.getAttribute('x') || 0);
                const patchY = parseFloat(bg.getAttribute('y') || 0);
                const patchWidth = parseFloat(bg.getAttribute('width') || 0);
                const patchHeight = parseFloat(bg.getAttribute('height') || 0);
                const rx = parseFloat(bg.getAttribute('rx') || 0);
                
                const bgColorHex = config.bgColor?.value || '#565559';
                const strokeColorHex = config.strokeColor?.value || '#dec27a';
                
                const scaleFactor = imgWidth / 11417;
                const strokeWidth = 12 * scaleFactor;
                
                ctx.save();
                
                // Apply rotation
                if (config.patchRotation && Math.abs(config.patchRotation) > 0.1) {
                    ctx.translate(config.currentTextX, config.currentTextY);
                    ctx.rotate((config.patchRotation * Math.PI) / 180);
                    ctx.translate(-config.currentTextX, -config.currentTextY);
                }
                
                // Vẽ patch bo góc
                ctx.beginPath();
                ctx.moveTo(patchX + rx, patchY);
                ctx.lineTo(patchX + patchWidth - rx, patchY);
                ctx.quadraticCurveTo(patchX + patchWidth, patchY, patchX + patchWidth, patchY + rx);
                ctx.lineTo(patchX + patchWidth, patchY + patchHeight - rx);
                ctx.quadraticCurveTo(patchX + patchWidth, patchY + patchHeight, patchX + patchWidth - rx, patchY + patchHeight);
                ctx.lineTo(patchX + rx, patchY + patchHeight);
                ctx.quadraticCurveTo(patchX, patchY + patchHeight, patchX, patchY + patchHeight - rx);
                ctx.lineTo(patchX, patchY + rx);
                ctx.quadraticCurveTo(patchX, patchY, patchX + rx, patchY);
                ctx.closePath();
                
                ctx.fillStyle = bgColorHex;
                ctx.fill();
                
                // Vẽ viền nếu có
                if (config.hasSetupStroke && strokeColorHex) {
                    ctx.strokeStyle = strokeColorHex;
                    ctx.lineWidth = strokeWidth;
                    ctx.stroke();
                }
                
                ctx.restore();
            }
            
            // Vẽ text
            if (text && text.style.display !== 'none' && config.currentName && config.currentName.trim() !== '') {
                const currentFontSize = parseInt(config.fontSizeInput?.value || config.fontSize?.value || 80);
                const textColorHex = config.textColor?.value || '#dec27a';
                
                ctx.save();
                
                // Apply rotation
                if (config.patchRotation && Math.abs(config.patchRotation) > 0.1) {
                    ctx.translate(config.currentTextX, config.currentTextY);
                    ctx.rotate((config.patchRotation * Math.PI) / 180);
                    ctx.translate(-config.currentTextX, -config.currentTextY);
                }
                
                // Setup font
                const fontWeightStr = config.isBold ? 'bold' : 'normal';
                const fontStyleStr = config.isItalic ? 'italic' : 'normal';
                const fontFamilyStr = config.fontFamily?.value || 'Arial, sans-serif';
                
                ctx.font = `${fontStyleStr} ${fontWeightStr} ${currentFontSize}px ${fontFamilyStr}`;
                ctx.fillStyle = textColorHex;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const lines = config.currentName.split('\n');
                const lineHeight = currentFontSize * 1.15;
                const totalLines = lines.length;
                const verticalOffset = (totalLines - 1) * lineHeight / 2;
                
                lines.forEach((line, i) => {
                    const y = config.currentTextY - verticalOffset + (i * lineHeight);
                    const upperLine = line.toUpperCase();
                    
                    // Vẽ text chính
                    ctx.fillText(upperLine, config.currentTextX, y);
                    
                    // Underline
                    if (config.isUnderline) {
                        const metrics = ctx.measureText(upperLine);
                        const textWidth = metrics.width;
                        const descent = metrics.actualBoundingBoxDescent || currentFontSize * 0.2;
                        const underlineOffset = descent * 0.3;
                        const underlineY = y + descent + underlineOffset;
                        const underlineThickness = Math.max(2, currentFontSize / 20);
                        
                        ctx.beginPath();
                        ctx.moveTo(config.currentTextX - textWidth/2, underlineY);
                        ctx.lineTo(config.currentTextX + textWidth/2, underlineY);
                        ctx.lineWidth = underlineThickness;
                        ctx.strokeStyle = textColorHex;
                        ctx.stroke();
                    }
                });
                
                ctx.restore();
            }
            
            // Convert canvas to blob
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Không thể tạo blob'));
                    }
                }, 'image/png', 0.95);
            });
            
        } catch (error) {
            console.error('Lỗi tạo preview:', error);
            throw error;
        }
    }

    /**
     * Upload preview blob lên server và trả về URL thật
     */
    async function uploadPreviewToServer(blob) {
        try {
            const config = getDesignConfig();
            
            const formData = new FormData();
            
            // Tạo filename
            const timestamp = new Date().toISOString().slice(0,19).replace(/[-:T]/g, '').slice(0,15);
            const cleanName = config.currentName.trim().substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'preview';
            const filename = `${cleanName}_preview_${timestamp}.png`;
            
            formData.append('image', blob, filename);
            
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch('/upload-preview', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed: ' + response.status);
            }
            
            const data = await response.json();
            
            if (!data.success || !data.url) {
                throw new Error(data.message || 'Upload không thành công');
            }
            
            return {
                url: data.url,
                filename: data.filename,
                path: data.path
            };
            
        } catch (error) {
            console.error('Preview upload error:', error);
            throw error;
        }
    }

    /**
     * Khởi tạo context menu
     */
    function initContextMenu() {
        const baseImage = document.getElementById('baseImage');
        
        if (!baseImage) {
            console.warn('baseImage not found, retrying...');
            setTimeout(initContextMenu, 500);
            return;
        }
        
        baseImage.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            
            try {
                const config = getDesignConfig();
                
                // Kiểm tra có text không
                if (!config.currentName || config.currentName.trim() === '') {
                    if (window.showToast) {
                        window.showToast('Chưa có nội dung text để xem trước', 'info');
                    }
                    return;
                }
                
                // Hiện loading
                if (window.showToast) {
                    window.showToast('Tạo ảnh xem trước', 'info');
                }
                
                // Tạo preview blob
                const blob = await generatePreviewBlob();
                
                // Upload lên server
                const result = await uploadPreviewToServer(blob);
                
                console.log('Preview saved:', result);
                
                // Mở trong tab mới
                window.open(result.url, '_blank');
                
                if (window.showToast) {
                    window.showToast('Đã mở ảnh xem trước', 'success');
                }
                
            } catch (error) {
                console.error('Context menu error:', error);
                if (window.showToast) {
                    window.showToast(error.message || 'Không thể mở ảnh xem trước', 'error');
                }
            }
        });
        
        baseImage.style.cursor = 'context-menu';
        baseImage.title = 'Click chuột phải để tạo ảnh xem trước (có thể chia sẻ link)';
        
        console.log('Context menu initialized');
    }

    // Khởi tạo khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContextMenu);
    } else {
        initContextMenu();
    }

    // Export functions
    window.generatePreviewBlob = generatePreviewBlob;
    window.uploadPreviewToServer = uploadPreviewToServer;

    console.log('preview.js loaded');
});