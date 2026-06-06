<?php

function listJsonFiles($dir) {
    $jsonFiles = [];
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $filePath = $dir . '/' . $file;
        if (is_dir($filePath)) {
            $jsonFiles = array_merge($jsonFiles, listJsonFiles($filePath));
        } elseif (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
            $jsonFiles[] = substr($filePath, strlen(realpath(__DIR__ . '/../')) + 1);
        }
    }
    return $jsonFiles;
}

function is_assoc(array $arr) {
    return array_keys($arr) !== range(0, count($arr) - 1);
}

// Normalize input JSON to rows for editing, detect variant
// Returns: [ rows(array), columns(array), original_structure(string) ]
function normalizeJsonForEdit($json) {
    if (is_array($json)) {
        if (empty($json)) return [[], [], 'empty_array'];

        if (!is_assoc($json)) {
            // Indexed array - check if array of objects or simple values
            $first = $json[0];
            if (is_array($first)) {
                // Array of objects, combine all keys for columns
                $columns = [];
                foreach ($json as $row) {
                    if (is_array($row)) {
                        foreach ($row as $k => $_) {
                            if (!in_array($k, $columns, true)) $columns[] = $k;
                        }
                    }
                }
                return [$json, $columns, 'array_of_objects'];
            } else {
                // Simple array of values, show as single column "value"
                $columns = ['value'];
                $rows = [];
                foreach ($json as $val) {
                    $rows[] = ['value' => $val];
                }
                return [$rows, $columns, 'simple_array'];
            }
        } else {
            // Associative array (keys are strings)
            // Check if all values are arrays (nested objects)
            $allValuesAreArrays = true;
            foreach ($json as $v) {
                if (!is_array($v)) {
                    $allValuesAreArrays = false;
                    break;
                }
            }
            if ($allValuesAreArrays) {
                // Convert to rows with special key column "id"
                $rows = [];
                $columns = ['id'];
                foreach ($json as $key => $value) {
                    $rows[] = array_merge(['id' => $key], $value);
                    foreach ($value as $k => $_) {
                        if (!in_array($k, $columns, true)) $columns[] = $k;
                    }
                }
                return [$rows, $columns, 'assoc_of_objects'];
            } else {
                // Simple associative key-value object
                // Show as two columns: key and value
                $rows = [];
                foreach ($json as $k => $v) {
                    $rows[] = ['key' => $k, 'value' => $v];
                }
                return [$rows, ['key','value'], 'simple_assoc'];
            }
        }
    } else {
        // If JSON root is not array/object, treat as single value
        return [[['value' => $json]], ['value'], 'single_value'];
    }
}

// Converts edited rows back to original JSON structure
function denormalizeJsonAfterEdit($rows, $structure) {
    switch ($structure) {
        case 'array_of_objects':
            return $rows;
        case 'assoc_of_objects':
            $result = [];
            foreach ($rows as $row) {
                if (!isset($row['id'])) continue; // skip invalid rows
                $id = $row['id'];
                unset($row['id']);
                $result[$id] = $row;
            }
            return $result;
        case 'simple_assoc':
            $result = [];
            foreach ($rows as $row) {
                if (!isset($row['key'])) continue;
                $result[$row['key']] = $row['value'] ?? null;
            }
            return $result;
        case 'simple_array':
            $result = [];
            foreach ($rows as $row) {
                $result[] = $row['value'] ?? null;
            }
            return $result;
        case 'empty_array':
            return [];
        case 'single_value':
            return $rows[0]['value'] ?? null;
        default:
            return $rows;
    }
}

