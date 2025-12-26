<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function edit()
    {
        return view('profile');
    }

    public function update(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . Auth::id(),
            'password' => 'nullable|confirmed|min:8',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = Auth::user();

        // Kiểm tra user hợp lệ
        if (!$user) {
            if ($request->ajax() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Người dùng không tìm thấy'
                ], 404);
            }
            return back()->with('error', 'Người dùng không tìm thấy hoặc không hợp lệ.');
        }

        $user->name = $request->name;
        $user->email = $request->email;

        // Cập nhật password nếu có
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        // Cập nhật avatar nếu có
        if ($request->hasFile('avatar')) {
            // Xóa avatar cũ nếu có
            if ($user->avatar && Storage::disk('public')->exists('avatars/' . $user->avatar)) {
                Storage::disk('public')->delete('avatars/' . $user->avatar);
            }
            
            // Lưu avatar mới
            $filename = time() . '.' . $request->avatar->extension();
            $request->avatar->storeAs('avatars', $filename, 'public');
            $user->avatar = $filename;
        }

        $user->save();

        // Nếu là AJAX request (từ JavaScript khi upload avatar)
        if ($request->ajax() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Cập nhật thành công!',
                'avatar_url' => $user->avatar ? asset('storage/avatars/' . $user->avatar) : asset('default-avatar.png')
            ]);
        }

        // Response thông thường khi submit form
        return back()->with('success', 'Cập nhật hồ sơ thành công!');
    }
}