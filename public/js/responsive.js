// MOBILE SIDEBAR OVERLAY - Responsive Handler
document.addEventListener('DOMContentLoaded', function() {
    const topMenu = document.querySelector('.top-menu');
    const savedDesigns = document.querySelector('.saved-designs');
    const body = document.body;
    
    // Kiểm tra các element có tồn tại không
    if (!topMenu || !savedDesigns) {
        console.warn('Top menu hoặc saved designs không tìm thấy');
        return;
    }
    
    // TẠO NÚT TOGGLE
    let toggleBtn = document.querySelector('.menu-toggle');
    
    if (!toggleBtn) {
        toggleBtn = document.createElement('div');
        toggleBtn.className = 'menu-toggle';
        toggleBtn.setAttribute('title', 'Hiện thiết kế đã lưu');
        toggleBtn.innerHTML = '<i class="bx bx-menu"></i>';
        
        // Thêm vào đầu top menu
        topMenu.insertBefore(toggleBtn, topMenu.firstChild);
    }
    
    // DI CHUYỂN USER MENU/AUTH BUTTONS VÀO SIDEBAR
    if (window.innerWidth <= 768) {
        const userMenu = document.getElementById('userMenu');
        const authButtons = document.querySelector('.auth-buttons');
        
        if (userMenu) {
            // Di chuyển user menu vào cuối sidebar
            savedDesigns.appendChild(userMenu);
        }
        
        if (authButtons) {
            // Di chuyển auth buttons vào cuối sidebar
            savedDesigns.appendChild(authButtons);
        }
    }
    
    // XỬ LÝ TOGGLE SIDEBAR
    function openSidebar() {
        savedDesigns.classList.add('mobile-show');
        body.classList.add('sidebar-open');
        toggleBtn.classList.add('active');
        toggleBtn.querySelector('i').className = 'bx bx-x';
        toggleBtn.setAttribute('title', 'Đóng');
        
        // Lưu trạng thái
        try {
            localStorage.setItem('sidebarOpen', 'true');
        } catch (e) {}
    }
    
    function closeSidebar() {
        savedDesigns.classList.remove('mobile-show');
        body.classList.remove('sidebar-open');
        toggleBtn.classList.remove('active');
        toggleBtn.querySelector('i').className = 'bx bx-menu';
        toggleBtn.setAttribute('title', 'Hiện thiết kế đã lưu');
        
        // Lưu trạng thái
        try {
            localStorage.setItem('sidebarOpen', 'false');
        } catch (e) {}
    }
    
    function toggleSidebar() {
        if (savedDesigns.classList.contains('mobile-show')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
    
    // Click event cho toggle button
    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleSidebar();
    });
    
    // ĐÓNG SIDEBAR KHI CLICK OVERLAY
    body.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            // Kiểm tra xem click có phải vào overlay không
            if (body.classList.contains('sidebar-open') && 
                !savedDesigns.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                closeSidebar();
            }
        }
    });
    
    // Ngăn click vào sidebar đóng overlay
    savedDesigns.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // KHỞI TẠO TRẠNG THÁI BAN ĐẦU
    function initializeSidebar() {
        if (window.innerWidth <= 768) {
            // Mặc định đóng sidebar trên mobile
            closeSidebar();
            
            // Di chuyển user menu/auth buttons vào sidebar
            const userMenu = document.getElementById('userMenu');
            const authButtons = document.querySelector('.auth-buttons');
            
            if (userMenu && !savedDesigns.contains(userMenu)) {
                savedDesigns.appendChild(userMenu);
            }
            
            if (authButtons && !savedDesigns.contains(authButtons)) {
                savedDesigns.appendChild(authButtons);
            }
        } else {
            // Desktop: xóa các class mobile và di chuyển về top menu
            savedDesigns.classList.remove('mobile-show');
            body.classList.remove('sidebar-open');
            
            const userMenu = document.getElementById('userMenu');
            const authButtons = document.querySelector('.auth-buttons');
            
            if (userMenu && savedDesigns.contains(userMenu)) {
                topMenu.appendChild(userMenu);
            }
            
            if (authButtons && savedDesigns.contains(authButtons)) {
                topMenu.appendChild(authButtons);
            }
        }
    }
    
    // XỬ LÝ KHI RESIZE WINDOW
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            initializeSidebar();
        }, 250);
    });
    
    // ĐÓNG DROPDOWN KHI CLICK BÊN NGOÀI
    document.addEventListener('click', function(e) {
        // Đóng tất cả dropdown menu
        const dropdowns = document.querySelectorAll('.dropdown-menu.show');
        dropdowns.forEach(dropdown => {
            const parent = dropdown.closest('.menu-item');
            if (parent && !parent.contains(e.target)) {
                dropdown.classList.remove('show');
                parent.classList.remove('active');
            }
        });
        
        // Đóng user dropdown - hoạt động cả trong sidebar
        const userDropdown = document.getElementById('userDropdown');
        const userMenu = document.getElementById('userMenu');
        if (userDropdown && userMenu && 
            !userMenu.contains(e.target) && 
            userDropdown.classList.contains('show')) {
            userDropdown.classList.remove('show');
            userMenu.classList.remove('active');
        }
    });
    
    // XỬ LÝ USER MENU TRONG SIDEBAR
    const userMenu = document.getElementById('userMenu');
    if (userMenu && window.innerWidth <= 768) {
        userMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
                this.classList.toggle('active');
            }
        });
    }
    
    // TỐI ƯU CHO MENU ITEMS - Tooltip cho icon-only items
    if (window.innerWidth <= 768) {
        // Thêm tooltip cho menu items
        const menuTextMap = {
            'menuText': 'Nhập chữ',
            'menuPositionShort': 'Vị trí ≤13 ký tự',
            'menuPositionLong': 'Vị trí >13 ký tự',
            'menuFont': 'Font chữ',
            'menuColors': 'Màu sắc'
        };
        
        Object.keys(menuTextMap).forEach(id => {
            const item = document.getElementById(id);
            if (item) {
                item.setAttribute('title', menuTextMap[id]);
            }
        });
    }
    
    // PREVENT SCROLL TRÊN BODY KHI SIDEBAR MỞ
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                if (body.classList.contains('sidebar-open')) {
                    body.style.overflow = 'hidden';
                } else {
                    body.style.overflow = '';
                }
            }
        });
    });
    
    observer.observe(body, {
        attributes: true,
        attributeFilter: ['class']
    });
    
    // TỐI ƯU CHO TOUCH DEVICES
    if ('ontouchstart' in window) {
        body.classList.add('touch-device');
        
        // Prevent double-tap zoom trên iOS
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Smooth swipe để đóng sidebar
        let touchStartX = 0;
        let touchEndX = 0;
        
        savedDesigns.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        savedDesigns.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
        
        function handleSwipe() {
            // Swipe từ phải sang trái để đóng
            if (touchStartX - touchEndX > 50) {
                closeSidebar();
            }
        }
    }
    
    // AUTO-CLOSE SIDEBAR KHI CHỌN ITEM (optional)
    const savedItems = document.querySelectorAll('.saved-item');
    savedItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                // Delay một chút để user thấy selection
                setTimeout(() => {
                    closeSidebar();
                }, 300);
            }
        });
    });
    
    // KHỞI CHẠY
    initializeSidebar();
    
    console.log('Mobile sidebar overlay initialized');
});