$rootDir = realpath(__DIR__ . '/../');

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>JSON Editor</title>
<style>
body { font-family: sans-serif; background: #f9f9f9; padding: 20px; }
table { border-collapse: collapse; width: 100%; background: #fff; margin-top: 10px; }
th, td { border: 1px solid #ccc; padding: 6px 10px; }
th { background: #eee; }
td[contenteditable] { background: #ffffe0; white-space: pre-wrap; word-break: break-word; }
button { padding: 6px 12px; }
a { color: #06c; }
</style>
</head><body>";

echo "<h2>JSON Files:</h2><ul>";
$jsonFiles = listJsonFiles($rootDir);
if (empty($jsonFiles)) {
    echo "<li>No JSON files found.</li>";
} else {
    foreach ($jsonFiles as $file) {
        echo "<li>" . htmlspecialchars($file) . 
             " <a href='?tool=jason-editor&edit=" . urlencode($file) . "' title='Edit'>✏️</a></li>";
    }
}
echo "</ul>";

// Save logic
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['edit_file'], $_POST['json_table_data'], $_POST['json_structure'])) {
    $savePath = realpath($rootDir . '/' . $_POST['edit_file']);
    if ($savePath && strpos($savePath, $rootDir) === 0 && pathinfo($savePath, PATHINFO_EXTENSION) === 'json') {
        $rows = json_decode($_POST['json_table_data'], true);
        $structure = $_POST['json_structure'] ?? 'array_of_objects';
        if (json_last_error() === JSON_ERROR_NONE && is_array($rows)) {
            $data = denormalizeJsonAfterEdit($rows, $structure);
            $jsonStr = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            if ($jsonStr !== false) {
                file_put_contents($savePath, $jsonStr);
                echo "<p style='color:green;'><strong>✅ File saved successfully.</strong></p>";
            } else {
                echo "<p style='color:red;'><strong>❌ Failed to encode JSON.</strong></p>";
            }
        } else {
            echo "<p style='color:red;'><strong>❌ Invalid JSON data submitted.</strong></p>";
        }
    } else {
        echo "<p style='color:red;'><strong>❌ Error: Invalid file path.</strong></p>";
    }
}

// Edit logic
if (isset($_GET['edit'])) {
    $editFile = realpath($rootDir . '/' . $_GET['edit']);
    if (!$editFile || strpos($editFile, $rootDir) !== 0 || pathinfo($editFile, PATHINFO_EXTENSION) !== 'json') {
        echo "<p style='color:red;'>Invalid file selection.</p>";
    } elseif (!file_exists($editFile)) {
        echo "<p style='color:red;'>File not found.</p>";
    } else {
        $contents = file_get_contents($editFile);
        $json = json_decode($contents, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo "<p style='color:red;'>Invalid JSON file.</p>";
            return;
        }

        list($rows, $columns, $structure) = normalizeJsonForEdit($json);

        if (empty($rows)) {
            echo "<p>No data to edit in this JSON.</p>";
            return;
        }

        echo "<h3>Editing: " . htmlspecialchars($_GET['edit']) . "</h3>";
        echo "<form method='post' action='?tool=jason-editor&edit=" . urlencode($_GET['edit']) . "' onsubmit='return submitTable()'>";
        echo "<table id='json-table'><thead><tr>";
        foreach ($columns as $col) echo "<th>" . htmlspecialchars($col) . "</th>";
        echo "</tr></thead><tbody>";

        foreach ($rows as $r => $row) {
            echo "<tr>";
            foreach ($columns as $col) {
                $val = isset($row[$col]) ? $row[$col] : '';
                // Convert arrays/objects to JSON string to display editable
                if (is_array($val)) $val = json_encode($val, JSON_UNESCAPED_UNICODE);
                // Escape HTML special chars
                $val = htmlspecialchars((string)$val);
                echo "<td contenteditable='true' data-col='" . htmlspecialchars($col) . "'>$val</td>";
            }
            echo "</tr>";
        }

        echo "</tbody></table>";
        echo "<input type='hidden' name='edit_file' value='" . htmlspecialchars($_GET['edit']) . "'>";
        echo "<input type='hidden' id='json_table_data' name='json_table_data'>";
        echo "<input type='hidden' name='json_structure' value='" . htmlspecialchars($structure) . "'>";
        echo "<br><button type='submit'>💾 Save</button> ";
        echo "<a href='?tool=jason-editor' style='margin-left:10px; padding:6px 12px; background:#ccc; border-radius:3px; text-decoration:none;'>✖ Cancel</a>";
        echo "</form>";

        echo <<<SCRIPT
<script>
function isNumeric(value) {
    return !isNaN(value) && !isNaN(parseFloat(value));
}
function tryParseJSON(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}
function submitTable() {
    const table = document.getElementById('json-table');
    const rows = table.querySelectorAll('tbody tr');
    const data = [];

    rows.forEach(row => {
        const obj = {};
        row.querySelectorAll('td').forEach(cell => {
            const key = cell.dataset.col;
            let val = cell.innerText.trim();

            // Try to parse JSON if it looks like object/array string
            if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
                const parsed = tryParseJSON(val);
                if (parsed !== null) {
                    val = parsed;
                }
            } else if (isNumeric(val)) {
                val = Number(val);
            }
            obj[key] = val;
        });
        data.push(obj);
    });

    document.getElementById('json_table_data').value = JSON.stringify(data, null, 2);
    return true;
}
</script>
SCRIPT;
    }
}

echo "</body></html>";
?>
