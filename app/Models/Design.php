<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Design extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'base_image',
        'config',
        'export_image',
    ];

    protected $casts = [
        'config' => 'array',
    ];

    /**
     * Relationship với User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Accessor để lấy URL đầy đủ của base image
     * Tự động phân biệt giữa ảnh upload và ảnh mặc định
     */
    public function getBaseImageUrlAttribute()
    {
        if (str_starts_with($this->base_image, 'designs/')) {
            // Ảnh đã upload - từ storage
            return \Storage::url($this->base_image);
        } else {
            // Ảnh mặc định - từ public/images
            return asset('images/' . $this->base_image);
        }
    }
}