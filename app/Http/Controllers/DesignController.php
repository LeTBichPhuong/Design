<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Design;

class DesignController extends Controller
{
    private $currentExportConfig = [];
    /**
     * Lưu thiết kế mới
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'         => 'nullable|string|max:255',
            'base_image'   => 'required|string',
            'config'       => 'required|array',
            'export_image' => 'nullable|string',
        ]);

        $baseImage = $data['base_image'];
        if (str_starts_with($baseImage, '/storage/')) {
            $baseImage = substr($baseImage, 1);
        }
        if (!str_starts_with($baseImage, 'storage/')) {
            $baseImage = 'storage/' . $baseImage;
        }

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

        $baseImage = $data['base_image'];
        if (str_starts_with($baseImage, '/storage/')) {
            $baseImage = substr($baseImage, 1);
        }
        if (!str_starts_with($baseImage, 'storage/')) {
            $baseImage = 'storage/' . $baseImage;
        }

        $exportImage = $design->export_image;
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

        if ($design->export_image && file_exists(public_path($design->export_image))) {
            @unlink(public_path($design->export_image));
        }

        $design->delete();
        
        return response()->json(['success' => true]);
    }

    /**
     * HÀM VẼ HÌNH CHỮ NHẬT BO GÓC TRÒN
     */
    private function imagefilledroundedrect($image, $x, $y, $width, $height, $radius, $color)
    {
        // Đảm bảo radius không lớn hơn 1/2 cạnh nhỏ nhất
        $radius = min($radius, $width / 2, $height / 2);
        
        // Vẽ hình chữ nhật trung tâm (không có góc)
        imagefilledrectangle($image, $x + $radius, $y, $x + $width - $radius, $y + $height, $color);
        imagefilledrectangle($image, $x, $y + $radius, $x + $radius, $y + $height - $radius, $color);
        imagefilledrectangle($image, $x + $width - $radius, $y + $radius, $x + $width, $y + $height - $radius, $color);
        
        // Vẽ 4 góc bo tròn bằng ellipse
        imagefilledellipse($image, $x + $radius, $y + $radius, $radius * 2, $radius * 2, $color); // Top-left
        imagefilledellipse($image, $x + $width - $radius, $y + $radius, $radius * 2, $radius * 2, $color); // Top-right
        imagefilledellipse($image, $x + $radius, $y + $height - $radius, $radius * 2, $radius * 2, $color); // Bottom-left
        imagefilledellipse($image, $x + $width - $radius, $y + $height - $radius, $radius * 2, $radius * 2, $color); // Bottom-right
    }

    /**
     * HÀM VẼ VIỀN BO GÓC TRÒN
     */
    private function imageroundedrect($image, $x, $y, $width, $height, $radius, $color, $thickness = 1)
    {
        $radius = min($radius, $width / 2, $height / 2);
        
        imagesetthickness($image, $thickness);
        
        // Vẽ 4 cạnh thẳng
        imageline($image, $x + $radius, $y, $x + $width - $radius, $y, $color); // Top
        imageline($image, $x + $radius, $y + $height, $x + $width - $radius, $y + $height, $color); // Bottom
        imageline($image, $x, $y + $radius, $x, $y + $height - $radius, $color); // Left
        imageline($image, $x + $width, $y + $radius, $x + $width, $y + $height - $radius, $color); // Right
        
        // Vẽ 4 góc bằng arc
        imagearc($image, $x + $radius, $y + $radius, $radius * 2, $radius * 2, 180, 270, $color); // Top-left
        imagearc($image, $x + $width - $radius, $y + $radius, $radius * 2, $radius * 2, 270, 0, $color); // Top-right
        imagearc($image, $x + $radius, $y + $height - $radius, $radius * 2, $radius * 2, 90, 180, $color); // Bottom-left
        imagearc($image, $x + $width - $radius, $y + $height - $radius, $radius * 2, $radius * 2, 0, 90, $color); // Bottom-right
        
        imagesetthickness($image, 1);
    }

