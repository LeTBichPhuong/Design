<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DesignController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

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

// Upload font custom lên storage
Route::post('/upload-font', function (Illuminate\Http\Request $request) {
    try {
        // Validation với MIME types đầy đủ
        $validator = Validator::make($request->all(), [
            'font' => [
                'required',
                'file',
                'max:10240', // max 10MB
                function ($attribute, $value, $fail) {
                    $validExtensions = ['ttf', 'otf', 'woff', 'woff2'];
                    $extension = strtolower($value->getClientOriginalExtension());
                    
                    if (!in_array($extension, $validExtensions)) {
                        $fail('Font phải có định dạng: ttf, otf, woff, woff2');
                    }
                    
                    // Kiểm tra MIME type
                    $validMimes = [
                        'font/ttf',
                        'font/otf', 
                        'font/woff',
                        'font/woff2',
                        'application/font-sfnt',
                        'application/font-woff',
                        'application/font-woff2',
                        'application/x-font-ttf',
                        'application/x-font-otf',
                        'application/octet-stream' // Một số font có MIME này
                    ];
                    
                    $mime = $value->getMimeType();
                    if (!in_array($mime, $validMimes)) {
                        \Log::warning('Font MIME type not in whitelist', [
                            'mime' => $mime,
                            'extension' => $extension
                        ]);
                        // Cho phép nếu extension đúng
                    }
                }
            ]
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        $file = $request->file('font');
        $originalName = $file->getClientOriginalName();
        
        // Tạo tên file unique nhưng giữ tên gốc để dễ map
        $filename = uniqid() . '_' . time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
        $path = $file->storeAs('fonts', $filename, 'public');
        
        // Copy sang public/fonts để PHP GD có thể dùng
        $publicFontPath = public_path('fonts/' . $filename);
        $storageFontPath = storage_path('app/public/' . $path);
        
        if (!file_exists(public_path('fonts'))) {
            mkdir(public_path('fonts'), 0755, true);
        }
        
        copy($storageFontPath, $publicFontPath);

        return response()->json([
            'success' => true,
            'url' => asset('storage/' . $path),
            'name' => $originalName,
            'serverFileName' => $filename
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Upload font error: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Lỗi server: ' . $e->getMessage()
        ], 500);
    }
})->name('upload.font');
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