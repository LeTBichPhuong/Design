<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Design Studio</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="stylesheet" href="{{ asset('home.css') }}">
    <link rel="stylesheet" href="{{ asset('responsive.css') }}">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
</head>
<body>
    {{-- cột menu trái --}}
    <div class="saved-designs">
        <div class="left-toolbar">

            <div class="tool-btn active" data-target="menuSaved">
                <i class='bx bxs-file-image'></i>
                <span>Thiết kế</span>
            </div>

            <div class="tool-btn" data-target="menuText">
                <i class='bx bx-edit-alt'></i>
                <span>Nhập chữ</span>
            </div>

            <div class="tool-btn" data-target="menuFont">
                <i class='bx bx-font'></i>
                <span>Font</span>
            </div>

            <div class="tool-btn" data-target="menuColors">
                <i class='bx bx-palette'></i>
                <span>Màu sắc</span>
            </div>

        </div>

        {{-- panel --}}
        <div class="left-panel">
            <div id="menuSaved" class="panel-content active">
                <h2 style="margin: 0">
                    <i class='bx bxs-file-image'></i>
                    Thiết Kế Gần Đây
                </h2>
                <div class="saved-content">
                    <div id="savedList"></div>

                    <button id="newDesignBtn" class="btn-new-design" title="Tạo thiết kế mới">
                        <span class="icon">+</span>
                        <span class="text">Tạo thiết kế mới</span>
                    </button>
                </div>

            </div>

            {{-- nhập chữ --}}
            <div id="menuText" class="panel-content">
                <div class="dropdown-menu show">
                    <h2>Nhập Văn Bản</h2>
                    <div class="menu-input-group">
                        <label>Nội dung văn bản</label>
                        <input
                            type="text"
                            id="nameInput"
                            placeholder="Nội dung văn bản..."
                            maxlength="60"
                        >
                    </div>
                </div>
            </div>

            {{-- font chữ --}}
            <div id="menuFont" class="panel-content">
                <div class="dropdown-menu show">
                    <h2>Phông Chữ</h2>
                    <div class="menu-input-group">
                        <label>Phông chữ</label>
                        <select id="fontFamily" class="form-control">
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Courier New', monospace">Courier New</option>
                            <option value="'Times New Roman', serif">Times New Roman</option>
                            <option value="'Impact', sans-serif">Impact</option>
                            <option value="'Georgia', serif">Georgia</option>
                            <option value="'Verdana', sans-serif">Verdana</option>
                            <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                        </select>
                    </div>
                    <!-- Nút tải lên font custom -->
                    <div class="menu-input-group">
                        <label>Tải lên phông chữ tùy chỉnh</label>
                        <button type="button" id="uploadFontBtn" class="btn btn-primary">
                            <i class="bx bx-upload"></i>Tải lên phông chữ
                        </button>
                        <input type="file" id="fontFileInput" accept=".ttf,.otf,.woff,.woff2" style="display: none;">
                    </div>
                    <div class="menu-input-group">
                        <label>Cỡ chữ</label>
                        <div style="position: relative; display: flex; align-items: center; gap: 8px;">
                            <input 
                                type="number" 
                                id="fontSizeInput" 
                                min="10" 
                                max="500" 
                                step="1"
                                value="80"
                                placeholder="10-500"
                                style="width: 80px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-weight: 500;">
                            <select id="fontSize" style="flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #666;">
                                <option value="" selected disabled>Chọn nhanh...</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="40">40</option>
                                <option value="60">60</option>
                                <option value="80">80</option>
                                <option value="100">100</option>
                                <option value="120">120</option>
                                <option value="150">150</option>
                                <option value="200">200</option>
                                <option value="250">250</option>
                                <option value="300">300</option>
                            </select>
                        </div>
                    </div>
                    <div class="format-buttons">
                        <button class="format-btn format-btn-bold" id="btnBold">
                            <span>B</span>
                        </button>

                        <button class="format-btn format-btn-italic" id="btnItalic">
                            <span>I</span>
                        </button>

                        <button class="format-btn format-btn-underline" id="btnUnderline">
                            <span>U</span>
                        </button>
                    </div>
                </div>
            </div>

            {{-- màu sắc --}}
            <div id="menuColors" class="panel-content">
                <div class="dropdown-menu show">
                    <h2>Màu Sắc</h2>
                    <div class="menu-input-group">
                        <label>Màu chữ</label>
                        <input type="color" id="textColor" value="#dec27a">
                    </div>
                    <div class="menu-input-group">
                        <label>Màu nền patch</label>
                        <input type="color" id="bgColor" value="#565559">
                    </div>
                    <div class="menu-input-group">
                        <label>Màu viền</label>
                        <input type="color" id="strokeColor" value="#dec27a">
                    </div>
                    <div class="menu-input-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin-top: 20px;">
                            <input type="checkbox" id="togglePatchCheckbox" style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="font-weight: 600;">Hiển thị Patch nền</span>
                        </label>
                    </div>
                    <div class="menu-input-group">
                        <label style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                            <span>Độ bo góc</span>
                            <input 
                                type="number" 
                                id="cornerRadiusInput" 
                                value="25" 
                                min="0" 
                                max="200" 
                                style="width: 70px; padding: 5px 0 5px 5px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; border-radius: 4px; text-align: center;"
                            >
                        </label>
                        <input 
                            type="range" 
                            id="cornerRadiusSlider" 
                            value="25" 
                            min="0" 
                            max="200" 
                            style="width: 100%; margin-top: 8px; background: rgb(92 85 85 / 20%);"
                        >
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">
                            <span>0 (vuông)</span>
                            <span>200 (tròn)</span>
                        </div>
                    </div>
                </div>
            </div>

            {{-- nút đóng panel --}}
            <button class="panel-toggle-btn" id="panelCloseBtn" title="Đóng panel">
                <i class='bx bx-left-arrow-alt'></i>
            </button>
        </div>
    </div>

    {{-- content-wrapper --}}
    <div class="content-wrapper" id="contentWrapper">
        {{-- top-menu --}}
        <div class="top-menu">
            <div class="name-designs">
                <h2>Design Studio</h2>
            </div>
            {{-- nút lưu xuât --}}
            <div class="action-buttons">
                <button id="saveBtn">LƯU</button>
                <button id="exportBtn">XUẤT</button>
            </div>

            <div class="menu-divider"></div>

            {{-- người dùng --}}
            @auth
                <div class="user-menu" id="userMenu">
                    <img src="{{ Auth::user()->avatar ? asset('storage/avatars/' . Auth::user()->avatar) : asset('images/placeholder.png') }}" 
                    onerror="this.src='{{ asset('images/placeholder.png') }}'" 
                    alt="Avatar" 
                    class="user-avatar">
                    <span class="user-name">{{ auth()->user()->name }}</span>
                    <i class='bx bx-chevron-down'></i>
                    
                    <div class="user-dropdown" id="userDropdown">
                        <a href="{{ route('profile') }}" class="user-dropdown-item">
                            <i class='bx bx-user'></i>
                            <span>Hồ sơ tài khoản</span>
                        </a>
                        <div class="user-dropdown-divider"></div>
                        <form action="{{ route('logout') }}" method="POST" style="margin: 0;">
                            @csrf
                            <button type="submit" class="user-dropdown-item" style="width: 100%; background: none; border: none; text-align: left;">
                                <i class='bx bx-log-out'></i>
                                <span>Đăng xuất</span>
                            </button>
                        </form>
                    </div>
                </div>
                @else
                <div class="auth-buttons">
                    <button class="auth-btn btn-login" id="btnShowLogin">Đăng nhập</button>
                    <button class="auth-btn btn-register" id="btnShowRegister">Đăng ký</button>
                </div>
            @endauth
        </div>

        {{-- main --}}
        <div class="main-container">
            <div class="controls"></div>
            {{-- lưới grid --}}
            <div class="product-preview">
                <div class="upload-area" id="uploadArea">
                    <div class="upload-placeholder">
                        <div class="upload-icon">
                            <i class='bx bx-plus'></i>
                        </div>
                        <div class="upload-text">Tạo thiết kế mới</div>
                        <div class="upload-hint">Nhấp để chọn ảnh hoặc kéo thả ảnh vào đây</div>
                    </div>
                </div>
                {{-- ảnh --}}
                <div class="image-container" id="imageContainer" style="display: none;">
                    <img id="baseImage" class="base-image" src="" alt="Thiết kế">

                    <svg class="print-layer" id="printLayer" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <filter id="textUnderline">
                                <feFlood flood-color="#dec27a"/>
                                <feComposite in="SourceGraphic"/>
                            </filter>
                        </defs>
                        <rect
                            id="nameBg"
                            rx="25"
                            ry="25"
                            fill="#565559"
                            stroke="#dec27a"
                            stroke-width="12"
                            style="display: none;"
                        />
                        <text
                            id="printName"
                            fill="#dec27a"
                            font-size="160"
                            font-weight="normal"
                            font-style="normal"
                            font-family="Arial, sans-serif"
                            letter-spacing="0.3"
                            dominant-baseline="middle"
                            style="display: none;"
                        ></text>
                    </svg>
                </div>
                {{-- nút đổi ảnh --}}
                <button class="change-image-btn" id="changeImageBtn">
                    <i class='bx bx-image-add'></i>
                    Đổi ảnh
                </button>

                {{-- Hidden File Input  --}}
                <input type="file" id="fileInput" accept="image/*" style="display: none;">
            </div>
        </div>
    </div>

    {{-- auth modal --}}
    <div id="authModal" class="auth-modal">
        <div class="auth-modal-content">
            <span id="authModalClose"><i class='bx bx-x'></i></span>

            {{-- login --}}
            <form id="loginFormSubmit" action="/api/login">
                <h2>Đăng nhập</h2>
                <p>Nhập thông tin tài khoản</p>
                    <label>Nhập email</label>
                    <input type="email" name="email" placeholder="Email">
                    <label>Nhập mật khẩu(ít nhất 8 ký tự)</label>
                    <input type="password" name="password" required placeholder="••••••••">
                <button type="submit">Đăng nhập</button>
                <p>
                    Chưa có tài khoản?
                    <a href="#" id="switchToRegister">Đăng ký</a>
                </p>
            </form>

            {{-- register --}}
            <form id="registerFormSubmit" action="/api/register" style="display:none;">
                <h2>Đăng ký</h2>
                <p>Tạo tài khoản</p>
                <label>Nhập tên của bạn</label>
                <input type="text" name="name" placeholder="Họ tên">
                <label>Nhập email</label>
                <input type="email" name="email" placeholder="Email">
                <label>Nhập mật khẩu(ít nhất 8 ký tự)</label>
                <input type="password" name="password" required placeholder="••••••••">
                <label>Xác nhận mật khẩu</label>
                <input type="password" name="password_confirmation" required placeholder="••••••••">

                <button type="submit">Đăng ký</button>

                <p>
                    Đã có tài khoản?
                    <a href="#" id="switchToLogin">Đăng nhập</a>
                </p>
            </form>
        </div>
    </div>

    {{-- toast notification --}}
    <div id="toast" class="toast">
        <span class="toast-icon"></span>
        <div class="toast-content">
            <div class="toast-message"></div>
        </div>
        <button class="toast-close">×</button>
        <div class="toast-progress"></div>
    </div>

    {{-- confirm  --}}
    <div id="confirmModal" class="confirm-overlay hidden">
        <div class="confirm-box">
            <h3>Xác nhận</h3>
            <p>Bạn có chắc chắn muốn xóa thiết kế này không? Hành động này không thể hoàn tác.</p>
            <div class="confirm-actions">
                <button id="confirmCancel" class="btn-cancel">Hủy</button>
                <button id="confirmDelete" class="btn-ok">Xóa</button>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/home.js') }}"></script>
    <script src="{{ asset('js/export.js') }}"></script>
    <script src="{{ asset('js/user.js') }}"></script>
    <script src="{{ asset('js/responsive.js') }}"></script>
    <script src="{{ asset('js/preview.js') }}"></script>

    @if(session('success'))
        <script>
            showToast('{{ session('success') }}', 'success');
        </script>
    @endif

    @if($errors->any())
        <script>
            @foreach($errors->all() as $error)
                showToast('{{ $error }}', 'error');
            @endforeach
        </script>
    @endif

</body>
</html>