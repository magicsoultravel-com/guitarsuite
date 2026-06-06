<?php
require_once __DIR__ . '/gallery-utils.php';

class Gallery {
    private $uploadDir;
    private $metadataDir;
    private $thumbnailDir;
    private $publicBase;

    public function __construct() {
        $this->uploadDir = __DIR__ . '/../uploads/gallery/';
        $this->metadataDir = $this->uploadDir . 'metadata/';
        $this->thumbnailDir = $this->uploadDir . 'thumbnails/';
        $this->publicBase = 'uploads/gallery/';
    }

    public function uploadImage($imageData) {
        $imageName = uniqid() . '.' . pathinfo($imageData['name'], PATHINFO_EXTENSION);
        $imagePath = $this->uploadDir . $imageName;

if (!is_dir($this->uploadDir)) mkdir($this->uploadDir, 0755, true);
if (!is_dir($this->metadataDir)) mkdir($this->metadataDir, 0755, true);
if (!is_dir($this->thumbnailDir)) mkdir($this->thumbnailDir, 0755, true);

        if (move_uploaded_file($imageData['tmp_name'], $imagePath)) {
            $this->generateThumbnail($imagePath, $this->thumbnailDir . $imageName, 200, 200);

            // Try to extract EXIF data regardless of file type
            $exifData = GalleryUtils::extractExifData($imagePath);
            if ($exifData === false) {
                error_log("Failed to extract EXIF data for $imageName");
                $exifData = array();
            }

            $metadata = array(
                'imageName' => $imageName,
                'uploadDate' => date('Y-m-d H:i:s'),
                'exifData' => $exifData
            );

            if (!GalleryUtils::saveMetadata($this->metadataDir, $imageName, $metadata)) {
                error_log("Failed to save metadata for $imageName");
            }

            return array('success' => true, 'imageName' => $imageName);
        } else {
            return array('success' => false, 'error' => 'Failed to upload image');
        }
    }

    private function generateThumbnail($imagePath, $thumbnailPath, $width, $height) {
        try {
            list($originalWidth, $originalHeight) = getimagesize($imagePath);
            $ratio = min($width / $originalWidth, $height / $originalHeight);
            $newWidth = (int) ($originalWidth * $ratio);
            $newHeight = (int) ($originalHeight * $ratio);
            $x = (int) (($width - $newWidth) / 2);
            $y = (int) (($height - $newHeight) / 2);

            $thumbnail = imagecreatetruecolor($width, $height);

            $extension = strtolower(pathinfo($imagePath, PATHINFO_EXTENSION));
            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    $image = imagecreatefromjpeg($imagePath);
                    break;
                case 'png':
                    $image = imagecreatefrompng($imagePath);
                    // Preserve transparency
                    imagecolortransparent($thumbnail, imagecolorallocatealpha($thumbnail, 0, 0, 0, 127));
                    imagealphablending($thumbnail, false);
                    imagesavealpha($thumbnail, true);
                    break;
                case 'gif':
                    $image = imagecreatefromgif($imagePath);
                    break;
                default:
                    return false;
            }

            imagecopyresampled($thumbnail, $image, $x, $y, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

            // Save thumbnail according to type
            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    imagejpeg($thumbnail, $thumbnailPath, 80);
                    break;
                case 'png':
                    imagepng($thumbnail, $thumbnailPath);
                    break;
                case 'gif':
                    imagegif($thumbnail, $thumbnailPath);
                    break;
            }

            imagedestroy($image);
            imagedestroy($thumbnail);
        } catch (Exception $e) {
            error_log($e->getMessage());
            return false;
        }
        return true;
    }

    public function getRecentImages($limit = 5) {
        $images = array();

        if (!is_dir($this->metadataDir)) {
            return array('error' => 'Metadata directory does not exist');
        }

        $metadataFiles = scandir($this->metadataDir);
        if ($metadataFiles === false) {
            return array('error' => 'Failed to read metadata directory');
        }

        $metadataFiles = array_diff($metadataFiles, array('.', '..'));
        rsort($metadataFiles);

        foreach ($metadataFiles as $file) {
            if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
                $metadataPath = $this->metadataDir . $file;
                $metadata = json_decode(file_get_contents($metadataPath), true);
                if ($metadata === null) {
                    continue;
                }

                $images[] = array(
                    'imageName' => $metadata['imageName'],
                    'uploadDate' => $metadata['uploadDate'],
                    'thumbnailPath' => $this->publicBase . 'thumbnails/' . $metadata['imageName']
                );

                if (count($images) >= $limit) {
                    break;
                }
            }
        }

        return $images;
    }
}
?>
