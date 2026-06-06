<?php
$notesJsonPath = __DIR__ . '/../assets/notes.json';

if (!file_exists($notesJsonPath)) {
  echo '<p>Error: notes.json file not found.</p>';
  error_log("Fretboard Display Error: notes.json not found at " . $notesJsonPath);
  return;
}

$jsonContent = file_get_contents($notesJsonPath);
$fretboardData = json_decode($jsonContent, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($fretboardData)) {
  echo '<p>Error: Could not decode notes.json.</p>';
  error_log("Fretboard Display Error: Invalid JSON in notes.json: " . json_last_error_msg());
  return;
}

$stringOrder = ['E', 'A', 'D', 'G', 'B', 'e'];
$numDisplayFrets = 16;

$base_project_url_for_js = '';
if (strpos($_SERVER['REQUEST_URI'], '/zdev/guitar/') !== false) {
  $base_project_url_for_js = substr($_SERVER['REQUEST_URI'], 0, strpos($_SERVER['REQUEST_URI'], '/zdev/guitar/') + strlen('/zdev/guitar/'));
  $base_project_url_for_js = strtok($base_project_url_for_js, '?');
  $base_project_url_for_js = rtrim($base_project_url_for_js, '/') . '/';
} else {
  $base_project_url_for_js = '/zdev/guitar/';
}

$assets_js_path = htmlspecialchars($base_project_url_for_js . 'assets/');
$templates_js_path = htmlspecialchars($base_project_url_for_js . 'templates/');
?>

<div class="section">
  <h2>fretboard interactive</h2>
  <div class="table-responsive">
    <table id="fretboard-table">
<thead>
  <tr>
    <th>string</th>
    <?php for ($fret = 1; $fret <= $numDisplayFrets; $fret++): ?>
      <th>
        <?php if (in_array($fret, [5, 7, 9, 12])): ?>
      
            <?php if ($fret == 12): ?>
              ⬤⬤
            <?php else: ?>
              ⬤
            <?php endif; ?>
   
        <?php else: ?>
          <?= $fret ?>
        <?php endif; ?>
      </th>
    <?php endfor; ?>
  </tr>
</thead>
      <tbody>
        <?php foreach ($stringOrder as $string): ?>
          <tr>
            <?php if (isset($fretboardData[$string]) && is_array($fretboardData[$string])): ?>
              <td><strong><?= htmlspecialchars($string) ?></strong></td>
              <?php for ($fret = 1; $fret <= $numDisplayFrets; $fret++): ?>
                <?php
                  $noteIndex = ($fret - 1) % 12 + 1;
                  $note = htmlspecialchars($fretboardData[$string][$noteIndex] ?? '');
                ?>
                <td><?= $note ?></td>
              <?php endfor; ?>
            <?php else: ?>
              <td colspan="<?= 1 + $numDisplayFrets ?>">Data not available for this string.</td>
            <?php endif; ?>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div id="fret-notation-display" style="margin-top: 1em; white-space: pre-wrap;"></div>
  <div id="related-chords-display" style="margin-top: 1em; white-space: pre-wrap;"></div>
</div>

<script>
  var ASSETS_BASE_PATH = '<?php echo $assets_js_path; ?>';
</script>
<script src="<?php echo $templates_js_path; ?>fretboard-interactive.js"></script>