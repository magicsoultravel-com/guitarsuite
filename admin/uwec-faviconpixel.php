<?php
// uwec-faviconpixel.php - Universal Pixel Favicon Creator

// --- Paths & Configuration ---
$rootDir = realpath(__DIR__ . '/../');
$assetsDir = $rootDir . '/assets';
$faviconPath = $assetsDir . '/favicon.png';
$siteTitlePath = $assetsDir . '/title.txt';
$siteTitle = file_exists($siteTitlePath) ? trim(@file_get_contents($siteTitlePath)) : 'Current Site';

// Define the fonts to be used.
$googleFonts = [
    'Roboto' => 'https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap',
    'Indie Flower' => 'https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap',
    'Amatic SC' => 'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&display=swap',
    'Permanent Marker' => 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap',
    'Dancing Script' => 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap',
    'Press Start 2P' => 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
    'Pacifico' => 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap',
    'Fredericka the Great' => 'https://fonts.googleapis.com/css2?family=Fredericka+the+Great&display=swap',
    'Special Elite' => 'https://fonts.googleapis.com/css2?family=Special+Elite&display=swap',
    'Allura' => 'https://fonts.googleapis.com/css2?family=Allura&display=swap',
    'Alex Brush' => 'https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap',
    'Parisienne' => 'https://fonts.googleapis.com/css2?family=Parisienne&display=swap',
    'UnifrakturMaguntia' => 'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&display=swap'
];

// --- Helper Functions ---

/**
 * Converts a hexadecimal color string to an RGB array.
 * @param string $hex The hexadecimal color string (e.g., '#RRGGBB' or 'RRGGBB').
 * @return array An array containing the R, G, and B values.
 */
function hexToRgb($hex) {
    $hex = str_replace('#', '', $hex);
    if (strlen($hex) === 3) {
        return [
            hexdec(str_repeat($hex[0], 2)),
            hexdec(str_repeat($hex[1], 2)),
            hexdec(str_repeat($hex[2], 2))
        ];
    }
    return [
        hexdec(substr($hex, 0, 2)),
        hexdec(substr($hex, 2, 2)),
        hexdec(substr($hex, 4, 2))
    ];
}

/**
 * Creates a PNG favicon from an array of pixel color data.
 * @param array $pixels An array of hex color strings.
 * @param string $filename The path to save the PNG file.
 * @param int $size The width and height of the image in pixels.
 * @return array A result array with 'success' status and a 'message'.
 */
function createPixelFavicon($pixels, $filename, $size = 32) {
    if (!extension_loaded('gd')) return ['success' => false, 'message' => 'GD library not enabled'];
    $image = imagecreatetruecolor($size, $size);
    $transparent = imagecolorallocatealpha($image, 0, 0, 0, 127);
    imagefill($image, 0, 0, $transparent);
    imagesavealpha($image, true);

    $x = 0;
    $y = 0;
    foreach ($pixels as $px) {
        $rgb = hexToRgb($px);
        $color = imagecolorallocate($image, $rgb[0], $rgb[1], $rgb[2]);
        imagesetpixel($image, $x, $y, $color);
        $x++;
        if ($x >= $size) {
            $x = 0;
            $y++;
        }
    }

    if (!is_dir(dirname($filename))) {
        mkdir(dirname($filename), 0755, true);
    }
    if (!is_writable(dirname($filename))) {
        return ['success' => false, 'message' => 'Directory is not writable. Check file permissions.'];
    }

    $result = imagepng($image, $filename);
    imagedestroy($image);
    return $result ? ['success' => true, 'message' => 'Favicon created successfully'] : ['success' => false, 'message' => 'Error saving favicon'];
}

/**
 * Reads a favicon from a PNG file and returns an array of pixel color data.
 * @param string $filename The path to the PNG file.
 * @return array|false An array of hex color strings or false on failure.
 */
