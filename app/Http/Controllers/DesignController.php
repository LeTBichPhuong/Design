<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Design;

class DesignController extends Controller
{
    /**
     * Lưu thiết kế
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'       => 'nullable|string|max:255',
            'base_image' => 'required|string',
            'config'     => 'required|array',
        ]);

        if (Auth::check()) {
            $design = Design::create([
                'user_id'    => Auth::id(),
                'name'       => $data['name'] ?? 'Thiết kế ' . now()->format('H:i d/m'),
                'base_image' => $data['base_image'],
                'config'     => $data['config'],
            ]);

            return response()->json([
                'message' => 'Đã lưu thiết kế',
                'design'  => $design,
            ]);
        }

        $designs = session()->get('guest_designs', []);
        $designs[] = [
            'id'         => uniqid('guest_'),
            'name'       => $data['name'] ?? 'Thiết kế tạm',
            'base_image' => $data['base_image'],
            'config'     => $data['config'],
            'created_at' => now(),
        ];
        session(['guest_designs' => $designs]);

        return response()->json([
            'message' => 'Thiết kế tạm (sẽ mất khi reload)',
            'designs' => $designs,
        ]);
    }

    // Lấy danh sách thiết kế
    public function index()
    {
        if (Auth::check()) {
            return response()->json(
                Design::where('user_id', Auth::id())->latest()->get()
            );
        }
        return response()->json(session()->get('guest_designs', []));
    }

    // Xoá thiết kế
    public function destroy(Design $design)
    {
        if (!Auth::check() || $design->user_id !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($design->export_image && \Storage::disk('public')->exists($design->export_image)) {
            \Storage::disk('public')->delete($design->export_image);
        }

        $design->delete();
        return response()->json(['success' => true]);
    }

    // Cập nhật thiết kế
    public function update(Request $request, Design $design)
    {
        if (!Auth::check() || $design->user_id !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name'       => 'nullable|string|max:255',
            'base_image' => 'required|string',
            'config'     => 'required|array',
        ]);

        $design->update([
            'name'       => $data['name'] ?? $design->name,
            'base_image' => $data['base_image'],
            'config'     => $data['config'],
        ]);

        return response()->json([
            'message' => 'Đã cập nhật thiết kế',
            'design'  => $design,
        ]);
    }

    /**
     * Tìm font - Simple version
     */
    private function findFontFile($fontFamily)
    {
        $fontFamily = trim($fontFamily);
        
        // Danh sách fonts có sẵn trong thư mục của bạn
        $availableFonts = [
            'Arial' => 'arial.ttf',
            'Courier New' => 'couriernew.ttf',
            'Georgia' => 'georgia.ttf',
            'Impact' => 'impact.ttf',
            'Times New Roman' => 'timesnewroman.ttf',
            'Trebuchet MS' => 'trebuchetms.ttf',
            'Verdana' => 'verdana.ttf',
        ];
        
        // Tìm font (case-insensitive)
        foreach ($availableFonts as $name => $file) {
            if (strcasecmp($name, $fontFamily) === 0) {
                $path = public_path('fonts/' . $file);
                if (file_exists($path)) {
                    \Log::info('Font found', ['font' => $name, 'file' => $file]);
                    return $path;
                }
            }
        }
        
        // Fallback
        \Log::warning('Font not found, using Arial', ['requested' => $fontFamily]);
        $fallback = public_path('fonts/arial.ttf');
        return file_exists($fallback) ? $fallback : null;
    }

    /**
     * Liệt kê tất cả fonts có sẵn trên server
     */
    public function listAvailableFonts()
    {
        $fontsDir = public_path('fonts/');
        $fonts = [];
        
        if (is_dir($fontsDir)) {
            $files = glob($fontsDir . '*.{ttf,TTF,otf,OTF}', GLOB_BRACE);
            
            foreach ($files as $file) {
                $fonts[] = [
                    'name' => basename($file),
                    'path' => $file,
                    'size' => round(filesize($file) / 1024, 2) . ' KB',
                    'readable' => is_readable($file)
                ];
            }
        }
        
        return response()->json([
            'success' => true,
            'fonts_dir' => $fontsDir,
            'fonts_dir_exists' => is_dir($fontsDir),
            'fonts' => $fonts,
            'count' => count($fonts)
        ]);
    }

