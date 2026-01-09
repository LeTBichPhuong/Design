document.addEventListener('DOMContentLoaded', () => {
    // Tab navigation
    const menuItems = document.querySelectorAll('.menu-item');
    const profileTab = document.getElementById('profileTab');
    const historyTab = document.getElementById('historyTab');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;

            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            if (tab === 'profile') {
                profileTab.classList.add('active');
                historyTab.classList.remove('active');
            } else if (tab === 'history') {
                profileTab.classList.remove('active');
                historyTab.classList.add('active');
                loadDesignHistory();
            }
        });
    });

    // Chỉnh sửa hồ sơ
    const btnEdit = document.getElementById('btnEdit');
    const btnCancel = document.getElementById('btnCancel');
    const editSection = document.getElementById('editSection');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');

    let originalData = {};

    function saveOriginalData() {
        originalData = {
            name: nameInput.value,
            email: emailInput.value,
            avatar: avatarPreview.src
        };
    }

    if (btnEdit) {
        btnEdit.addEventListener('click', function() {
            saveOriginalData();
            nameInput.disabled = false;
            emailInput.disabled = false;
            editSection.style.display = 'block';
            btnEdit.style.display = 'none';
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', function() {
            nameInput.value = originalData.name;
            emailInput.value = originalData.email;
            avatarPreview.src = originalData.avatar;
            nameInput.disabled = true;
            emailInput.disabled = true;
            editSection.style.display = 'none';
            btnEdit.style.display = 'block';
            document.getElementById('password').value = '';
            document.getElementById('password_confirmation').value = '';
        });
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Lịch sử thiết kế
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const PLACEHOLDER = `/images/placeholder.png`;

    const designsGrid = document.getElementById('designsGrid');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const viewBtns = document.querySelectorAll('.view-btn');
    const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');

    let allDesigns = [];
    let currentFilter = 'all';
    let currentView = 'grid';

    // FIX: Hàm lấy thumbnail CHÍNH XÁC giống export.js
    function getThumbnailUrl(design) {
        let imagePath = design.export_image || design.base_image;
        
        if (!imagePath) return PLACEHOLDER;
        
        if (imagePath.startsWith('data:') || imagePath.startsWith('http')) {
            return imagePath;
        }
        
        imagePath = imagePath.replace(/^\/+/, '');
        
        let filename = imagePath.split('/').pop();
        filename = decodeURIComponent(filename);
        return `/exports/${filename}`;
    }

    // Load design history from server
    async function loadDesignHistory() {
        try {
            const res = await fetch('/designs', {
                credentials: 'same-origin',
                headers: { 
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            allDesigns = await res.json();
            
            updateStats(allDesigns);
            renderDesigns(applyFiltersAndSort(allDesigns));

        } catch (e) {
            console.error('Load designs error:', e);
            showToast('Không thể tải lịch sử thiết kế', 'error');
            
            if (designsGrid) {
                designsGrid.innerHTML = `
                    <div class="empty-designs">
                        <i class='bx bx-error'></i>
                        <h3>Không thể tải dữ liệu</h3>
                        <p>Vui lòng thử lại sau</p>
                    </div>
                `;
            }
        }
    }

    // Cập nhật thống kê thiết kế
    function updateStats(designs) {
        const total = designs.length;
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const today = designs.filter(d => new Date(d.created_at) >= startOfToday).length;
        const recent = designs.filter(d => new Date(d.created_at) > sevenDaysAgo).length;

        const totalEl = document.getElementById('totalDesigns');
        const recentEl = document.getElementById('recentDesigns');
        const todayEl = document.getElementById('todayDesigns');

        if (totalEl) totalEl.textContent = total;
        if (recentEl) recentEl.textContent = recent;
        if (todayEl) todayEl.textContent = today;
    }

    // Tạo hiển thị thiết kế
    function renderDesigns(designs) {
        if (!designsGrid) return;

        if (!designs || designs.length === 0) {
            designsGrid.innerHTML = `
                <div class="empty-designs">
                    <i class='bx bx-image'></i>
                    <h3>Chưa có thiết kế nào</h3>
                    <p>Bắt đầu tạo thiết kế đầu tiên của bạn ngay bây giờ</p>
                    <a href="/" class="btn-create-new">
                        <i class='bx bx-plus'></i> Tạo thiết kế mới
                    </a>
                </div>
            `;
            return;
        }

        designsGrid.innerHTML = '';
        designs.forEach(design => {
            const card = createDesignCard(design);
            designsGrid.appendChild(card);
        });
    }

    // Tạo thẻ thiết kế
    function createDesignCard(design) {
        const div = document.createElement('div');
        div.className = `design-card ${currentView === 'list' ? 'list-view' : ''}`;

        const date = new Date(design.created_at);
        const formattedDate = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const isNew = (Date.now() - date.getTime()) < 24 * 60 * 60 * 1000;

        // Ưu tiên export_image (đã có text), fallback về base_image
        const thumbnailUrl = getThumbnailUrl(design);

        div.innerHTML = `
            <img 
                src="${thumbnailUrl}" 
                alt="${escapeHtml(design.name || 'Thiết kế')}"
                class="design-thumbnail"
                onerror="this.src='${PLACEHOLDER}'"
                onclick="previewDesign('${thumbnailUrl}', '${escapeHtml(design.name || 'Thiết kế')}')"
            >
            <div class="design-info">
                <div class="design-header">
                    <div class="design-name">${escapeHtml(design.name || 'Thiết kế không tên')}</div>
                    ${isNew ? '<span class="design-badge">Mới</span>' : ''}
                </div>
                <div class="design-meta">
                    <div class="design-meta-item">
                        <i class='bx bx-calendar'></i>
                        ${formattedDate}
                    </div>
                    <div class="design-meta-item">
                        <i class='bx bx-time'></i>
                        ${formattedTime}
                    </div>
                </div>
                <div class="design-actions">
                    <button class="btn-action btn-open" onclick="openDesign(${design.id})">
                        <i class='bx bx-edit'></i> Mở
                    </button>
                    <button class="btn-action btn-download" onclick="downloadDesign(${design.id})">
                        <i class='bx bx-download'></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteDesign(${design.id})">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `;

        return div;
    }

    function getFullExportUrl(design) {
        if (design.export_image) {
            let path = design.export_image.replace(/^\/+/, '');
            if (path.includes('exports/')) {
                let filename = path.split('/').pop();
                filename = decodeURIComponent(filename);
                return `/exports/${filename}`;
            }
            return '/' + path;
        }
        return PLACEHOLDER;
    }

    // Bảo vệ chống XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Tìm kiếm thiết kế
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = allDesigns.filter(d => 
                (d.name || '').toLowerCase().includes(query)
            );
            renderDesigns(applyFiltersAndSort(filtered));
        });
    }

    // Sắp xếp thiết kế
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const searchQuery = searchInput?.value.toLowerCase().trim() || '';
            let filtered = allDesigns;
            
            if (searchQuery) {
                filtered = allDesigns.filter(d => 
                    (d.name || '').toLowerCase().includes(searchQuery)
                );
            }
            
            renderDesigns(applyFiltersAndSort(filtered));
        });
    }

    // Lọc thiết kế theo thời gian
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            
            const searchQuery = searchInput?.value.toLowerCase().trim() || '';
            let filtered = allDesigns;
            
            if (searchQuery) {
                filtered = allDesigns.filter(d => 
                    (d.name || '').toLowerCase().includes(searchQuery)
                );
            }
            
            renderDesigns(applyFiltersAndSort(filtered));
        });
    });

    // Lựa chọn chế độ hiển thị (lưới/danh sách)
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            
            if (currentView === 'list') {
                designsGrid.classList.add('list-view');
            } else {
                designsGrid.classList.remove('list-view');
            }
            
            const searchQuery = searchInput?.value.toLowerCase().trim() || '';
            let filtered = allDesigns;
            
            if (searchQuery) {
                filtered = allDesigns.filter(d => 
                    (d.name || '').toLowerCase().includes(searchQuery)
                );
            }
            
            renderDesigns(applyFiltersAndSort(filtered));
        });
    });

    // Áp dụng bộ lọc và sắp xếp
    function applyFiltersAndSort(designs) {
        let filtered = [...designs];

        // Áp dụng bộ lọc thời gian
        if (currentFilter !== 'all') {
            const now = new Date();
            
            if (currentFilter === 'today') {
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                filtered = filtered.filter(d => new Date(d.created_at) >= startOfToday);
            } else if (currentFilter === 'week') {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(d => new Date(d.created_at) > sevenDaysAgo);
            }
        }

        // Áp dụng sắp xếp
        const sortType = sortSelect?.value || 'newest';
        filtered.sort((a, b) => {
            switch(sortType) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'name':
                    return (a.name || '').localeCompare(b.name || '', 'vi');
                case 'name_desc':
                    return (b.name || '').localeCompare(a.name || '', 'vi');
                default:
                    return 0;
            }
        });

        return filtered;
    }

    // Hiển thị thông báo toast
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            const newContainer = document.createElement('div');
            newContainer.id = 'toastContainer';
            newContainer.className = 'toast-container';
            document.body.appendChild(newContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <span class="toast-close">&times;</span>
        `;

        const toastContainer = document.getElementById('toastContainer');
        toastContainer.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.onclick = () => hideToast();
        }

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Hàm mở thiết kế trong trình chỉnh sửa
    window.openDesign = function(designId) {
        window.location.href = `/?name=${designId}`;
    };
    
    // Xem trước thiết kế
    window.previewDesign = function(url, name) {
        const modal = document.getElementById('modalPreview');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        
        if (modal && modalImage && modalTitle) {
            modalTitle.textContent = name || 'Thiết kế';
            modalImage.src = url;
            modalImage.onerror = () => { modalImage.src = PLACEHOLDER; };
            modal.classList.add('show');
        }
    };

    // Tải xuống thiết kế
    window.downloadDesign = async function(designId) {
        try {
            showToast('Đang xuất ảnh...', 'info');

            // Gọi backend xuất full-res
            const res = await fetch(`/designs/${designId}/export`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            if (!data.success || !data.url) {
                throw new Error(data.message || 'Xuất ảnh thất bại');
            }

            // Tải về file full-res
            const a = document.createElement('a');
            a.href = data.url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Mở tab mới xem full-res
            window.open(data.url, '_blank');

            showToast('Đã xuất và tải xuống ảnh full chất lượng!', 'success');

        } catch (e) {
            console.error('Download error:', e);
            showToast('Xuất ảnh thất bại: ' + e.message, 'error');
        }
    };

    function showConfirm() {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const okBtn = document.getElementById('confirmOk');
            const cancelBtn = document.getElementById('confirmCancel');

            modal.classList.remove('hidden');

            okBtn.onclick = () => {
                modal.classList.add('hidden');
                resolve(true);
            };

            cancelBtn.onclick = () => {
                modal.classList.add('hidden');
                resolve(false);
            };
        });
    }

    // Xóa thiết kế
    window.deleteDesign = async function(id) {
        const confirmed = await showConfirm();
        if (!confirmed) return;

        try {
            const res = await fetch(`/designs/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            showToast('Đã xóa thiết kế thành công', 'success');

            setTimeout(() => {
                loadDesignHistory();
            }, 500);

        } catch (e) {
            console.error('Delete error:', e);
            showToast('Xóa thiết kế thất bại', 'error');
        }
    };

    window.showToast = showToast;
});