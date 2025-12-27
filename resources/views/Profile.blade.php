<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Hồ sơ tài khoản</title>
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    <link rel="stylesheet" href="{{ asset('profile.css') }}">
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="user-header">
                <img src="{{ asset('storage/avatars/' . Auth::user()->avatar) }}" onerror="this.src='{{ asset('images/placeholder.png') }}'" alt="Avatar" class="user-avatar">
                <div class="user-name">{{ auth()->user()->name }}</div>
                <div class="user-email">{{ auth()->user()->email }}</div>
                <a href="{{ route('home') }}" class="back-home">
                    <i class='bx bx-left-arrow-alt'></i>
                    <span>Quay về trang chủ</span>
                </a>
            </div>

            <div class="sidebar-menu">
                <a href="#" class="menu-item active" data-tab="profile">
                    <i class='bx bx-user'></i>
                    <span>Thông tin của bạn</span>
                </a>
                <a href="#" class="menu-item" data-tab="history">
                    <i class='bx bxs-file-image'></i>
                    <span>Lịch sử thiết kế</span>
                </a>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Profile Tab -->
            <div class="tab-content active" id="profileTab">
                <div class="content-header">
                    <h1>Thông tin của bạn</h1>
                </div>

                @if(session('success'))
                    <div class="alert alert-success">
                        {{ session('success') }}
                    </div>
                @endif

                @if($errors->any())
                    <div class="alert alert-error">
                        {{ $errors->first() }}
                    </div>
                @endif

                <form id="profileForm" action="{{ route('profile.update') }}" method="POST" enctype="multipart/form-data">
                    @csrf
                    @method('PATCH')

                    <!-- Avatar Card -->
                    <div class="profile-card">
                        <div class="avatar-section">
                            <div class="avatar-upload">
                                <img src="{{ auth()->user()->avatar ? asset('storage/avatars/' . auth()->user()->avatar) : asset('avatar.jpg') }}" 
                                     alt="Avatar" 
                                     class="profile-avatar"
                                     id="avatarPreview"
                                     onclick="document.getElementById('avatarInput').click()">
                                <input type="file" id="avatarInput" name="avatar" accept="image/*">
                            </div>
                            <div class="avatar-info">
                                <p>Hãy cá nhân hóa tài khoản của bạn bằng một bức ảnh. Ảnh hồ sơ của bạn sẽ xuất hiện trên các ứng dụng và thiết bị của bạn.</p>
                                <button type="button" class="btn-change-avatar" onclick="document.getElementById('avatarInput').click()">
                                    Thay đổi ảnh
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Info Card -->
                    <div class="profile-card">
                        <div class="info-section">
                            <div class="info-header">
                                <h2>Thông tin hồ sơ</h2>
                                <button type="button" class="btn-edit-info" id="btnEdit">
                                    Chỉnh sửa thông tin hồ sơ
                                </button>
                            </div>

                            <div class="info-row">
                                <div class="info-label">Họ và tên</div>
                                <div class="info-value">
                                    <input type="text" name="name" id="name" value="{{ old('name', auth()->user()->name) }}" disabled>
                                    <i class='bx bx-chevron-right'></i>
                                </div>
                            </div>

                            <div class="info-row">
                                <div class="info-label">Email</div>
                                <div class="info-value">
                                    <input type="email" name="email" id="email" value="{{ old('email', auth()->user()->email) }}" disabled>
                                </div>
                            </div>

                            <div id="editSection" style="display: none;">
                                <div class="info-row">
                                    <div class="info-label">Mật khẩu mới</div>
                                    <div class="info-value">
                                        <input type="password" name="password" id="password" placeholder="Để trống nếu không đổi">
                                    </div>
                                </div>

                                <div class="info-row">
                                    <div class="info-label">Xác nhận mật khẩu</div>
                                    <div class="info-value">
                                        <input type="password" name="password_confirmation" id="password_confirmation" placeholder="Nhập lại mật khẩu mới">
                                    </div>
                                </div>

                                <div class="button-group">
                                    <button type="submit" class="btn-save">Lưu</button>
                                    <button type="button" class="btn-cancel" id="btnCancel">Hủy</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Design History Tab -->
            <div class="tab-content" id="historyTab">
                <div class="content-header">
                    <h1>Lịch sử thiết kế</h1>
                    <p style="color: #666; font-size: 14px;">Quản lý và xem lại tất cả các thiết kế của bạn</p>
                </div>

                <!-- Stats -->
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-value" id="totalDesigns">0</div>
                        <div class="stat-label">
                            <i class='bx bx-file'></i> Tổng số thiết kế
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="recentDesigns">0</div>
                        <div class="stat-label">
                            <i class='bx bx-time'></i> Thiết kế gần đây (7 ngày)
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="todayDesigns">0</div>
                        <div class="stat-label">
                            <i class='bx bx-calendar'></i> Thiết kế hôm nay
                        </div>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="toolbar">
                    <div class="search-box">
                        <input type="text" id="searchInput" placeholder="Tìm kiếm thiết kế...">
                        <i class='bx bx-search'></i>
                    </div>

                    <div class="filter-group">
                        <select id="sortSelect" class="filter-btn">
                            <option value="newest">Mới nhất</option>
                            <option value="oldest">Cũ nhất</option>
                            <option value="name">Tên A-Z</option>
                            <option value="name_desc">Tên Z-A</option>
                        </select>

                        <button class="filter-btn active" id="filterAll" data-filter="all">
                            <i class='bx bx-list-ul'></i> Tất cả
                        </button>
                        <button class="filter-btn" id="filterToday" data-filter="today">
                            <i class='bx bx-calendar'></i> Hôm nay
                        </button>
                        <button class="filter-btn" id="filterWeek" data-filter="week">
                            <i class='bx bx-time'></i> 7 ngày
                        </button>
                    </div>

                    <div class="view-toggle">
                        <button class="view-btn active" data-view="grid">
                            <i class='bx bx-grid-alt'></i>
                        </button>
                        <button class="view-btn" data-view="list">
                            <i class='bx bx-list-ul'></i>
                        </button>
                    </div>
                </div>

                <!-- Designs Grid -->
                <div class="designs-grid" id="designsGrid">
                    <div class="empty-designs">
                        <i class='bx bx-image'></i>
                        <h3>Chưa có thiết kế nào</h3>
                        <p>Bắt đầu tạo thiết kế đầu tiên của bạn ngay bây giờ</p>
                        <a href="{{ route('home') }}" class="btn-create-new">
                            <i class='bx bx-plus'></i> Tạo thiết kế mới
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirm Delete Modal -->
    <div id="confirmModal" class="confirm-overlay hidden">
        <div class="confirm-box">
            <h3>Xác nhận</h3>
            <p>Bạn có chắc chắn muốn xóa thiết kế này?</p>
            <div class="confirm-actions">
                <button id="confirmCancel" class="btn-cancel">Hủy</button>
                <button id="confirmOk" class="btn-ok">Xóa</button>
            </div>
        </div>
    </div>
    
    <!-- Preview Modal -->
    <div id="modalPreview" class="modal-preview">
        <div class="modal-content">
            <span class="modal-close" onclick="document.getElementById('modalPreview').classList.remove('show')">&times;</span>
            <h3 id="modalTitle"></h3>
            <img id="modalImage" src="" alt="Preview">
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toastContainer" class="toast-container"></div>

    <script>
        window.storageUrl = "{{ asset('storage') }}";
    </script>
    <script src="{{ asset('js/profile.js') }}"></script>
</body>
</html>