function readPixelFavicon($filename) {
    if (!extension_loaded('gd') || !file_exists($filename)) {
        return false;
    }
    $image = imagecreatefrompng($filename);
    if (!$image) {
        return false;
    }

    $pixels = [];
    $size = imagesx($image);
    for ($y = 0; $y < $size; $y++) {
        for ($x = 0; $x < $size; $x++) {
            $rgb = imagecolorat($image, $x, $y);
            $colors = imagecolorsforindex($image, $rgb);
            $hex = sprintf("#%02x%02x%02x", $colors['red'], $colors['green'], $colors['blue']);
            $pixels[] = $hex;
        }
    }
    imagedestroy($image);
    return $pixels;
}

// --- AJAX POST Handler ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pixel_data'])) {
    header('Content-Type: application/json');
    
    if (!is_admin()) { 
        echo json_encode(['success' => false, 'message' => 'Access denied.']);
        exit;
    }

    $pixels = explode(',', $_POST['pixel_data']);
    if (count($pixels) !== 1024) {
        echo json_encode(['success' => false, 'message' => 'Invalid pixel data.']);
        exit;
    }

    $result = createPixelFavicon($pixels, $faviconPath);
    echo json_encode($result);
    exit;
}

// --- Initial Page Load Setup ---
$initialPixels = [];
if (file_exists($faviconPath)) {
    $initialPixels = readPixelFavicon($faviconPath);
}
if (!$initialPixels) {
    $initialPixels = array_fill(0, 1024, '#000000');
    createPixelFavicon($initialPixels, $faviconPath);
}
?>

<?php foreach ($googleFonts as $fontName => $fontLink): ?>
    <link rel="stylesheet" href="<?= $fontLink ?>">
<?php endforeach; ?>

<div class="section">
    <h5>Universal Pixel Favicon Creator</h5>
    <p>Design a 32x32 pixel favicon for **<?= htmlspecialchars($siteTitle) ?>**.</p>
</div>

<div class="section">
    <div style="display: flex; gap: 20px;">
        <div>
            <div class="grid-container">
                <div id="y-axis-labels"></div>
                <div class="grid-wrapper">
                    <div id="pixelGrid"></div>
                    <div id="x-axis-labels"></div>
                </div>
            </div>
            <div class="button-group" style="margin-top: 10px;">
                <button type="button" id="drawBtn" title="Draw">✏️</button>
                <button type="button" id="eraserBtn" title="Eraser">🧽</button>
                <button type="button" id="selectBtn" title="Select Area">□</button>
                <button type="button" id="cutBtn" title="Cut Selected Area" disabled>✂️</button>
                <button type="button" id="copyBtn" title="Copy Selected Area" disabled>📄</button>
                <button type="button" id="pasteBtn" title="Paste Copied Area" disabled>🗃️</button>
            </div>
            <div id="clipboardPreviewContainer" style="display: none; margin-top: 10px; text-align: center;">
                <h6>Clipboard</h6>
                <canvas id="clipboardCanvas" width="32" height="32" style="width: 64px; height: 64px; border: 1px solid #333; image-rendering: pixelated;"></canvas>
            </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <label>Drawing Color: <input type="color" id="colorPicker" value="#000000"></label>
            <label>Background Color: <input type="color" id="backgroundColorPicker" value="#ffffff"></label>
            <button type="button" id="setBackgroundBtn">Set Background</button>
            <label>Brush Size:
                <select id="brushSize">
                    <option value="1">1x1</option>
                    <option value="2">2x2</option>
                    <option value="3">3x3</option>
                    <option value="4">4x4</option>
                </select>
            </label>
            <button type="button" id="clearBtn">Clear</button>
            <button type="button" id="previewBtn">Preview</button>
            
            <hr>
            <label>Text (1-3 chars): <input type="text" id="textInput" maxlength="3"></label>
            <label>Font:
                <select id="fontSelector">
                    <?php foreach ($googleFonts as $fontName => $fontLink): ?>
                        <option value="<?= htmlspecialchars($fontName) ?>" style="font-family:'<?= htmlspecialchars($fontName) ?>';"><?= htmlspecialchars($fontName) ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <label>Layout:
                <select id="layoutSelector">
                    <option value="Center">Center</option>
                    <option value="Cascade">Cascade</option>
                    <option value="Horizontal">Horizontal</option>
                    <option value="Vertical">Vertical</option>
                    <option value="Stretch Vertical">Stretch Vertical (3 columns)</option>
                    <option value="Stretch Horizontal">Stretch Horizontal (3 rows)</option>
                </select>
            </label>
            <label>Font Size:
                <input type="number" id="fontSizeInput" value="20" min="8" max="32">
            </label>
            <button type="button" id="generateFromTextBtn">Generate from Text</button>
            <button type="button" id="previewTextBtn">Preview Text</button>

            <form id="pixelFaviconForm" style="margin-top: 20px;">
                <button type="submit">Generate Favicon</button>
            </form>
        </div>
    </div>

    <div id="faviconFeedback"></div>
    <div id="faviconPreviewContainer" style="display:none; margin-top: 20px;">
        <h6>Favicon Preview</h6>
        <div id="faviconPreview" style="width: 32px; height: 32px; border: 1px solid #333;"></div>
    </div>
