<?php
$links = json_decode(file_get_contents(__DIR__ . '/../content/useful-links.json'), true);
?>

<div class="section">
        <h2>useful links</h2>
<table>
  <thead>
    <tr>
      <th>Link</th>
      <th>Description</th>
      <th>Added Date</th>
    </tr>
  </thead>
  <tbody>
    <?php foreach ($links as $link): ?>
      <tr>
        <td><a href="<?= htmlspecialchars($link['link']) ?>"><?= htmlspecialchars($link['link']) ?></a></td>
        <td><?= htmlspecialchars($link['description']) ?></td>
        <td><?= htmlspecialchars($link['added_date']) ?></td>
      </tr>
    <?php endforeach; ?>
  </tbody>
</table>
</div>