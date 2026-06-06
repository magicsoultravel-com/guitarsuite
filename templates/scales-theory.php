<?php
$scalesFile = __DIR__ . '/../assets/scales-theory.json';
$scales = json_decode(file_get_contents($scalesFile), true);
?>

<div class="section">
  <h2>scales / modes</h2>
  <table>
    <thead>
      <tr>
        <th>name</th>
        <th>steps</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($scales as $name => $data): ?>
        <tr>
          <td><?= htmlspecialchars($name) ?></td>
          <td><code><?= implode(' ', $data['steps']) ?></code></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
