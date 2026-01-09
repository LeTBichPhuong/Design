<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Design;

class DesignController extends Controller
{
    /**
     * Lưu thiết kế mới
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'         => 'nullable|string|max:255',
            'base_image'   => 'required|string',
            'config'       => 'required|array',
            'export_image' => 'nullable|string', // Nhận thumbnail
        ]);

        // Chuẩn hóa đường dẫn
        $baseImage = $data['base_image'];
        
        if (str_starts_with($baseImage, '/storage/')) {
            $baseImage = substr($baseImage, 1);
        }
        
        if (!str_starts_with($baseImage, 'storage/')) {
            $baseImage = 'storage/' . $baseImage;
        }

        // Chuẩn hóa export_image nếu có
        $exportImage = null;
        if (!empty($data['export_image'])) {
            $exportImage = $data['export_image'];
            if (str_starts_with($exportImage, '/storage/')) {
                $exportImage = substr($exportImage, 1);
            }
            if (!str_starts_with($exportImage, 'storage/')) {
                $exportImage = 'storage/' . $exportImage;
            }
        }

        if (Auth::check()) {
            $design = Design::create([
                'user_id'      => Auth::id(),
                'name'         => $data['name'] ?? 'Thiết kế ' . now()->format('H:i d/m'),
                'base_image'   => $baseImage,
                'config'       => $data['config'],
                'export_image' => $exportImage,
            ]);

            return response()->json([
                'message' => 'Đã lưu thiết kế',
                'design'  => $design,
            ]);
        }

        // Guest user
        $designs = session()->get('guest_designs', []);
        $designs[] = [
            'id'           => uniqid('guest_'),
            'name'         => $data['name'] ?? 'Thiết kế tạm',
            'base_image'   => $baseImage,
            'config'       => $data['config'],
            'export_image' => $exportImage,
            'created_at'   => now(),
        ];
        session(['guest_designs' => $designs]);

        return response()->json([
            'message' => 'Thiết kế tạm (sẽ mất khi reload)',
            'design'  => ['id' => end($designs)['id']],
        ]);
    }

    /**
     * Lấy danh sách thiết kế
     */
    public function index()
    {
        if (Auth::check()) {
            $designs = Design::where('user_id', Auth::id())
                ->latest()
                ->get();
            
            return response()->json($designs);
        }
        
        return response()->json(session()->get('guest_designs', []));
    }

    /**
     * Cập nhật thiết kế
     */
    public function update(Request $request, Design $design)
    {
        if (!Auth::check() || $design->user_id !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name'         => 'nullable|string|max:255',
            'base_image'   => 'required|string',
            'config'       => 'required|array',
            'export_image' => 'nullable|string',
        ]);

        // Chuẩn hóa đường dẫn
        $baseImage = $data['base_image'];
        if (str_starts_with($baseImage, '/storage/')) {
            $baseImage = substr($baseImage, 1);
        }
        if (!str_starts_with($baseImage, 'storage/')) {
            $baseImage = 'storage/' . $baseImage;
        }

        $exportImage = $design->export_image; // Giữ nguyên nếu không có mới
        if (isset($data['export_image'])) {
            $exportImage = $data['export_image'];
            if (str_starts_with($exportImage, '/storage/')) {
                $exportImage = substr($exportImage, 1);
            }
            if (!str_starts_with($exportImage, 'storage/')) {
                $exportImage = 'storage/' . $exportImage;
            }
        }

        $design->update([
            'name'         => $data['name'] ?? $design->name,
            'base_image'   => $baseImage,
            'config'       => $data['config'],
            'export_image' => $exportImage,
        ]);

