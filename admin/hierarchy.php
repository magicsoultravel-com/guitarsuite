<?php
function tree($dir, $prefix = '') {
    $files = scandir($dir);
    $lastIndex = count($files) - 1;
    foreach ($files as $index => $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        $filePath = $dir . '/' . $file;
        if ($index == $lastIndex - 2) { // -2 because we skipped . and ..
            $connector = '└── ';
        } else {
            $connector = '├── ';
        }
        if (is_dir($filePath)) {
            echo $prefix . $connector . $file . "/\n";
            tree($filePath, $prefix . ($index == $lastIndex - 2 ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '│&nbsp;&nbsp;&nbsp;&nbsp;'));
        } else {
            echo $prefix . $connector . $file . "\n";
        }
    }
}

$rootDir = realpath(__DIR__ . '/../');

echo "<pre>\n"; // Add <pre> tag here
echo "File Hierarchy:\n";
echo basename($rootDir) . "/\n";
tree($rootDir, "│&nbsp;&nbsp;&nbsp;&nbsp;");
echo "</pre>\n"; // Add </pre> tag here
?>