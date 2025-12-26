<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DesignController;
use Illuminate\Support\Facades\Route;

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

// export files
Route::get('/{filename}', function ($filename) {
    $path = storage_path('app/public/exports/' . $filename);
    if (!file_exists($path)) abort(404);
    return response()->file($path);
})->name('export.file');

