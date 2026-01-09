<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        'api/*',  // Tắt CSRF cho tất cả route API
    ];
    public function boot()
    {
        ini_set('upload_max_filesize', '50M');
        ini_set('post_max_size', '60M');
    }
}