// POSITION DROPDOWN CORRECTLY ON MOBILE
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const dropdown = this.querySelector('.dropdown-menu');
                if (dropdown) {
                    // Toggle dropdown
                    const isShown = dropdown.classList.contains('show');
                    
                    // Đóng tất cả dropdown khác
                    document.querySelectorAll('.dropdown-menu.show').forEach(d => {
                        if (d !== dropdown) {
                            d.classList.remove('show');
                            d.closest('.menu-item').classList.remove('active');
                        }
                    });
                    
                    if (!isShown) {
                        dropdown.classList.add('show');
                        this.classList.add('active');
                        
                        // Scroll dropdown vào view nếu cần
                        setTimeout(() => {
                            dropdown.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'nearest' 
                            });
                        }, 100);
                    } else {
                        dropdown.classList.remove('show');
                        this.classList.remove('active');
                    }
                }
            }
        });
    });
});

// RESPONSIVE HELPER
window.getScreenSize = function() {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1180) return 'tablet';
    return 'desktop';
};

// Debug log (chỉ trên localhost)
if (window.location.hostname === 'localhost') {
    let currentSize = window.getScreenSize();
    console.log(`Current screen: ${currentSize}`);
    
    window.addEventListener('resize', function() {
        const newSize = window.getScreenSize();
        if (newSize !== currentSize) {
            console.log(`Screen changed: ${currentSize} → ${newSize}`);
            currentSize = newSize;
        }
    });
}