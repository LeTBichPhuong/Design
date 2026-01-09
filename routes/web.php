<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DesignController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('Home');
})->name('home');

// Auth
Route::post('/api/register', [AuthController::class, 'register'])->name('register');
Route::post('/api/login', [AuthController::class, 'login'])->name('login');
Route::post('/api/logout', [AuthController::class, 'logout'])->name('logout');

// profile
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
});

// designs
Route::get('/designs', [DesignController::class, 'index']);
Route::post('/designs', [DesignController::class, 'store']);
Route::delete('/designs/{design}', [DesignController::class, 'destroy']);
Route::put('/designs/{design}', [DesignController::class, 'update']);
Route::post('/designs/{design}/export', [DesignController::class, 'export']);

// Route để serve ảnh từ storage/designs
Route::get('/designs/{filename}', function ($filename) {
    // Kiểm tra định dạng file hợp lệ
    if (!preg_match('/^[\w\-\.]+\.(png|jpg|jpeg|gif)$/i', $filename)) {
        abort(404);
    }
    
    // Đường dẫn đến file trong public/storage/designs
    $path = public_path('storage/designs/' . $filename);
    
    if (!file_exists($path)) {
        \Log::warning('Design image not found', ['path' => $path]);
        abort(404);
    }
    
    return response()->file($path, [
        'Content-Type' => mime_content_type($path),
        'Cache-Control' => 'public, max-age=86400'
    ]);
})->where('filename', '.*\.(png|jpg|jpeg|gif)$')->name('design.file');

// image upload
Route::post('/upload-image', function (Illuminate\Http\Request $request) {
    $request->validate([
        'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:10240'
    ]);

    if ($request->hasFile('image')) {
        $image = $request->file('image');
        
        // Tạo tên file unique
        $filename = uniqid() . '_' . time() . '.' . $image->getClientOriginalExtension();
        
        // Lưu vào storage/app/public/designs
        $path = $image->storeAs('designs', $filename, 'public');
        
        // Trả về đường dẫn đầy đủ
        return response()->json([
            'success' => true,
            'path' => 'storage/' . $path,
            'url' => asset('storage/' . $path),
            'filename' => $filename
        ]);
    }

    return response()->json([
        'success' => false,
        'message' => 'No image uploaded'
    ], 400);
});

// Export
Route::get('/exports/{filename}', function ($filename) {
    // Chỉ cho phép filename hợp lệ
    if (!preg_match('/^[\w\-\.]+\.png$/i', $filename)) {
        abort(404);
    }
    
    $path = public_path('storage/exports/' . $filename);
    
    if (!file_exists($path)) {
        \Log::warning('Export image not found', ['path' => $path]);
        abort(404);
    }
    
    return response()->file($path, [
        'Content-Type' => 'image/png',
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->name('export.short');