    /**
     * Xuất ảnh - Fixed version
     */
    public function export($id)
    {
        set_time_limit(300);
        ini_set('memory_limit', '2048M');
        
        \Log::info('=== EXPORT START ===', ['design_id' => $id]);
        
        try {
            $design = Design::where('id', $id)
                ->when(Auth::check(), fn ($q) => $q->where('user_id', Auth::id()))
                ->firstOrFail();

            $cfg = $design->config;
            
            if (is_string($cfg)) {
                $cfg = json_decode($cfg, true);
            }

            $baseImagePath = public_path('images/' . $design->base_image);
            if (!file_exists($baseImagePath)) {
                throw new \Exception('Ảnh gốc không tồn tại: ' . $baseImagePath);
            }

            $ext = strtolower(pathinfo($baseImagePath, PATHINFO_EXTENSION));
            if ($ext === 'jpg' || $ext === 'jpeg') {
                $image = @imagecreatefromjpeg($baseImagePath);
            } elseif ($ext === 'png') {
                $image = @imagecreatefrompng($baseImagePath);
            } else {
                throw new \Exception('Định dạng không hỗ trợ: ' . $ext);
            }

            if (!$image) {
                throw new \Exception('Không thể load ảnh từ: ' . $baseImagePath);
            }

            \Log::info('Image loaded', ['width' => imagesx($image), 'height' => imagesy($image)]);

            $textOriginal = $cfg['text'] ?? '';
            $text = mb_strtoupper($textOriginal, 'UTF-8');

            if (!empty($text)) {
                $SHORT_LIMIT = 13;
                $MAX_PER_LINE = 20;
                $PADDING_X = 60;
                $PADDING_Y = 30;
                $BASE_FONT_SIZE = 160;
                $MIN_FONT_SIZE = 110;
                $MAX_PATCH_WIDTH = 1800;
                
                $length = mb_strlen($text, 'UTF-8');
                $isShort = $length <= $SHORT_LIMIT;
                
                $baseX = $isShort 
                    ? floatval($cfg['centerX_short'] ?? 1416) 
                    : floatval($cfg['centerX_long'] ?? 1416);
                $baseY = $isShort 
                    ? floatval($cfg['topY_short'] ?? 7748) 
                    : floatval($cfg['topY_long'] ?? 7748);
                
                \Log::info('Position values', [
                    'isShort' => $isShort,
                    'length' => $length,
                    'baseX' => $baseX,
                    'baseY' => $baseY
                ]);
                
                // ===== FIX FONT: Lấy từ config và log =====
                $fontFamily = $cfg['fontFamily'] ?? 'Arial';
                $fontWeight = intval($cfg['fontWeight'] ?? 600);
                
                \Log::info('Font from config', [
                    'fontFamily' => $fontFamily,
                    'fontWeight' => $fontWeight,
                    'full_config' => $cfg
                ]);
                
                $fontPath = $this->findFontFile($fontFamily);
                
                if (!$fontPath || !file_exists($fontPath)) {
                    \Log::warning('Font not found, trying fallbacks', [
                        'requested' => $fontFamily
                    ]);
                    
                    $fallbackFonts = [
                        public_path('fonts/Arial.ttf'),
                        public_path('fonts/arial.ttf'),
                        public_path('fonts/DejaVuSans.ttf'),
                        public_path('fonts/Roboto-Regular.ttf'),
                        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
                    ];
                    
                    foreach ($fallbackFonts as $fallback) {
                        if (file_exists($fallback)) {
                            $fontPath = $fallback;
                            \Log::info('Using fallback font', ['path' => $fontPath]);
                            break;
                        }
                    }
                    
                    if (!$fontPath || !file_exists($fontPath)) {
                        throw new \Exception('Không tìm thấy font hỗ trợ tiếng Việt.');
                    }
                }

                \Log::info('Final font path', ['path' => $fontPath]);
                
                $lines = [];
                for ($i = 0; $i < $length; $i += $MAX_PER_LINE) {
                    $lines[] = mb_substr($text, $i, $MAX_PER_LINE, 'UTF-8');
                }
                
                $fontSize = $BASE_FONT_SIZE;
                
                do {
                    $maxLineWidth = 0;
                    foreach ($lines as $line) {
                        $bbox = imagettfbbox($fontSize, 0, $fontPath, $line);
                        if ($bbox !== false) {
                            $lineWidth = $bbox[4] - $bbox[0];
                            $maxLineWidth = max($maxLineWidth, $lineWidth);
                        }
                    }
                    
                    $neededWidth = $maxLineWidth + $PADDING_X * 2;
                    
                    if ($neededWidth <= $MAX_PATCH_WIDTH || $fontSize <= $MIN_FONT_SIZE) {
                        break;
                    }
                    
                    $fontSize--;
                } while ($fontSize > $MIN_FONT_SIZE);
                
                \Log::info('Font size calculated', ['fontSize' => $fontSize]);
                
                $tempBbox = imagettfbbox($fontSize, 0, $fontPath, implode("\n", $lines));
                if ($tempBbox === false) {
                    throw new \Exception('Không thể tính toán kích thước text');
                }
                
                $textWidth = $tempBbox[4] - $tempBbox[0];
                $lineHeight = $fontSize * 1.15;
                $totalTextHeight = (count($lines) - 1) * $lineHeight + abs($tempBbox[7]) + abs($tempBbox[1]);
                
                $patchWidth = $textWidth + $PADDING_X * 2;
                $patchHeight = $totalTextHeight + $PADDING_Y * 2;
                $patchX = $baseX - $patchWidth / 2;
                $patchY = $baseY;
                
                \Log::info('Patch dimensions', [
                    'patchX' => $patchX,
                    'patchY' => $patchY,
                    'patchWidth' => $patchWidth,
                    'patchHeight' => $patchHeight
                ]);

                // Vẽ background
                $bgRgb = $this->hexToRgb($cfg['bgColor'] ?? '#565559');
                $bgColor = imagecolorallocate($image, $bgRgb['r'], $bgRgb['g'], $bgRgb['b']);
                imagefilledrectangle($image, 
                    round($patchX), 
                    round($patchY), 
                    round($patchX + $patchWidth), 
                    round($patchY + $patchHeight), 
                    $bgColor
                );

                // Vẽ stroke
                if (!empty($cfg['strokeColor'])) {
                    $strokeRgb = $this->hexToRgb($cfg['strokeColor']);
                    $strokeColor = imagecolorallocate($image, $strokeRgb['r'], $strokeRgb['g'], $strokeRgb['b']);
                    imagesetthickness($image, 12);
                    imagerectangle($image, 
                        round($patchX), 
                        round($patchY), 
                        round($patchX + $patchWidth), 
                        round($patchY + $patchHeight), 
                        $strokeColor
                    );
                }

                // Vẽ text multi-line
                $textRgb = $this->hexToRgb($cfg['textColor'] ?? '#dec27a');
                $textColor = imagecolorallocate($image, $textRgb['r'], $textRgb['g'], $textRgb['b']);
                
                $firstLineBbox = imagettfbbox($fontSize, 0, $fontPath, $lines[0]);
                $textY = $patchY + $PADDING_Y - $firstLineBbox[7];
                
                foreach ($lines as $i => $line) {
                    if (empty($line)) continue;
                    
                    $lineBbox = imagettfbbox($fontSize, 0, $fontPath, $line);
                    $lineWidth = $lineBbox[4] - $lineBbox[0];
                    $textX = round($baseX - $lineWidth / 2);
                    $currentY = round($textY + ($i * $lineHeight));
                    
                    imagettftext($image, $fontSize, 0, $textX, $currentY, $textColor, $fontPath, $line);
                    
                    \Log::info("Line drawn", ['line' => $line, 'x' => $textX, 'y' => $currentY]);
                }

                \Log::info('Text rendered successfully');
            }

            // Lưu file PNG
            $timestamp = now()->format('Ymd_His');
            $cleanName = $this->sanitizeFilenameVietnamese($textOriginal);
            
            if (!empty($cleanName)) {
                $filename = $cleanName . '_' . $timestamp . '.png';
            } else {
                $filename = 'design_' . $timestamp . '.png';
            }
            
            $exportPath = 'exports/' . $filename;
            $fullPath = storage_path('app/public/' . $exportPath);

            $exportDir = dirname($fullPath);
            if (!file_exists($exportDir)) {
                mkdir($exportDir, 0755, true);
            }

            $saved = imagepng($image, $fullPath, 9);
            if (!$saved) {
                throw new \Exception('Không thể lưu PNG');
            }

            imagedestroy($image);

            if ($design->export_image && \Storage::disk('public')->exists($design->export_image)) {
                \Storage::disk('public')->delete($design->export_image);
            }

            $design->update(['export_image' => $exportPath]);

            // Tạo URL truy cập file
            $fileUrl = route('export.file', ['filename' => $filename]);

            \Log::info('=== EXPORT SUCCESS ===', [
                'filename' => $filename,
                'url' => $fileUrl
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Xuất ảnh thành công',
                'url' => $fileUrl,
                'filename' => $filename
            ]);

        } catch (\Exception $e) {
            \Log::error('=== EXPORT FAILED ===', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Xuất ảnh thất bại'
            ], 500);
        }
    }

    /**
     * Làm sạch tên file
     */
    private function sanitizeFilenameVietnamese($text)
    {
        if (empty($text)) {
            return '';
        }
        
        $text = mb_convert_case($text, MB_CASE_TITLE, 'UTF-8');
        $text = preg_replace('/[\s\.\,\:\;\!\?\(\)\[\]\{\}\/\\\\]+/', '-', $text);
        $text = preg_replace('/[^\p{L}\p{N}\-\_]/u', '', $text);
        $text = preg_replace('/-+/', '-', $text);
        $text = trim($text, '-');
        
        if (mb_strlen($text, 'UTF-8') > 50) {
            $text = mb_substr($text, 0, 50, 'UTF-8');
            $text = trim($text, '-');
        }
        
        return $text;
    }

    // Chuyển mã màu HEX sang RGB
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