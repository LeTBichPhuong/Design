<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('designs', function (Blueprint $table) {
            $table->id();

            // User tạo thiết kế (NULL nếu guest)
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained()
                  ->nullOnDelete();

            // Tên thiết kế
            $table->string('name');

            // Ảnh áo gốc
            $table->string('base_image');

            // JSON toàn bộ cấu hình thiết kế (SVG + patch + text)
            $table->json('config');

            // Ảnh xuất in xưởng
            $table->string('export_image')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('designs');
    }
};
