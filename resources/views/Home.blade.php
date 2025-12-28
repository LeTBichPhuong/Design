<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>In tên trên áo</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="stylesheet" href="{{ asset('home.css') }}">
    <link rel="stylesheet" href="{{ asset('responsive.css') }}">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
</head>
<body>
    <!-- Cột lưu trữ thiết kế - bên trái full height -->
    <div class="saved-designs">
        <h2><i class='bx bxs-file-image'></i> THIẾT KẾ ĐÃ LƯU</h2>
        <div class="saved-content">
            <div id="savedList"></div>
            <button id="newDesignBtn" class="btn-new-design" title="Tạo thiết kế mới">
                <span class="icon">+</span>
                <span class="text">Tạo thiết kế mới</span>
            </button>
        </div>
    </div>

    <!-- Content wrapper - bên phải saved-designs -->
    <div class="content-wrapper">
        <!-- Top Menu Bar -->
        <div class="top-menu">
            <!-- Nhập text -->
            <div class="menu-item" id="menuText">
                <i class='bx bx-edit-alt'></i> Nhập chữ
                <div class="dropdown-menu" id="dropdownText">
                    <h4>NHẬP CHỮ IN</h4>
                    <div class="menu-input-group">
                        <label>Nội dung in</label>
                        <input
                            type="text"
                            id="nameInput"
                            placeholder="Nhập chữ cần in…"
                            maxlength="60"
                        >
                    </div>
                </div>
            </div>

            <div class="menu-divider"></div>

            <!-- Vị trí ngắn -->
            <div class="menu-item" id="menuPositionShort">
                <i class='bx bx-chevron-down-circle'></i> Vị trí ≤13 ký tự
                <div class="dropdown-menu" id="dropdownShort">
                    <h4>VỊ TRÍ CHO CHỮ NGẮN (≤13 ký tự)</h4>
                    <div class="menu-input-group">
                        <label>Vị trí X <span class="range-display" id="posXValue">1416</span></label>
                        <input type="range" id="posX" min="0" max="11417" step="1" value="1416">
                    </div>
                    <div class="menu-input-group">
                        <label>Vị trí Y <span class="range-display" id="posYValue">7748</span></label>
                        <input type="range" id="posY" min="0" max="15264" step="1" value="7748">
                    </div>
                </div>
            </div>

            <!-- Vị trí dài -->
            <div class="menu-item" id="menuPositionLong">
                <i class='bx bx-chevron-down-circle'></i> Vị trí >13 ký tự
                <div class="dropdown-menu" id="dropdownLong">
                    <h4>VỊ TRÍ CHO CHỮ DÀI (>13 ký tự)</h4>
                    <div class="menu-input-group">
                        <label>Vị trí X <span class="range-display" id="longPosXValue">1912</span></label>
                        <input type="range" id="longPosX" min="0" max="11417" step="1" value="1912">
                    </div>
                    <div class="menu-input-group">
                        <label>Vị trí Y <span class="range-display" id="longPosYValue">7815</span></label>
                        <input type="range" id="longPosY" min="0" max="15264" step="1" value="7815">
                    </div>
                </div>
            </div>

            <div class="menu-divider"></div>

            <!-- Font -->
            <div class="menu-item" id="menuFont">
                <i class='bx bx-font'></i> Font chữ
                <div class="dropdown-menu" id="dropdownFont">
                    <h4>PHÔNG CHỮ</h4>
                    <div class="menu-input-group">
                        <label>Phông chữ</label>
                        <select id="fontFamily">
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Courier New', monospace">Courier New</option>
                            <option value="'Times New Roman', serif">Times New Roman</option>
                            <option value="'Impact', sans-serif">Impact</option>
                            <option value="'Georgia', serif">Georgia</option>
                            <option value="'Verdana', sans-serif">Verdana</option>
                            <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                        </select>
                    </div>
                    <div class="menu-input-group">
                        <label>Độ đậm chữ <span class="range-display" id="fontWeightValue">600</span></label>
                        <input type="range" id="fontWeight" min="400" max="900" step="100" value="600">
                    </div>
                </div>
            </div>

            <!-- Màu sắc -->
            <div class="menu-item" id="menuColors">
                <i class='bx bx-palette'></i> Màu sắc
                <div class="dropdown-menu" id="dropdownColors">
                    <h4>MÀU SẮC</h4>
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
                </div>
            </div>

            <div class="menu-divider"></div>

            <!-- Action buttons -->
            <div class="action-buttons">
                <button id="saveBtn">LƯU</button>
                <button id="exportBtn">XUẤT</button>
            </div>

            <div class="menu-divider"></div>

            <!-- User Section -->
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

        <!-- Main Content Area -->
        <div class="main-container">
            <div class="controls"></div>
            
            <!-- Preview -->
            <div class="product-preview">
                <img src="{{ asset('images/us-marines.jpg') }}" alt="Áo">

                <svg class="print-layer" viewBox="0 0 11417 15264" preserveAspectRatio="xMidYMid meet">
                    <rect
                        id="nameBg"
                        x="1416"
                        y="7748"
                        rx="25"
                        ry="25"
                        width="140"
                        height="31"
                        fill="#565559"
                        stroke="#dec27a"
                        stroke-width="12"
                    />

                    <text
                        id="printName"
                        y="8048"
                        fill="#dec27a"
                        font-size="16"
                        font-weight="600"
                        font-family="Arial, sans-serif"
                        letter-spacing="0.3"
                        dominant-baseline="middle"
                    ></text>
                </svg>
            </div>
        </div>
    </div>

    <!-- Auth Modal -->
    <div id="authModal" class="auth-modal">
        <div class="auth-modal-content">
            <span id="authModalClose"><i class='bx bx-x'></i></span>

            <!-- LOGIN -->
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

            <!-- REGISTER -->
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

    <!-- Toast Notification -->
    <div id="toast" class="toast">
        <span class="toast-icon"></span>
        <div class="toast-content">
            <div class="toast-message"></div>
        </div>
        <button class="toast-close">×</button>
        <div class="toast-progress"></div>
    </div>

    <!-- Confirm Dialog -->
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