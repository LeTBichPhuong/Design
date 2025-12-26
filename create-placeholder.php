<?php
// create-placeholder.php

$width = 300;
$height = 200;

// Tạo ảnh trống
$image = imagecreatetruecolor($width, $height);

// Màu xám
$gray = imagecolorallocate($image, 200, 200, 200);
$darkGray = imagecolorallocate($image, 100, 100, 100);

// Fill background
imagefilledrectangle($image, 0, 0, $width, $height, $gray);

// Vẽ text
$text = "No Image";
$font = 5;
$textWidth = imagefontwidth($font) * strlen($text);
$textHeight = imagefontheight($font);
$x = ($width - $textWidth) / 2;
$y = ($height - $textHeight) / 2;

imagestring($image, $font, $x, $y, $text, $darkGray);

// Lưu file
$path = __DIR__ . '/storage/app/public/placeholder.png';
imagepng($image, $path);
imagedestroy($image);

echo "Created: $path\n";
?>