</div>

<style>
.grid-container {
    display: flex;
    gap: 0;
    position: relative;
    width: fit-content;
}

.grid-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0;
}

#pixelGrid {
    display: grid;
    grid-template-columns: repeat(32, 10px);
    width: 320px;
    height: 320px;
    border: 1px solid #333;
    position: relative;
    z-index: 1;
}

.pixel {
    width: 10px;
    height: 10px;
    border: 1px solid #ccc;
    box-sizing: border-box;
    cursor: pointer;
    position: relative;
}

#x-axis-labels, #y-axis-labels {
    font-size: 8px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    margin-top: 5px;
}

#x-axis-labels {
    display: flex;
    flex-direction: row;
    width: 320px;
    justify-content: space-between;
}

#x-axis-labels div {
    width: 10px;
    text-align: center;
    line-height: 10px;
}

#y-axis-labels {
    display: flex;
    flex-direction: column;
    height: 320px;
    justify-content: space-between; 
    margin-right: 5px;
    margin-top: 0;
    padding-left: 5px;
}

#y-axis-labels div {
    text-align: right;
    height: 10px;
    line-height: 10px;
    padding-right: 2px;
}

.hover-line {
    position: absolute;
    background-color: rgba(221, 221, 221, 0.5);
    z-index: 0;
    pointer-events: none;
    transition: all 0.05s ease-out;
}
.horizontal-hover-line {
    width: 320px;
    height: 10px;
    top: 0;
    left: 0;
}
.vertical-hover-line {
    height: 320px;
    width: 10px;
    top: 0;
    left: 0;
}

.selection-box {
    position: absolute;
    border: 1px dashed #000;
    background-color: rgba(0, 0, 0, 0.1);
    z-index: 2;
    pointer-events: none;
}

.button-group {
    display: flex;
    gap: 5px;
    justify-content: center;
}

.button-group button {
    padding: 5px 10px;
    margin: 0;
    border: 1px solid #ccc;
    background-color: #f0f0f0;
    cursor: pointer;
    font-size: 1.2em;
    line-height: 1;
}

