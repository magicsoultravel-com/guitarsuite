<?php
// Load chord definitions
$chords = json_decode(file_get_contents(realpath(__DIR__ . '/../assets/chords-theory.json')), true);

// Load intervals descriptions
$intervalsJson = json_decode(file_get_contents(realpath(__DIR__ . '/../assets/chords-theory-intervals.json')), true);

// Chromatic scale (sharps only)
$notesChromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Selected root note from GET, default C
$selectedRoot = $_GET['root'] ?? 'C';
if (!in_array($selectedRoot, $notesChromatic)) {
    $selectedRoot = 'C';
}

$rootNumber = array_search($selectedRoot, $notesChromatic);

function getNoteName($rootNumber, $interval, $notesChromatic) {
    return $notesChromatic[($rootNumber + $interval) % 12];
}

function getIntervalName($interval, $intervalsJson) {
    return $intervalsJson[$interval]['names'][0] ?? $interval;
}
?>
<div class="section">
<form method="get">
    <label for="root-select">Select Root Note:</label>
    <select id="root-select" name="root" onchange="this.form.submit()">
        <?php foreach ($notesChromatic as $note): ?>
            <option value="<?= $note ?>" <?= $note === $selectedRoot ? 'selected' : '' ?>>
                <?= $note ?>
            </option>
        <?php endforeach; ?>
    </select>
</form>

<h2>chords theory</h2>
<table>
  <tr>
    <th>Chord Type</th>
    <th>Short</th>
    <th>Intervals (verbal)</th>
    <th>Intervals (semitones)</th>
    <th>Notes</th>
  </tr>

  <?php foreach ($chords as $type => $data):
      $intervals = array_map('intval', explode(' ', $data['intervals']));
      $verbalIntervals = array_map(fn($i) => getIntervalName($i, $intervalsJson), $intervals);
      $semitoneIntervals = implode(' ', array_slice($intervals, 1));
      $notes = array_map(fn($i) => getNoteName($rootNumber, $i, $notesChromatic), $intervals);
      $notesStr = implode(', ', $notes);
      // Replace first character of short with selected root
      $short = $selectedRoot . substr($data['short'], 1);
  ?>
    <tr>
      <td><?= $type ?></td>
      <td><?= $short ?></td>
      <td><?= implode(', ', $verbalIntervals) ?></td>
      <td><?= $semitoneIntervals ?></td>
      <td><?= $notesStr ?></td>
    </tr>
  <?php endforeach; ?>
</table>
</div>