    /**
     * XUẤT ẢNH PNG - SỬ DỤNG ROUNDED RECT + HỖ TRỢ BOLD/ITALIC
     */
    public function export($id)
    {
        set_time_limit(300);
        ini_set('memory_limit', '2048M');
        
        try {
            \Log::info('=== EXPORT START ===', ['design_id' => $id]);
            
            $design = Design::where('id', $id)
                ->when(Auth::check(), fn ($q) => $q->where('user_id', Auth::id()))
                ->firstOrFail();

                $cfg = $design->config;
                    
                if (is_string($cfg)) {
                    $cfg = json_decode($cfg, true);
                }

                // THÊM DÒNG NÀY NGAY SAU KHI PARSE CONFIG
                $this->currentExportConfig = $cfg;

                $baseImage = $design->base_image;
                
                if (str_starts_with($baseImage, '/')) {
                    $baseImage = substr($baseImage, 1);
                }
                
                $baseImagePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, public_path($baseImage));

                if (!file_exists($baseImagePath)) {
                    throw new \Exception('Ảnh gốc không tồn tại: ' . $baseImagePath);
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

                \Log::info('Image loaded', [
                    'width' => $imageWidth,
                    'height' => $imageHeight
                ]);

                \Log::info('🔧 EXPORT CONFIG RECEIVED', [
                    'text' => $cfg['text'] ?? '',
                    'fontSize' => $cfg['fontSize'] ?? 0,
                    'fontFamily' => $cfg['fontFamily'] ?? '',
                    'fontWeight' => $cfg['fontWeight'] ?? 'normal',
                    'fontStyle' => $cfg['fontStyle'] ?? 'normal',
                    'x' => $cfg['x'] ?? 0,
                    'y' => $cfg['y'] ?? 0,
                    'patchWidth' => $cfg['patchWidth'] ?? 0,
                    'patchHeight' => $cfg['patchHeight'] ?? 0,
                    'paddingX' => $cfg['paddingX'] ?? 60,
                    'paddingY' => $cfg['paddingY'] ?? 30,
                    'hasPatch' => $cfg['hasPatch'] ?? false
                ]);

                $text = $cfg['text'] ?? '';

                if (!empty($text)) {
                    $centerX = floatval($cfg['x'] ?? $imageWidth / 2);
                    $centerY = floatval($cfg['y'] ?? $imageHeight / 2);
                    $patchRotation = floatval($cfg['patchRotation'] ?? 0);
                    
                    $fontFamily = $cfg['fontFamily'] ?? 'Arial';
                    $fontSize = floatval($cfg['fontSize'] ?? 80);
                    $fontWeight = $cfg['fontWeight'] ?? 'normal';
                    $fontStyle = $cfg['fontStyle'] ?? 'normal';
                    $textDecoration = $cfg['textDecoration'] ?? 'none';
                    $customFontFile = $cfg['customFontFile'] ?? null;
                    $hasPatch = isset($cfg['hasPatch']) && $cfg['hasPatch'] === true;
                    
                    // Lấy conrner radius từ config
                    $patchCornerRadius = floatval($cfg['patchCornerRadius'] ?? 25);

                    \Log::info('Export config', [
                        'hasPatch' => $hasPatch,
                        'patchRotation' => $patchRotation,
                        'fontSize' => $fontSize,
                        'fontWeight' => $fontWeight,
                        'fontStyle' => $fontStyle,
                        'cornerRadius' => $patchCornerRadius,
                        'text' => $text
                    ]);

                    $fontPath = $this->findFontFile($fontFamily, $fontWeight, $fontStyle, $customFontFile);

                    if (!file_exists($fontPath)) {
                        throw new \Exception('Font file không tồn tại: ' . $fontPath);
                    }

                    // Xử lý auto-wrap text 
                    $lines = explode("\n", strtoupper($text));
                    $lineBBoxes = [];

                    foreach ($lines as $line) {
                        if (empty(trim($line))) {
                            $lineBBoxes[] = [
                                'bbox' => null,
                                'line' => $line,
                                'isEmpty' => true
                            ];
                            continue;
                        }
                        
                        $bbox = imagettfbbox($fontSize, 0, $fontPath, strtoupper($line));
                        if ($bbox !== false) {
                            $lineBBoxes[] = [
                                'bbox' => $bbox,
                                'line' => $line,
                                'isEmpty' => false
                            ];
                        }
                    }

                    $scaleFactor = $imageWidth / 11417;
                    $scaledRadius = $patchCornerRadius * $scaleFactor;

                    // Browser gửi kích thước patch
                    $patchWidth = floatval($cfg['patchWidth'] ?? 0);
                    $patchHeight = floatval($cfg['patchHeight'] ?? 0);

                    // Tính line metrics từ browser config
                    $lineHeight = $fontSize * 1.15;
                    $paddingY = floatval($cfg['paddingY'] ?? 30);
                    $scaledPaddingY = $paddingY * $scaleFactor;

                    $totalLines = count($lineBBoxes);

                    // ✅ Tính maxLineHeight từ patchHeight browser đã gửi
                    if ($patchHeight > 0) {
                        $textBlockHeight = $patchHeight - ($scaledPaddingY * 2);
                        
                        if ($totalLines > 1) {
                            $maxLineHeight = $textBlockHeight - (($totalLines - 1) * $lineHeight);
                        } else {
                            $maxLineHeight = $textBlockHeight;
                        }
                    } else {
                        // ❌ FALLBACK: Chỉ khi browser không gửi patchHeight
                        \Log::warning('⚠️ Browser did not send patchHeight, calculating from GD');
                        
                        $patchSize = $this->calculatePatchSize($lines, $fontSize, $fontPath, $scaleFactor);
                        $patchWidth = $patchSize['width'];
                        $patchHeight = $patchSize['height'];
                        $maxLineHeight = $patchSize['maxLineHeight'];
                        $lineHeight = $patchSize['lineHeight'];
                    }

                    \Log::info('✅ Using BROWSER measurements (100% accurate preview)', [
                        'patchWidth' => $patchWidth,
                        'patchHeight' => $patchHeight,
                        'lineHeight' => $lineHeight,
                        'maxLineHeight' => $maxLineHeight,
                        'totalLines' => $totalLines
                    ]);
                    // Nếu có rotation
                    if (abs($patchRotation) > 0.1) {
                        \Log::info('Rendering with rotation', ['angle' => $patchRotation]);
                        
                        $maxDim = ceil(sqrt($patchWidth * $patchWidth + $patchHeight * $patchHeight)) + 100;
                        $tempCanvas = imagecreatetruecolor($maxDim, $maxDim);
                        
                        imagealphablending($tempCanvas, false);
                        imagesavealpha($tempCanvas, true);
                        $transparent = imagecolorallocatealpha($tempCanvas, 0, 0, 0, 127);
                        imagefill($tempCanvas, 0, 0, $transparent);
                        imagealphablending($tempCanvas, true);
                        
                        $tempCenterX = $maxDim / 2;
                        $tempCenterY = $maxDim / 2;
                        $tempPatchX = $tempCenterX - $patchWidth / 2;
                        $tempPatchY = $tempCenterY - $patchHeight / 2;
                        
                        if ($hasPatch) {
                            $bgRgb = $this->hexToRgb($cfg['bgColor'] ?? '#000000');
                            $bgColor = imagecolorallocate($tempCanvas, $bgRgb['r'], $bgRgb['g'], $bgRgb['b']);
                            
                            // Sử dụng rounded rect
                            $this->imagefilledroundedrect(
                                $tempCanvas,
                                round($tempPatchX),
                                round($tempPatchY),
                                round($patchWidth),
                                round($patchHeight),
                                round($scaledRadius),
                                $bgColor
                            );
                            
                            if (!empty($cfg['strokeColor'])) {
                                $strokeRgb = $this->hexToRgb($cfg['strokeColor']);
                                $strokeColor = imagecolorallocate($tempCanvas, $strokeRgb['r'], $strokeRgb['g'], $strokeRgb['b']);
                                $strokeWidth = max(2, round(12 * $scaleFactor));
                                
                                // Vẽ viền bo tròn
                                $this->imageroundedrect(
                                    $tempCanvas,
                                    round($tempPatchX),
                                    round($tempPatchY),
                                    round($patchWidth),
                                    round($patchHeight),
                                    round($scaledRadius),
                                    $strokeColor,
                                    $strokeWidth
                                );
                            }
                        }
                        
                        $textRgb = $this->hexToRgb($cfg['textColor'] ?? '#ffffff');
                        $textColor = imagecolorallocate($tempCanvas, $textRgb['r'], $textRgb['g'], $textRgb['b']);
                        
                        // Gọi renderTextLines() với hỗ trợ bold/italic
                        $this->renderTextLines(
                            $tempCanvas, 
                            $lineBBoxes,
                            $tempCenterX, 
                            $tempCenterY, 
                            $fontSize, 
                            $fontPath, 
                            $textColor, 
                            $textDecoration,
                            $lineHeight,
                            $maxLineHeight
                        );
                        
                        $rotated = imagerotate($tempCanvas, -$patchRotation, $transparent);
                        imagedestroy($tempCanvas);
                        
                        $rotatedWidth = imagesx($rotated);
                        $rotatedHeight = imagesy($rotated);
                        
                        $destX = round($centerX - $rotatedWidth / 2);
                        $destY = round($centerY - $rotatedHeight / 2);
                        
                        imagecopy($image, $rotated, $destX, $destY, 0, 0, $rotatedWidth, $rotatedHeight);
                        imagedestroy($rotated);
                        
                    } else {
                        // Vẽ thường
                        $patchX = $centerX - $patchWidth / 2;
                        $patchY = $centerY - $patchHeight / 2;

                        if ($hasPatch) {
                            $bgRgb = $this->hexToRgb($cfg['bgColor'] ?? '#000000');
                            $bgColor = imagecolorallocate($image, $bgRgb['r'], $bgRgb['g'], $bgRgb['b']);
                            
                            // Sử dụng rounded rect
                            $this->imagefilledroundedrect(
                                $image,
                                round($patchX),
                                round($patchY),
                                round($patchWidth),
                                round($patchHeight),
                                round($scaledRadius),
                                $bgColor
                            );

                            if (!empty($cfg['strokeColor'])) {
                                $strokeRgb = $this->hexToRgb($cfg['strokeColor']);
                                $strokeColor = imagecolorallocate($image, $strokeRgb['r'], $strokeRgb['g'], $strokeRgb['b']);
                                $strokeWidth = max(2, round(12 * $scaleFactor));
                                
                                // Vẽ viền bo tròn
                                $this->imageroundedrect(
                                    $image,
                                    round($patchX),
                                    round($patchY),
                                    round($patchWidth),
                                    round($patchHeight),
                                    round($scaledRadius),
                                    $strokeColor,
                                    $strokeWidth
                                );
                            }
                        }

                        $textRgb = $this->hexToRgb($cfg['textColor'] ?? '#ffffff');
                        $textColor = imagecolorallocate($image, $textRgb['r'], $textRgb['g'], $textRgb['b']);
                        
                        // Gọi renderTextLines() với hỗ trợ bold/italic
                        $this->renderTextLines(
                            $image, 
                            $lineBBoxes,
                            $centerX, 
                            $centerY, 
                            $fontSize, 
                            $fontPath, 
                            $textColor, 
                            $textDecoration,
                            $lineHeight,
                            $maxLineHeight
                        );
                    }
                }

            // Lưu file
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

            \Log::info('=== EXPORT SUCCESS ===', [
                'filename' => $filename,
                'url' => $downloadUrl
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Xuất ảnh thành công',
                'url' => $downloadUrl,
                'filename' => $filename,
                'path' => $exportPath
            ]);

        } catch (\Exception $e) {
            \Log::error('=== EXPORT ERROR ===', [
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Xuất ảnh thất bại: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * CalculatePatchSize - Tính kích thước patch dựa trên text và font
     */
    private function calculatePatchSize($lines, $fontSize, $fontPath, $scaleFactor)
    {
        $maxLineWidth = 0;
        $maxLineHeight = 0;
        
        foreach ($lines as $index => $line) {
            if (empty(trim($line))) continue;
            
            $bbox = imagettfbbox($fontSize, 0, $fontPath, strtoupper($line));
            if ($bbox === false) continue;
            
            $lineWidth = $bbox[4] - $bbox[0];
            $maxLineWidth = max($maxLineWidth, $lineWidth);
            
            if ($index === 0 || $maxLineHeight === 0) {
                $lineHeight = abs($bbox[7] - $bbox[1]);
                if ($lineHeight > 0) {
                    $maxLineHeight = $lineHeight;
                }
            }
        }
        
        if ($maxLineHeight === 0) {
            $maxLineHeight = $fontSize;
        }
        
        $lineHeight = $fontSize * 1.15;
        $totalLines = count($lines);
        
        $textBlockHeight = ($totalLines > 1) 
            ? (($totalLines - 1) * $lineHeight + $maxLineHeight)
            : $maxLineHeight;
        
        $paddingX = floatval($this->currentExportConfig['paddingX'] ?? 60);
        $paddingY = floatval($this->currentExportConfig['paddingY'] ?? 30);
        
        $scaledPaddingX = $paddingX * $scaleFactor;
        $scaledPaddingY = $paddingY * $scaleFactor;
        
        $patchWidth = $maxLineWidth + $scaledPaddingX * 2;
        $patchHeight = $textBlockHeight + $scaledPaddingY * 2;
        
        return [
            'width' => $patchWidth,
            'height' => $patchHeight,
            'textWidth' => $maxLineWidth,
            'textHeight' => $textBlockHeight,
            'maxLineHeight' => $maxLineHeight,
            'lineHeight' => $lineHeight
        ];
    }
    /**
     * Render text lines với hỗ trợ bold/italic
     */
    private function renderTextLines($canvas, $lineBBoxes, $centerX, $centerY, $fontSize, $fontPath, $textColor, $textDecoration, $lineHeight, $maxLineHeight)
    {
        $totalLines = count($lineBBoxes);
        $totalTextHeight = ($totalLines > 0) ? (($totalLines - 1) * $lineHeight + $maxLineHeight) : 0;
        $currentY = $centerY - $totalTextHeight / 2;
        
        // Lấy condition bold/italic từ currentExportConfig
        $isBold = ($this->currentExportConfig['fontWeight'] ?? 'normal') === 'bold';
        $isItalic = ($this->currentExportConfig['fontStyle'] ?? 'normal') === 'italic';
        
        \Log::info('renderTextLines', [
            'isBold' => $isBold,
            'isItalic' => $isItalic,
            'totalLines' => $totalLines
        ]);
        
        foreach ($lineBBoxes as $lineData) {
            if ($lineData['isEmpty']) {
                $currentY += $lineHeight;
                continue;
            }
            
            $bbox = $lineData['bbox'];
            $line = $lineData['line'];
            
            $lineWidth = $bbox[4] - $bbox[0];
            $lineHeightPx = abs($bbox[7] - $bbox[1]);
            $textX = round($centerX - $lineWidth / 2);
            $textY = round($currentY - $bbox[7]);
            
            // Nếu italic gọi hàm vẽ italic
            if ($isItalic) {
                $this->renderItalicText($canvas, $line, $textX, $textY, $fontSize, $fontPath, $textColor, $lineWidth, $lineHeightPx, $isBold);
            } else {
                // Vẽ text thẳng
                imagettftext($canvas, $fontSize, 0, $textX, $textY, $textColor, $fontPath, $line);
                
                // Bold thêm nhiều layer để chữ đậm hơn
                if ($isBold) {
                    // Dịch phải 1px
                    imagettftext($canvas, $fontSize, 0, $textX + 1, $textY, $textColor, $fontPath, $line);
                    // Dịch xuống 1px
                    imagettftext($canvas, $fontSize, 0, $textX, $textY + 1, $textColor, $fontPath, $line);
                    // Dịch chéo 1px
                    imagettftext($canvas, $fontSize, 0, $textX + 1, $textY + 1, $textColor, $fontPath, $line);
                    
                    // Thêm layer 0.5px để chữ đậm
                    imagettftext($canvas, $fontSize, 0, $textX + 0.5, $textY, $textColor, $fontPath, $line);
                    imagettftext($canvas, $fontSize, 0, $textX, $textY + 0.5, $textColor, $fontPath, $line);
                }
            }
            
            // Hỗ trợ cả italic và thẳng
            if ($textDecoration === 'underline') {
                $underlineY = round($textY + $fontSize * 0.1);
                $underlineThickness = max(2, round($fontSize / 20));
                
                imagesetthickness($canvas, $underlineThickness);
                
                if ($isItalic) {
                    // Underline nghiêng
                    $skewOffset = round($fontSize * 0.3);
                    imageline($canvas, 
                        $textX + $skewOffset, $underlineY, 
                        $textX + $lineWidth + $skewOffset, $underlineY, 
                        $textColor);
                } else {
                    // Underline thẳng
                    imageline($canvas, $textX, $underlineY, $textX + $lineWidth, $underlineY, $textColor);
                }
                
                imagesetthickness($canvas, 1);
            }
            
            $currentY += $lineHeight;
        }
    }

    /**
     * Vẽ text italic với hiệu ứng nghiêng pixel-by-pixel
     */
    private function renderItalicText($canvas, $line, $textX, $textY, $fontSize, $fontPath, $textColor, $lineWidth, $lineHeightPx, $isBold)
    {
        // Tạo temp canvas để vẽ text thẳng trước
        $margin = round($fontSize * 0.5);
        $tempWidth = $lineWidth + $margin * 4;
        $tempHeight = $lineHeightPx + $margin * 2;
        
        $tempCanvas = imagecreatetruecolor($tempWidth, $tempHeight);
        imagealphablending($tempCanvas, false);
        $transparent = imagecolorallocatealpha($tempCanvas, 0, 0, 0, 127);
        imagefill($tempCanvas, 0, 0, $transparent);
        imagesavealpha($tempCanvas, true);
        imagealphablending($tempCanvas, true);
        
        // Allocate color cho temp canvas
        $r = ($textColor >> 16) & 0xFF;
        $g = ($textColor >> 8) & 0xFF;
        $b = $textColor & 0xFF;
        $tempColor = imagecolorallocate($tempCanvas, $r, $g, $b);
        
        // Vẽ text vào temp canvas
        $tempTextX = $margin * 2;
        $tempTextY = $margin + $lineHeightPx;
        
        // Vẽ text thẳng
        imagettftext($tempCanvas, $fontSize, 0, $tempTextX, $tempTextY, $tempColor, $fontPath, $line);
        
        // Áp dụng hiệu ứng nghiêng (skew) pixel-by-pixel
        $skewAmount = 0.25; // Độ nghiêng (~14 độ)
        
        for ($y = 0; $y < $tempHeight; $y++) {
            // Offset X tăng dần từ đỉnh xuống đáy
            $skewOffset = round(($tempHeight - $y) * $skewAmount);
            
            for ($x = 0; $x < $tempWidth; $x++) {
                $color = imagecolorat($tempCanvas, $x, $y);
                $alpha = ($color >> 24) & 0x7F;
                
                // Chỉ copy pixel không trong suốt
                if ($alpha < 127) {
                    $destX = $textX + $x + $skewOffset - $margin * 2;
                    $destY = $textY + $y - $tempHeight + $margin;
                    
                    // Kiểm tra bounds
                    if ($destX >= 0 && $destX < imagesx($canvas) && 
                        $destY >= 0 && $destY < imagesy($canvas)) {
                        imagesetpixel($canvas, $destX, $destY, $textColor);
                        
                        // NẾU BOLD → Thêm pixel xung quanh (AFTER SKEW)
                        if ($isBold) {
                            // Thêm 1px bên phải
                            if ($destX + 1 < imagesx($canvas)) {
                                imagesetpixel($canvas, $destX + 1, $destY, $textColor);
                            }
                            // Thêm 1px bên dưới
                            if ($destY + 1 < imagesy($canvas)) {
                                imagesetpixel($canvas, $destX, $destY + 1, $textColor);
                            }
                            // Thêm 1px chéo
                            if ($destX + 1 < imagesx($canvas) && $destY + 1 < imagesy($canvas)) {
                                imagesetpixel($canvas, $destX + 1, $destY + 1, $textColor);
                            }
                        }
                    }
                }
            }
        }
        
        imagedestroy($tempCanvas);
    }
    
    /**
     * AUTO-WRAP TEXT THEO CHIỀU RỘNG PATCH
     */
    private function autoWrapText($text, $patchWidth, $fontSize, $fontPath, $imageWidth)
    {
        $scaleFactor = $imageWidth / 11417;
        $paddingX = 60 * $scaleFactor;
        $availableWidth = $patchWidth - ($paddingX * 2);
        
        if ($availableWidth <= 0) {
            return $text;
        }
        
        $words = preg_split('/\s+/', trim($text));
        $lines = [];
        $currentLine = '';
        
        foreach ($words as $word) {
            $testLine = $currentLine ? $currentLine . ' ' . $word : $word;
            
            $bbox = imagettfbbox($fontSize, 0, $fontPath, strtoupper($testLine));
            if ($bbox === false) {
                return $text;
            }
            
            $testWidth = $bbox[4] - $bbox[0];
            
            if ($testWidth > $availableWidth && $currentLine !== '') {
                $lines[] = $currentLine;
                $currentLine = $word;
            } else {
                $currentLine = $testLine;
            }
        }
        
        if ($currentLine !== '') {
            $lines[] = $currentLine;
        }
        
        return implode("\n", $lines);
    }

    /**
     * TÌM FONT FILE - HỖ TRỢ BOLD/ITALIC/CUSTOM FONT
     */
    private function findFontFile($fontFamily, $fontWeight = 'normal', $fontStyle = 'normal', $customFontFile = null)
{
    \Log::info('findFontFile - START', [
        'fontFamily' => $fontFamily,
        'fontWeight' => $fontWeight,
        'fontStyle' => $fontStyle,
        'customFontFile' => $customFontFile
    ]);

    // ƯU TIÊN 1: CUSTOM FONT FILE (nếu có)
    if (!empty($customFontFile)) {
        $customFontPath = public_path('fonts/' . $customFontFile);
        
        \Log::info('Checking custom font file', [
            'customFontFile' => $customFontFile,
            'fullPath' => $customFontPath,
            'exists' => file_exists($customFontPath)
        ]);
        
        if (file_exists($customFontPath)) {
            \Log::info('Using custom font from customFontFile');
            // CUSTOM FONT: Bỏ QUA bold/italic style key vì chỉ có 1 file
            // GD sẽ dùng font transform để tạo hiệu ứng bold/italic
            return $customFontPath;
        } else {
            \Log::warning('Custom font file not found, trying alternatives');
        }
    }

    // Chuẩn hóa fontFamily
    if (empty($fontFamily) || $fontFamily === 'null') {
        \Log::warning('fontFamily is empty, using fallback');
        return $this->getFallbackFont();
    }

    $fontFamily = trim($fontFamily);
    $fontFamily = str_replace(["'", '"', ', sans-serif', ', serif', ', monospace'], '', $fontFamily);
    $fontFamily = trim($fontFamily);
    $fontFamilyLower = strtolower($fontFamily);
    
    // XÁC ĐỊNH STYLE KEY (chỉ cho SYSTEM FONTS)
    $isBold = ($fontWeight === 'bold');
    $isItalic = ($fontStyle === 'italic');
    
    $styleKey = 'normal';
    if ($isBold && $isItalic) {
        $styleKey = 'bold-italic';
    } elseif ($isBold) {
        $styleKey = 'bold';
    } elseif ($isItalic) {
        $styleKey = 'italic';
    }
    
    \Log::info('Font style determined', [
        'styleKey' => $styleKey,
        'isBold' => $isBold,
        'isItalic' => $isItalic
    ]);
    
    // ƯU TIÊN 2: TÌM FONT CUSTOM TRONG public/fonts/ (theo tên)
    $fontsDir = public_path('fonts/');
    if (is_dir($fontsDir)) {
        $files = scandir($fontsDir);
        $fontFamilySearch = str_replace([' ', '-', '_', '.'], '', $fontFamilyLower);
        
        \Log::info('Scanning fonts directory', [
            'dir' => $fontsDir,
            'searchFor' => $fontFamilySearch
        ]);
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (!in_array($ext, ['ttf', 'otf', 'woff', 'woff2'])) continue;
            
            $originalName = $file;
            
            // Format: uniqid_timestamp_originalname.ttf
            if (preg_match('/^[a-f0-9]+_\d+_(.+)$/i', $file, $matches)) {
                $originalName = $matches[1];
            }
            
            $originalName = pathinfo($originalName, PATHINFO_FILENAME);
            $originalNameLower = strtolower($originalName);
            $originalNameSearch = str_replace([' ', '-', '_', '.'], '', $originalNameLower);
            
            $isMatch = (
                $originalNameSearch === $fontFamilySearch ||
                strpos($originalNameSearch, $fontFamilySearch) !== false ||
                strpos($fontFamilySearch, $originalNameSearch) !== false
            );
            
            if ($isMatch) {
                $fontPath = $fontsDir . $file;
                if (file_exists($fontPath)) {
                    \Log::info('Found custom font by name - using single file for all styles', [
                        'file' => $file,
                        'path' => $fontPath
                    ]);
                    // CUSTOM FONT: Trả về file duy nhất, GD sẽ tự xử lý bold/italic
                    return $fontPath;
                }
            }
        }
    }
    
    // ƯU TIÊN 3: FONT HỆ THỐNG VỚI VARIANTS (BOLD/ITALIC)
    $fontMap = [
        'arial' => [
            'normal' => 'arial.ttf',
            'bold' => 'arialbd.ttf',
            'italic' => 'ariali.ttf',
            'bold-italic' => 'arialbi.ttf',
        ],
        'times new roman' => [
            'normal' => 'times.ttf',
            'bold' => 'timesbd.ttf',
            'italic' => 'timesi.ttf',
            'bold-italic' => 'timesbi.ttf',
        ],
        'courier new' => [
            'normal' => 'cour.ttf',
            'bold' => 'courbd.ttf',
            'italic' => 'couri.ttf',
            'bold-italic' => 'courbi.ttf',
        ],
        'verdana' => [
            'normal' => 'verdana.ttf',
            'bold' => 'verdanab.ttf',
            'italic' => 'verdanai.ttf',
            'bold-italic' => 'verdanaz.ttf',
        ],
        'georgia' => [
            'normal' => 'georgia.ttf',
            'bold' => 'georgiab.ttf',
            'italic' => 'georgiai.ttf',
            'bold-italic' => 'georgiaz.ttf',
        ],
        'trebuchet ms' => [
            'normal' => 'trebuc.ttf',
            'bold' => 'trebucbd.ttf',
            'italic' => 'trebucit.ttf',
            'bold-italic' => 'trebucbi.ttf',
        ],
        'impact' => [
            'normal' => 'impact.ttf',
        ],
        'comic sans ms' => [
            'normal' => 'comic.ttf',
            'bold' => 'comicbd.ttf',
        ],
    ];
    
    foreach ($fontMap as $name => $styles) {
        if ($fontFamilyLower === $name || strpos($fontFamilyLower, $name) !== false) {
            // ƯU TIÊN LẤY STYLE ĐÚNG (BOLD/ITALIC)
            $filename = $styles[$styleKey] ?? $styles['normal'];
            
            $path = public_path('fonts/' . $filename);
            
            \Log::info('Checking system font', [
                'name' => $name,
                'styleKey' => $styleKey,
                'filename' => $filename,
                'path' => $path,
                'exists' => file_exists($path)
            ]);
            
            if (file_exists($path)) {
                \Log::info('Found system font with correct style');
                return $path;
            }
            
            // FALLBACK NẾU KHÔNG CÓ VARIANT: LẤY NORMAL
            if ($styleKey !== 'normal' && isset($styles['normal'])) {
                $normalPath = public_path('fonts/' . $styles['normal']);
                if (file_exists($normalPath)) {
                    \Log::warning('Font variant not found, using normal', [
                        'requested' => $styleKey,
                        'using' => 'normal'
                    ]);
                    return $normalPath;
                }
            }
        }
    }
    
    \Log::warning('No font found, using fallback');
    return $this->getFallbackFont();
}

    /**
     * Lấy font mặc định
     */
    private function getFallbackFont()
    {
        $fallbackFonts = [
            public_path('fonts/arial.ttf'),
            public_path('fonts/verdana.ttf'),
            public_path('fonts/georgia.ttf'),
            public_path('fonts/times.ttf'),
        ];
        
        foreach ($fallbackFonts as $fallback) {
            if (file_exists($fallback)) {
                \Log::info('Using fallback font', ['path' => $fallback]);
                return $fallback;
            }
        }
        
        throw new \Exception('Không tìm thấy font trong thư mục public/fonts/');
    }

    /**
     * Xử lý tiếng việt cho filename
     */
    private function sanitizeFilenameVietnamese($text)
    {
        if (empty($text)) {
            return '';
        }
        
        $text = mb_convert_case($text, MB_CASE_TITLE, 'UTF-8');
        
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
        
        $text = preg_replace('/[^a-z0-9]+/', '-', $text);
        $text = preg_replace('/-+/', '-', $text);
        $text = trim($text, '-');
        
        if (mb_strlen($text, 'UTF-8') > 50) {
            $text = mb_substr($text, 0, 50, 'UTF-8');
            $text = rtrim($text, '-');
        }
        
        return $text;
    }

    /**
     * Chuyển đổi hex sang RGB
     */
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