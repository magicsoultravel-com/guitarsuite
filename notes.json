<?php
require_once __DIR__ . '/../inc/auth.php';

if (!is_logged_in()) {
    header('Location: ../auth/login.php');
    exit;
}

// Configuration - make sure these folders exist and are writable!
$uploadDir = __DIR__ . '/../uploads/gallery/originals/';
$thumbDir = __DIR__ . '/../uploads/gallery/thumbnails/';
$metaDir = __DIR__ . '/../uploads/gallery/metadata/';

// Create directories if missing
foreach ([$uploadDir, $thumbDir, $metaDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Utility function to create thumbnail (max width/height 200px)
function createThumbnail($srcPath, $destPath, $maxDim = 200) {
    $info = getimagesize($srcPath);
    if ($info === false) return false;

    list($width, $height) = $info;
    $mime = $info['mime'];

    $ratio = $width / $height;
    if ($width > $height) {
        $newWidth = $maxDim;
        $newHeight = round($maxDim / $ratio);
    } else {
        $newHeight = $maxDim;
        $newWidth = round($maxDim * $ratio);
    }

    $thumb = imagecreatetruecolor($newWidth, $newHeight);

    switch ($mime) {
        case 'image/jpeg':
            $source = imagecreatefromjpeg($srcPath);
            break;
        case 'image/png':
            $source = imagecreatefrompng($srcPath);
            // preserve transparency
            imagecolortransparent($thumb, imagecolorallocatealpha($thumb, 0, 0, 0, 127));
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
            break;
        case 'image/gif':
            $source = imagecreatefromgif($srcPath);
            break;
        default:
            return false;
    }

    imagecopyresampled($thumb, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    switch ($mime) {
        case 'image/jpeg':
            imagejpeg($thumb, $destPath, 85);
            break;
        case 'image/png':
            imagepng($thumb, $destPath);
            break;
        case 'image/gif':
            imagegif($thumb, $destPath);
            break;
    }

    imagedestroy($thumb);
    imagedestroy($source);

    return true;
}

// Extract metadata (EXIF + IPTC + fallback) for JPEG and fallback for others
function extract_metadata($filepath) {
    $metadata = [];

    $ext = strtolower(pathinfo($filepath, PATHINFO_EXTENSION));

    if ($ext === 'jpg' || $ext === 'jpeg') {
        // Try EXIF
        if (function_exists('exif_read_data')) {
            $exif = @exif_read_data($filepath, 'ANY_TAG', true);
            if ($exif !== false && count($exif) > 0) {
                $metadata['exif'] = $exif;
            }
        }

        // If no EXIF or empty, try IPTC
        if (empty($metadata)) {
            $size = getimagesize($filepath, $info);
            if (isset($info['APP13'])) {
                $iptc = iptcparse($info['APP13']);
                if ($iptc !== false && count($iptc) > 0) {
                    $metadata['iptc'] = $iptc;
                }
            }
        }
    }

    // Fallback to basic info if metadata still empty
    if (empty($metadata)) {
        $size = getimagesize($filepath);
        if ($size) {
            $metadata['basic'] = [
                'mime' => $size['mime'] ?? null,
                'width' => $size[0] ?? null,
                'height' => $size[1] ?? null,
            ];
        }
    }

    return $metadata;
}

$messages = [];
$metadata = [];
$basename = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    $file = $_FILES['image'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $messages[] = "Upload error code: {$file['error']}";
    } else {
        // Validate MIME type and extension
        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedMimeTypes)) {
            $messages[] = "Unsupported file type: {$mimeType}";
        } else {
            // Generate safe filename: timestamp + random + ext
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $basename = time() . '_' . bin2hex(random_bytes(5)) . '.' . strtolower($ext);

            $destPath = $uploadDir . $basename;
            if (!move_uploaded_file($file['tmp_name'], $destPath)) {
                $messages[] = "Failed to move uploaded file.";
            } else {
                $messages[] = "File uploaded successfully as {$basename}.";

                // Create thumbnail
                $thumbPath = $thumbDir . $basename;
                if (createThumbnail($destPath, $thumbPath)) {
                    $messages[] = "Thumbnail created.";
                } else {
                    $messages[] = "Failed to create thumbnail.";
                }

                // Extract metadata (EXIF + IPTC fallback)
                $metadata = extract_metadata($destPath);

                // Save metadata JSON if any
                if (!empty($metadata)) {
                    file_put_contents($metaDir . pathinfo($basename, PATHINFO_FILENAME) . '.json', json_encode($metadata, JSON_PRETTY_PRINT));
                    $messages[] = "Metadata extracted and saved.";
                } else {
                    $messages[] = "No metadata found.";
                }
            }
        }
    }
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Upload Image - Magic Panel</title>
<style>
    body { font-family: sans-serif; max-width: 600px; margin: 20px auto; }
    img { max-width: 300px; display: block; margin-top: 15px; }
    pre { background: #eee; padding: 10px; overflow-x: auto; max-height: 300px; }
    .messages { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; background: #fafafa; }
</style>
</head>
<body>
<h1>Upload Image</h1>

<?php if ($messages): ?>
    <div class="messages">
        <?php foreach ($messages as $msg): ?>
            <div><?= htmlspecialchars($msg) ?></div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php if (!empty($basename)): ?>
    <img src="../uploads/gallery/thumbnails/<?= htmlspecialchars($basename) ?>" alt="Thumbnail" />
    <h2>Extracted Metadata:</h2>
    <pre><?= htmlspecialchars(json_encode($metadata, JSON_PRETTY_PRINT)) ?></pre>
<?php endif; ?>

<form method="post" enctype="multipart/form-data">
    <label>Select image (JPEG, PNG, GIF):</label><br>
    <input type="file" name="image" accept="image/jpeg,image/png,image/gif" required><br><br>
    <button type="submit">Upload</button>
</form>

</body>
</html>