.button-group button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('pixelGrid');
    const colorPicker = document.getElementById('colorPicker');
    const backgroundColorPicker = document.getElementById('backgroundColorPicker');
    const setBackgroundBtn = document.getElementById('setBackgroundBtn');
    const form = document.getElementById('pixelFaviconForm');
    const feedbackElement = document.getElementById('faviconFeedback');
    
    const brushSizeSelector = document.getElementById('brushSize');
    const drawBtn = document.getElementById('drawBtn');
    const eraserBtn = document.getElementById('eraserBtn');
    const selectBtn = document.getElementById('selectBtn');
    const cutBtn = document.getElementById('cutBtn');
    const copyBtn = document.getElementById('copyBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const previewBtn = document.getElementById('previewBtn');
    const faviconPreview = document.getElementById('faviconPreview');
    const faviconPreviewContainer = document.getElementById('faviconPreviewContainer');
    const clipboardPreviewContainer = document.getElementById('clipboardPreviewContainer');
    const clipboardCanvas = document.getElementById('clipboardCanvas');
    const clipboardCtx = clipboardCanvas.getContext('2d');
    const textInput = document.getElementById('textInput');
    const fontSelector = document.getElementById('fontSelector');
    const layoutSelector = document.getElementById('layoutSelector');
    const fontSizeInput = document.getElementById('fontSizeInput');
    const generateFromTextBtn = document.getElementById('generateFromTextBtn');
    const previewTextBtn = document.getElementById('previewTextBtn');
    const xAxisLabels = document.getElementById('x-axis-labels');
    const yAxisLabels = document.getElementById('y-axis-labels');

    let currentTool = 'draw';
    let drawing = false;
    let selecting = false;
    let startPixelIndex = null;
    let selectedPixels = [];
    let selectionBox = null;
    let currentBackgroundColor = backgroundColorPicker.value;
    let clipboard = {
        pixels: null,
        width: 0,
        height: 0
    };

    const initialPixels = <?= json_encode($initialPixels) ?>;

    const size = 32;
    const pixelSize = 10;
    for (let i = 0; i < size * size; i++) {
        const div = document.createElement('div');
        div.classList.add('pixel');
        div.style.backgroundColor = initialPixels[i] || '#ffffff';
        div.dataset.index = i;
        grid.appendChild(div);
    }
    const pixels = grid.querySelectorAll('.pixel');

    // Create axis labels
    for (let i = 1; i <= size; i++) {
        const xDiv = document.createElement('div');
        xDiv.textContent = i;
        xAxisLabels.appendChild(xDiv);
    }
    for (let i = size; i >= 1; i--) {
        const yDiv = document.createElement('div');
        yDiv.textContent = i;
        yAxisLabels.appendChild(yDiv);
    }
    
    // Create hover lines
    const horizontalLine = document.createElement('div');
    horizontalLine.classList.add('hover-line', 'horizontal-hover-line');
    grid.appendChild(horizontalLine);
    
    const verticalLine = document.createElement('div');
    verticalLine.classList.add('hover-line', 'vertical-hover-line');
    grid.appendChild(verticalLine);

    // --- Selection Box ---
    function createSelectionBox() {
        if (selectionBox) return;
        selectionBox = document.createElement('div');
        selectionBox.classList.add('selection-box');
        grid.appendChild(selectionBox);
    }

    function updateSelectionBox(start, end) {
        if (!selectionBox) return;
        const [startX, startY] = [start % size, Math.floor(start / size)];
        const [endX, endY] = [end % size, Math.floor(end / size)];

        const x = Math.min(startX, endX) * pixelSize;
        const y = Math.min(startY, endY) * pixelSize;
        const width = Math.abs(startX - endX) * pixelSize + pixelSize;
        const height = Math.abs(startY - endY) * pixelSize + pixelSize;

        selectionBox.style.left = `${x}px`;
        selectionBox.style.top = `${y}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
    }

    function removeSelectionBox() {
        if (selectionBox) {
            selectionBox.remove();
            selectionBox = null;
        }
    }

    function clearSelection() {
        selectedPixels = [];
        cutBtn.disabled = true;
        copyBtn.disabled = true;
        removeSelectionBox();
    }

    function getSelectedIndices(start, end) {
        const indices = [];
        const [startX, startY] = [start % size, Math.floor(start / size)];
        const [endX, endY] = [end % size, Math.floor(end / size)];

        const [minX, maxX] = [Math.min(startX, endX), Math.max(startX, endX)];
        const [minY, maxY] = [Math.min(startY, endY), Math.max(startY, endY)];

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                indices.push(y * size + x);
            }
        }
        return indices;
    }

    // --- Core Grid Functionality ---
    const getAdjacentPixels = (centerIndex, brushSize) => {
        const neighbors = [];
        const centerRow = Math.floor(centerIndex / size);
        const centerCol = centerIndex % size;
        const halfSize = Math.floor(brushSize / 2);

        for (let rowOffset = -halfSize; rowOffset < brushSize - halfSize; rowOffset++) {
            for (let colOffset = -halfSize; colOffset < brushSize - halfSize; colOffset++) {
                const newRow = centerRow + rowOffset;
                const newCol = centerCol + colOffset;
                if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
                    const newIndex = newRow * size + newCol;
                    neighbors.push(pixels[newIndex]);
                }
            }
        }
        return neighbors;
    };

    grid.addEventListener('mousedown', e => {
        const targetPixel = e.target.closest('.pixel');
        if (!targetPixel) return;

        const index = parseInt(targetPixel.dataset.index);

        if (currentTool === 'draw' || currentTool === 'eraser') {
            drawing = true;
            const brushSize = parseInt(brushSizeSelector.value);
            const targets = getAdjacentPixels(index, brushSize);
            targets.forEach(p => p.style.backgroundColor = currentTool === 'draw' ? colorPicker.value : backgroundColorPicker.value);
        } else if (currentTool === 'select') {
            selecting = true;
            startPixelIndex = index;
            createSelectionBox();
            updateSelectionBox(startPixelIndex, startPixelIndex);
        }
    });

    document.addEventListener('mouseup', () => {
        drawing = false;
        if (selecting) {
            selecting = false;
            if (selectedPixels.length > 0) {
                cutBtn.disabled = false;
                copyBtn.disabled = false;
            }
        }
    });

    grid.addEventListener('mouseleave', () => {
        drawing = false;
        selecting = false;
        horizontalLine.style.display = 'none';
        verticalLine.style.display = 'none';
    });
    
    grid.addEventListener('mousemove', e => {
        const targetPixel = e.target.closest('.pixel');
        if (!targetPixel) return;

        const index = parseInt(targetPixel.dataset.index);
        const col = index % size;
        const row = Math.floor(index / size);

        horizontalLine.style.display = 'block';
        verticalLine.style.display = 'block';
        horizontalLine.style.top = `${row * pixelSize}px`;
        verticalLine.style.left = `${col * pixelSize}px`;

        if (drawing) {
            const brushSize = parseInt(brushSizeSelector.value);
            const targets = getAdjacentPixels(index, brushSize);
            targets.forEach(p => p.style.backgroundColor = currentTool === 'draw' ? colorPicker.value : backgroundColorPicker.value);
        } else if (selecting) {
            updateSelectionBox(startPixelIndex, index);
            selectedPixels = getSelectedIndices(startPixelIndex, index);
        }
    });

    // --- Clipboard Preview ---
    function renderClipboardPreview() {
        if (!clipboard.pixels) {
            clipboardPreviewContainer.style.display = 'none';
            return;
        }
        
        clipboardCanvas.width = clipboard.width;
        clipboardCanvas.height = clipboard.height;
        clipboardCtx.clearRect(0, 0, clipboard.width, clipboard.height);

        let x = 0;
        let y = 0;
        clipboard.pixels.forEach(hexColor => {
            clipboardCtx.fillStyle = hexColor;
            clipboardCtx.fillRect(x, y, 1, 1);
            x++;
            if (x >= clipboard.width) {
                x = 0;
                y++;
            }
        });
        clipboardPreviewContainer.style.display = 'block';
    }

    // --- Button Event Handlers ---
    drawBtn.addEventListener('click', () => {
        currentTool = 'draw';
        grid.style.cursor = 'pointer';
        clearSelection();
    });

    eraserBtn.addEventListener('click', () => {
        currentTool = 'eraser';
        grid.style.cursor = 'pointer';
        clearSelection();
    });

    selectBtn.addEventListener('click', () => {
        currentTool = 'select';
        grid.style.cursor = 'crosshair';
        clearSelection();
    });
    
    copyBtn.addEventListener('click', () => {
        if (selectedPixels.length === 0) return;
        const [start, end] = [selectedPixels[0], selectedPixels[selectedPixels.length - 1]];
        const [startX, startY] = [start % size, Math.floor(start / size)];
        const [endX, endY] = [end % size, Math.floor(end / size)];
        
        const selectionWidth = Math.abs(startX - endX) + 1;
        const selectionHeight = Math.abs(startY - endY) + 1;

        clipboard.pixels = selectedPixels.map(index => getComputedStyle(pixels[index]).backgroundColor);
        clipboard.width = selectionWidth;
        clipboard.height = selectionHeight;

        renderClipboardPreview();
        pasteBtn.disabled = false;
        clearSelection();
    });

    cutBtn.addEventListener('click', () => {
        if (selectedPixels.length === 0) return;
        
        const [start, end] = [selectedPixels[0], selectedPixels[selectedPixels.length - 1]];
        const [startX, startY] = [start % size, Math.floor(start / size)];
        const [endX, endY] = [end % size, Math.floor(end / size)];
        
        const selectionWidth = Math.abs(startX - endX) + 1;
        const selectionHeight = Math.abs(startY - endY) + 1;

        clipboard.pixels = selectedPixels.map(index => getComputedStyle(pixels[index]).backgroundColor);
        clipboard.width = selectionWidth;
        clipboard.height = selectionHeight;
        
        selectedPixels.forEach(index => pixels[index].style.backgroundColor = backgroundColorPicker.value);

        renderClipboardPreview();
        pasteBtn.disabled = false;
        clearSelection();
    });
    
    pasteBtn.addEventListener('click', () => {
        if (!clipboard.pixels) return;
        currentTool = 'paste';
        grid.style.cursor = 'copy';
        clearSelection();
        
        const pasteHandler = (e) => {
            const targetPixel = e.target.closest('.pixel');
            if (!targetPixel) return;
            const startIndex = parseInt(targetPixel.dataset.index);
            const startCol = startIndex % size;
            const startRow = Math.floor(startIndex / size);

            let pasteIndex = 0;
            for (let y = 0; y < clipboard.height; y++) {
                for (let x = 0; x < clipboard.width; x++) {
                    const gridX = startCol + x;
                    const gridY = startRow + y;
                    if (gridX < size && gridY < size) {
                        const targetIndex = gridY * size + gridX;
                        pixels[targetIndex].style.backgroundColor = clipboard.pixels[pasteIndex];
                    }
                    pasteIndex++;
                }
            }

            // Clean up
            grid.removeEventListener('click', pasteHandler);
            currentTool = 'draw';
            grid.style.cursor = 'pointer';
        };
        grid.addEventListener('click', pasteHandler);
    });

    clearBtn.addEventListener('click', () => {
        pixels.forEach(p => p.style.backgroundColor = backgroundColorPicker.value);
        clearSelection();
    });

    setBackgroundBtn.addEventListener('click', () => {
        const newColor = backgroundColorPicker.value;
        pixels.forEach(pixel => {
            const pixelColor = rgbToHex(getComputedStyle(pixel).backgroundColor);
            if (pixelColor === currentBackgroundColor) {
                pixel.style.backgroundColor = newColor;
            }
        });
        currentBackgroundColor = newColor;
        feedbackElement.innerHTML = '<p style="color: green;">Background color updated.</p>';
        setTimeout(() => feedbackElement.innerHTML = '', 3000);
    });

    previewBtn.addEventListener('click', () => {
        const pixelColors = Array.from(pixels).map(p => {
            const computedColor = getComputedStyle(p).backgroundColor;
            return rgbToHex(computedColor);
        });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;

        let x = 0;
        let y = 0;
        pixelColors.forEach(hexColor => {
            context.fillStyle = hexColor;
            context.fillRect(x, y, 1, 1);
            x++;
            if (x >= size) {
                x = 0;
                y++;
            }
        });
        
        faviconPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.width = 32;
        img.height = 32;
        faviconPreview.appendChild(img);
        faviconPreviewContainer.style.display = 'block';
    });

    const textToPixels = (text, font, fontSize, textColor, bgColor, layout) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        
        const chars = text.split('');
        const charCount = chars.length;

        ctx.font = `${fontSize}px "${font}"`;

        switch (layout) {
            case 'Center':
                ctx.textAlign = 'center';
                ctx.fillText(text, size / 2, size / 2);
                break;

            case 'Cascade':
                const cascadeOffset = (fontSize * 0.5) / charCount;
                let startXCascade = (size / 2);
                let startYCascade = (size / 2);

                if (charCount > 1) {
                    const totalOffset = (charCount - 1) * cascadeOffset;
                    startXCascade -= totalOffset / 2;
                    startYCascade -= totalOffset / 2;
                }
                
                ctx.textAlign = 'center';
                chars.forEach((char, i) => {
                    ctx.fillText(char, startXCascade + (i * cascadeOffset), startYCascade + (i * cascadeOffset));
                });
                break;
            
            case 'Horizontal':
                ctx.textAlign = 'left';
                let totalTextWidth = 0;
                const characterMetrics = chars.map(char => {
                    const metrics = ctx.measureText(char);
                    return { width: metrics.width };
                });
                
                characterMetrics.forEach(metrics => {
                    totalTextWidth += metrics.width;
                });
                
                const startXHorizontal = (size / 2) - (totalTextWidth / 2);
                let currentXHorizontal = startXHorizontal;
                
                chars.forEach((char, i) => {
                    ctx.fillText(char, currentXHorizontal, size / 2);
                    currentXHorizontal += characterMetrics[i].width;
                });
                break;

            case 'Vertical':
                ctx.textAlign = 'center';
                const verticalSpacePerChar = size / charCount;
                chars.forEach((char, i) => {
                    const y = verticalSpacePerChar / 2 + (i * verticalSpacePerChar);
                    ctx.fillText(char, size / 2, y);
                });
                break;
            
            case 'Stretch Vertical':
                ctx.textAlign = 'center';
                const stretchVerticalColWidth = size / (charCount || 1);
                chars.forEach((char, i) => {
                    const x = stretchVerticalColWidth / 2 + (i * stretchVerticalColWidth);
                    ctx.fillText(char, x, size / 2);
                });
                break;
            
            case 'Stretch Horizontal':
                ctx.textAlign = 'center';
                const stretchHorizontalRowHeight = size / (charCount || 1);
                chars.forEach((char, i) => {
                    const y = stretchHorizontalRowHeight / 2 + (i * stretchHorizontalRowHeight);
                    ctx.fillText(char, size / 2, y);
                });
                break;
        }

        const imageData = ctx.getImageData(0, 0, size, size).data;
        const newPixels = [];
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            newPixels.push(rgbToHex(`rgb(${r}, ${g}, ${b})`));
        }
        return newPixels;
    };

    const handleTextGeneration = (applyToGrid) => {
        const text = textInput.value.trim();
        if (text.length === 0 || text.length > 3) {
            feedbackElement.innerHTML = '<p style="color: red;">Please enter 1-3 characters.</p>';
            return;
        }
        
        const font = fontSelector.value;
        const layout = layoutSelector.value;
        const fontSize = parseInt(fontSizeInput.value, 10);
        const textColor = colorPicker.value;
        const bgColor = backgroundColorPicker.value;

        document.fonts.load(`${fontSize}px "${font}"`).then(() => {
            const newPixelData = textToPixels(text, font, fontSize, textColor, bgColor, layout);
            
            if (applyToGrid) {
                pixels.forEach((p, i) => {
                    p.style.backgroundColor = newPixelData[i];
                });
                feedbackElement.innerHTML = '<p style="color: green;">Favicon grid updated from text!</p>';
            } else {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 32;
                canvas.height = 32;

                let x = 0;
                let y = 0;
                newPixelData.forEach(hexColor => {
                    ctx.fillStyle = hexColor;
                    ctx.fillRect(x, y, 1, 1);
                    x++;
                    if (x >= size) {
                        x = 0;
                        y++;
                    }
                });

                faviconPreview.innerHTML = '';
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');
                img.width = 32;
                img.height = 32;
                faviconPreview.appendChild(img);
                faviconPreviewContainer.style.display = 'block';
                feedbackElement.innerHTML = '<p style="color: green;">Text preview generated!</p>';
            }
        }).catch(err => {
            console.error('Error loading font:', err);
            feedbackElement.innerHTML = '<p style="color: red;">Error loading font. Please try a different one.</p>';
        });
    };

    generateFromTextBtn.addEventListener('click', () => handleTextGeneration(true));
    previewTextBtn.addEventListener('click', () => handleTextGeneration(false));

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const pixelColors = Array.from(pixels).map(p => {
            const computedColor = getComputedStyle(p).backgroundColor;
            return rgbToHex(computedColor);
        });

        const formData = new FormData();
        formData.append('pixel_data', pixelColors.join(','));

        fetch('', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                feedbackElement.innerHTML = '<p style="color: green;">' + data.message + '</p>';
            } else {
                feedbackElement.innerHTML = '<p style="color: red;">' + data.message + '</p>';
            }
        })
        .catch(error => {
            feedbackElement.innerHTML = '<p style="color: red;">An unexpected error occurred: ' + error.message + '</p>';
            console.error('Error:', error);
        });
    });

    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb;
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
});
</script>