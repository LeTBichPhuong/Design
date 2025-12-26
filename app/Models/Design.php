<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property string $base_image
 * @property array<array-key, mixed> $config
 * @property string|null $export_image
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design whereBaseImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design whereConfig($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design whereExportImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Design whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Design extends Model
{
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

}