        return response()->json([
            'message' => 'Đã cập nhật thiết kế',
            'design'  => $design,
        ]);
    }

    /**
     * Xoá thiết kế
     */
    public function destroy(Design $design)
    {
        if (!Auth::check() || $design->user_id !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Xóa ảnh export nếu có
        if ($design->export_image && file_exists(public_path($design->export_image))) {
            @unlink(public_path($design->export_image));
        }

        $design->delete();
        
        return response()->json(['success' => true]);
    }

    /**
     * Xuất ảnh PNG với tọa độ CENTER chính xác 100%
     */
    public function export($id)
    {
        set_time_limit(300);
        ini_set('memory_limit', '2048M');
        
        try {
            $design = Design::where('id', $id)
                ->when(Auth::check(), fn ($q) => $q->where('user_id', Auth::id()))
                ->firstOrFail();

            $cfg = $design->config;
            
            if (is_string($cfg)) {
                $cfg = json_decode($cfg, true);
            }

            $baseImage = $design->base_image;
            
            if (str_starts_with($baseImage, '/')) {
                $baseImage = substr($baseImage, 1);
            }
            
            $baseImagePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, public_path($baseImage));

            if (!file_exists($baseImagePath)) {
                throw new \Exception('Ảnh gốc không tồn tại');
            }

            $imageInfo = @getimagesize($baseImagePath);
            if ($imageInfo === false) {
                throw new \Exception('File không phải là ảnh hợp lệ');
            }

            $mime = $imageInfo['mime'];
            
            if ($mime === 'image/jpeg') {
                $image = @imagecreatefromjpeg($baseImagePath);
            } elseif ($mime === 'image/png') {
                $image = @imagecreatefrompng($baseImagePath);
            } elseif ($mime === 'image/gif') {
                $image = @imagecreatefromgif($baseImagePath);
            } else {
                $imageData = file_get_contents($baseImagePath);
                $image = @imagecreatefromstring($imageData);
            }

            if (!$image) {
                throw new \Exception('Không thể load ảnh');
            }

            imagealphablending($image, true);
            imagesavealpha($image, true);

            $imageWidth = imagesx($image);
            $imageHeight = imagesy($image);

            $text = $cfg['text'] ?? '';

            if (!empty($text)) {
                // FIX: Frontend gửi x,y là tọa độ CENTER
                $centerX = floatval($cfg['x'] ?? $imageWidth / 2);
                $centerY = floatval($cfg['y'] ?? $imageHeight / 2);
                $patchWidth = floatval($cfg['patchWidth'] ?? 400);
                $patchHeight = floatval($cfg['patchHeight'] ?? 100);
                
                // Tính vị trí góc patch từ CENTER (ĐÚNG)
                $patchX = $centerX - $patchWidth / 2;
                $patchY = $centerY - $patchHeight / 2;

                $fontFamily = $cfg['fontFamily'] ?? 'Arial';
                $fontSize = floatval($cfg['fontSize'] ?? 80);
                $fontWeight = $cfg['fontWeight'] ?? 'normal';
                $fontStyle = $cfg['fontStyle'] ?? 'normal';
                $textDecoration = $cfg['textDecoration'] ?? 'none';

                $fontPath = $this->findFontFile($fontFamily, $fontWeight, $fontStyle);

                if (!$fontPath || !file_exists($fontPath)) {
                    $fontPath = $this->getFallbackFont();
                }
                
                $bgRgb = $this->hexToRgb($cfg['bgColor'] ?? '#000000');
                $bgColor = imagecolorallocate($image, $bgRgb['r'], $bgRgb['g'], $bgRgb['b']);
                
                imagefilledrectangle($image, 
                    round($patchX), 
                    round($patchY), 
                    round($patchX + $patchWidth), 
                    round($patchY + $patchHeight), 
                    $bgColor
                );

                if (!empty($cfg['strokeColor'])) {
                    $strokeRgb = $this->hexToRgb($cfg['strokeColor']);
                    $strokeColor = imagecolorallocate($image, $strokeRgb['r'], $strokeRgb['g'], $strokeRgb['b']);
                    
                    $strokeWidth = max(2, round(12 * ($imageWidth / 11417)));
                    imagesetthickness($image, $strokeWidth);
                    
                    imagerectangle($image, 
                        round($patchX), 
                        round($patchY), 
                        round($patchX + $patchWidth), 
                        round($patchY + $patchHeight), 
                        $strokeColor
                    );
                }

                $textRgb = $this->hexToRgb($cfg['textColor'] ?? '#ffffff');
                $textColor = imagecolorallocate($image, $textRgb['r'], $textRgb['g'], $textRgb['b']);
                
                $lines = explode("\n", strtoupper($text));
                $lineHeight = $fontSize * 1.15;
                
                // FIX: Tính tổng chiều cao bao gồm LINE SPACING
                $lineBBoxes = [];
                foreach ($lines as $line) {
                    if (empty($line)) continue;
                    $bbox = imagettfbbox($fontSize, 0, $fontPath, $line);
                    if ($bbox !== false) {
                        $lineBBoxes[] = $bbox;
                    }
                }
                
                // Tổng chiều cao = (số dòng - 1) * lineHeight
                $totalTextHeight = (count($lineBBoxes) - 1) * $lineHeight;
                
                // Y bắt đầu từ CENTER - nửa tổng chiều cao
                $currentY = $centerY - $totalTextHeight / 2;
                
                foreach ($lines as $i => $line) {
                    if (empty($line)) continue;
                    
                    $bbox = $lineBBoxes[$i] ?? null;
                    if (!$bbox) continue;
                    
                    $lineWidth = $bbox[4] - $bbox[0];
                    $textX = round($centerX - $lineWidth / 2);
                    
                    // Y cho baseline của dòng hiện tại
                    $textY = round($currentY - $bbox[7]);
                    
                    imagettftext($image, $fontSize, 0, $textX, $textY, $textColor, $fontPath, $line);
                    
                    // VẼ GẠCH CHÂN NẾU CẦN
                    if ($textDecoration === 'underline') {
                        $underlineY = $textY + 5; // Cách baseline 5px
                        $underlineThickness = max(2, round($fontSize / 20));
                        imagesetthickness($image, $underlineThickness);
                        imageline($image, $textX, $underlineY, $textX + $lineWidth, $underlineY, $textColor);
                        imagesetthickness($image, 1); // Reset
                    }
                    
                    // Di chuyển xuống dòng tiếp theo
                    $currentY += $lineHeight;
                }
            }

            $timestamp = now()->format('Ymd_His');
            $cleanName = $this->sanitizeFilenameVietnamese($text);
            
            if (!empty($cleanName)) {
                $filename = $cleanName . '_' . $timestamp . '.png';
            } else {
                $filename = 'design_' . $timestamp . '.png';
            }
            
            $exportPath = 'storage/exports/' . $filename;
            $fullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, public_path($exportPath));

            $exportDir = dirname($fullPath);
            if (!file_exists($exportDir)) {
                mkdir($exportDir, 0755, true);
            }

            $saved = imagepng($image, $fullPath, 9);
            if (!$saved) {
                throw new \Exception('Không thể lưu PNG');
            }

            imagedestroy($image);

            if ($design->export_image && file_exists(public_path($design->export_image))) {
                @unlink(public_path($design->export_image));
            }

            $design->update(['export_image' => $exportPath]);

            $downloadUrl = url('/exports/' . $filename);

            return response()->json([
                'success' => true,
                'message' => 'Xuất ảnh thành công',
                'url' => $downloadUrl,
                'filename' => $filename,
                'path' => $exportPath
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Xuất ảnh thất bại: ' . $e->getMessage()
            ], 500);
        }
    }

    private function findFontFile($fontFamily, $fontWeight = 'normal')
    {
        $fontFamily = trim($fontFamily);
        $fontFamily = str_replace(["'", '"'], '', $fontFamily);
        $fontFamily = strtolower($fontFamily);
        
        $fontMap = [
            'arial' => [
                'normal' => 'arial.ttf',
                'bold' => 'arialbd.ttf',
                'italic' => 'ariali.ttf',
                'bold-italic' => 'arialbi.ttf',
            ],
            'times new roman' => [
                'normal' => 'timesnewroman.ttf',
                'bold' => 'timesnewromanbd.ttf',
            ],
            'courier new' => [
                'normal' => 'couriernew.ttf',
                'bold' => 'couriernewbd.ttf',
            ],
            'verdana' => [
                'normal' => 'verdana.ttf',
                'bold' => 'verdanab.ttf',
            ],
            'georgia' => [
                'normal' => 'georgia.ttf',
                'bold' => 'georgiab.ttf',
            ],
            'trebuchet ms' => [
                'normal' => 'trebuchetms.ttf',
                'bold' => 'trebuchetmsbd.ttf',
            ],
            'impact' => [
                'normal' => 'impact.ttf',
            ],
        ];
        
        // Xác định style key (bold, italic, bold-italic)
        $styleKey = 'normal';
        if ($fontWeight === 'bold') {
            $styleKey = 'bold';
        }
        
        // Tìm font trong map
        foreach ($fontMap as $name => $styles) {
            if (strpos($fontFamily, $name) !== false || $fontFamily === $name) {
                // Lấy file tương ứng với weight, fallback về normal nếu không có
                $filename = $styles[$styleKey] ?? $styles['normal'];
                
                $path = public_path('fonts/' . $filename);
                if (file_exists($path)) {
                    return $path;
                }
            }
        }
        
        // Fallback về Arial nếu không tìm thấy
        return $this->getFallbackFont();
    }

    private function getFallbackFont()
    {
        $fallbackFonts = [
            public_path('fonts/arial.ttf'),
            public_path('fonts/verdana.ttf'),
            public_path('fonts/georgia.ttf'),
            public_path('fonts/timesnewroman.ttf'),
        ];
        
        foreach ($fallbackFonts as $fallback) {
            if (file_exists($fallback)) {
                return $fallback;
            }
        }
        
        throw new \Exception('Không tìm thấy font trong thư mục public/fonts/');
    }

    // xử lý tiếng việt
    private function sanitizeFilenameVietnamese($text)
    {
        if (empty($text)) {
            return '';
        }
        
        // === FIX: Chuyển về không dấu an toàn ===
        $text = mb_convert_case($text, MB_CASE_TITLE, 'UTF-8');
        
        // Bảng chuyển đổi tiếng Việt -> Latin
        $vietnamese = [
            'á' => 'a', 'à' => 'a', 'ả' => 'a', 'ã' => 'a', 'ạ' => 'a',
            'ă' => 'a', 'ắ' => 'a', 'ằ' => 'a', 'ẳ' => 'a', 'ẵ' => 'a', 'ặ' => 'a',
            'â' => 'a', 'ấ' => 'a', 'ầ' => 'a', 'ẩ' => 'a', 'ẫ' => 'a', 'ậ' => 'a',
            'đ' => 'd',
            'é' => 'e', 'è' => 'e', 'ẻ' => 'e', 'ẽ' => 'e', 'ẹ' => 'e',
            'ê' => 'e', 'ế' => 'e', 'ề' => 'e', 'ể' => 'e', 'ễ' => 'e', 'ệ' => 'e',
            'í' => 'i', 'ì' => 'i', 'ỉ' => 'i', 'ĩ' => 'i', 'ị' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ỏ' => 'o', 'õ' => 'o', 'ọ' => 'o',
            'ô' => 'o', 'ố' => 'o', 'ồ' => 'o', 'ổ' => 'o', 'ỗ' => 'o', 'ộ' => 'o',
            'ơ' => 'o', 'ớ' => 'o', 'ờ' => 'o', 'ở' => 'o', 'ỡ' => 'o', 'ợ' => 'o',
            'ú' => 'u', 'ù' => 'u', 'ủ' => 'u', 'ũ' => 'u', 'ụ' => 'u',
            'ư' => 'u', 'ứ' => 'u', 'ừ' => 'u', 'ử' => 'u', 'ữ' => 'u', 'ự' => 'u',
            'ý' => 'y', 'ỳ' => 'y', 'ỷ' => 'y', 'ỹ' => 'y', 'ỵ' => 'y',
        ];
        
        $text = mb_strtolower($text, 'UTF-8');
        $text = strtr($text, $vietnamese);
        
        // Chỉ giữ chữ, số, gạch ngang
        $text = preg_replace('/[^a-z0-9]+/', '-', $text);
        $text = preg_replace('/-+/', '-', $text);
        $text = trim($text, '-');
        
        if (mb_strlen($text, 'UTF-8') > 50) {
            $text = mb_substr($text, 0, 50, 'UTF-8');
            $text = rtrim($text, '-');
        }
        
        return $text;
    }

    private function hexToRgb($hex)
    {
        $hex = ltrim($hex, '#');
        
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        
        return [
            'r' => hexdec(substr($hex, 0, 2)),
            'g' => hexdec(substr($hex, 2, 2)),
            'b' => hexdec(substr($hex, 4, 2))
        ];
    }
}