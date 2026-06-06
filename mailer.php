<?php

class GalleryUtils {
    public static function extractExifData($imagePath) {
        if (!function_exists('exif_read_data')) {
            return false;
        }

        try {
            // Attempt to read EXIF data regardless of extension
            $exif = @exif_read_data($imagePath, 0, true);
            if ($exif === false) {
                // No EXIF or unsupported format; just return empty array
                return [];
            }

            return $exif;
        } catch (Exception $e) {
            error_log("EXIF error: " . $e->getMessage());
            return [];
        }
    }

public static function saveMetadata($metadataDir, $imageName, $metadata) {
    if (!is_dir($metadataDir)) {
        mkdir($metadataDir, 0755, true);
    }

    $jsonPath = $metadataDir . $imageName . '.json';
    $result = file_put_contents($jsonPath, json_encode($metadata, JSON_PRETTY_PRINT));

    if ($result !== false) {
        chmod($jsonPath, 0644);
        return true;
    }

    return false;
}
    public static function getRandomGalleryImage($galleryDir = null) {
        if ($galleryDir === null) {
            $galleryDir = __DIR__ . '/../uploads/gallery/';
        }

        if (!is_dir($galleryDir)) return false;

        $files = scandir($galleryDir);
        $imageFiles = array_filter($files, function ($file) use ($galleryDir) {
            $fullPath = $galleryDir . $file;
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            // Accept common image extensions; no extension check in EXIF extraction though
            return is_file($fullPath) && in_array($extension, ['jpg', 'jpeg', 'png', 'gif']);
        });

        if (!empty($imageFiles)) {
            $randomFile = $imageFiles[array_rand($imageFiles)];
            return 'uploads/gallery/originals/' . $randomFile;
        }

        return false;
    }
}
?>
