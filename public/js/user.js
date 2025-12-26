document.addEventListener('DOMContentLoaded', function () {

    // === Toggle dropdown trong top-menu ===
    let currentDropdown = null;

    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const dropdown = this.querySelector('.dropdown-menu');
            if (!dropdown) return;

            if (currentDropdown && currentDropdown !== dropdown) {
                currentDropdown.style.display = 'none';
            }

            dropdown.style.display =
                dropdown.style.display === 'block' ? 'none' : 'block';

            currentDropdown = dropdown;
        });
    });

    document.addEventListener('click', function () {
        if (currentDropdown) {
            currentDropdown.style.display = 'none';
            currentDropdown = null;
        }
    });

    // === User dropdown ===
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenu && userDropdown) {
        userMenu.addEventListener('click', function (e) {
            e.stopPropagation();
            userDropdown.style.display =
                userDropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', function () {
            userDropdown.style.display = 'none';
        });
    }

    // === Auth Modal ===
    const modal = document.getElementById('authModal');
    const loginBtn = document.getElementById('btnShowLogin');
    const registerBtn = document.getElementById('btnShowRegister');
    const closeBtn = document.getElementById('authModalClose');

    // 🔥 SỬA ĐÚNG ID FORM
    const loginForm = document.getElementById('loginFormSubmit');
    const registerForm = document.getElementById('registerFormSubmit');

    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    // Mở login
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        });
    }

    // Mở register
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }

    // Đóng modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Switch trong modal
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        });
    }

    // === Submit login / register ===
    function submitAuthForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'application/json'
                },
                body: formData,
                credentials: 'same-origin'  // 🔥 Quan trọng: Để gửi cookie
            })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw data;
                return data;
            })
            .then(data => {
                showToast(data.message || 'Thành công', 'success');
                
                // 🔥 Đóng modal trước khi reload
                const modal = document.getElementById('authModal');
                if (modal) modal.style.display = 'none';
                
                // 🔥 Reload sau 500ms
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            })
            .catch(err => {
                if (err.errors) {
                    Object.values(err.errors).forEach(e =>
                        showToast(e[0], 'error')
                    );
                } else {
                    showToast(err.message || 'Có lỗi xảy ra', 'error');
                }
            });
        });
    }

    submitAuthForm('loginFormSubmit');
    submitAuthForm('registerFormSubmit');

    // === Toast ===
    window.showToast = function (message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.querySelector('.toast-message').textContent = message;
        toast.className = 'toast show ' + type;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    };

    const toastClose = document.querySelector('.toast-close');
    if (toastClose) {
        toastClose.addEventListener('click', () => {
            document.getElementById('toast').classList.remove('show');
        });
    }
});
