<?php

if (!is_admin()) {
    header('Location: /index.php'); // Redirect non-admins or non-logged-in users
    exit;
}


$baseDir = realpath(__DIR__ . '/../');


$excludeDir = realpath($baseDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'gallery' . DIRECTORY_SEPARATOR . 'originals') . DIRECTORY_SEPARATOR;


$rootDirectoryName = basename($baseDir);


$zipName = $rootDirectoryName . '_' . date('Ymd_His') . '.zip';


$zipPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $zipName;


$zip = new ZipArchive();

if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    // If opening/creating fails, terminate with an error message
    die("Failed to create archive at: " . htmlspecialchars($zipPath));
}

function addFolderToZip($folder, $zip, $basePathLength, $excludeDirPath) {
    // Get all items (files and directories) in the current folder
    $items = scandir($folder);
    foreach ($items as $item) {
        // Skip current and parent directory entries
        if ($item === '.' || $item === '..') continue;

        $fullPath = $folder . DIRECTORY_SEPARATOR . $item; // Full path to the current item

        $normalizedFullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, realpath($fullPath)) . DIRECTORY_SEPARATOR;


        if (strpos($normalizedFullPath, $excludeDirPath) === 0) {
            continue; // Skip this directory and its contents
        }

        if (is_dir($fullPath)) {
            // If it's a directory, recursively call this function
            addFolderToZip($fullPath, $zip, $basePathLength, $excludeDirPath);
        } else if (is_file($fullPath)) {
            // If it's a file, add it to the ZIP archive
            // Calculate the path within the ZIP archive (relative to the base directory)
            $localPath = substr($fullPath, $basePathLength);
            // Normalize directory separators for ZIP (Windows '\' to '/') and trim leading slash
            $localPath = ltrim(str_replace('\\', '/', $localPath), '/');
            
            // Add the file to the ZIP archive
            $zip->addFile($fullPath, $localPath);
        }
    }
}


addFolderToZip($baseDir, $zip, strlen($baseDir), $excludeDir);

$zip->close();


if (file_exists($zipPath) && filesize($zipPath) > 0) {
    if (ob_get_level() > 0) {
        ob_end_clean();
    }


    header('Content-Type: application/zip'); // MIME type for ZIP files

    header('Content-Disposition: attachment; filename="' . $zipName . '"');
    header('Content-Length: ' . filesize($zipPath)); // Tell the browser the file size


    $fp = fopen($zipPath, 'rb');
    if ($fp === false) {
        echo "Error: Could not open the ZIP file for reading.";
        exit;
    }

    while (!feof($fp)) {
        echo fread($fp, 8192); // Read 8KB at a time
    }
    fclose($fp); // Close the file handle


    unlink($zipPath);
    exit; // Terminate script execution after file download
} else {
 
    echo "Error creating ZIP file. It might be empty or creation failed. Please check server logs and directory write permissions for " . htmlspecialchars(sys_get_temp_dir());
}