<?php
$notepadFile = __DIR__ . '/../assets/notepad.txt';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $content = $_POST['content'] ?? '';
    file_put_contents($notepadFile, $content);
    echo 'OK';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['ajax']) && $_GET['ajax'] === 'load') {
    if (file_exists($notepadFile)) {
        echo file_get_contents($notepadFile);
    } else {
        echo '';
    }
    exit;
}
?>

<div id="notepad-modal" class="modal-overlay">
  <div class="modal-content">
    notepad
    <textarea id="notepadTextarea" class="modal-textarea"></textarea>
    <div style="margin-top:10px; text-align:right;">
      <button onclick="saveNotepad()">Save</button>
      <button onclick="closeNotepad()">Close</button>
      <span id="notepad-status"></span>
    </div>
  </div>
</div>

<button onclick="openNotepad()" style="position:fixed; bottom:20px; right:20px; z-index:10000; background:#4caf50; border:none; padding:10px 15px; color:#fff; font-weight:bold; border-radius:5px; cursor:pointer;">
  📝 Notepad
</button>

<script>
let saveTimer; 

function triggerAutoSave() {
  clearTimeout(saveTimer); 
  saveTimer = setTimeout(async () => {
    await saveNotepad();
  }, 3000); 
}

document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('notepadTextarea');
    textarea.addEventListener('input', triggerAutoSave);
});

async function openNotepad() {
  const modal = document.getElementById('notepad-modal');
  const textarea = document.getElementById('notepadTextarea');
  const status = document.getElementById('notepad-status');
  modal.style.display = 'flex';

  try {
    const resp = await fetch('notepad.php?ajax=load');
    if (!resp.ok) throw new Error('Failed to load notes');
    const text = await resp.text();
    textarea.value = text;
  } catch(e) {
    alert(e.message);
  }
}

function closeNotepad() {
  clearTimeout(saveTimer);
  document.getElementById('notepad-modal').style.display = 'none';
}

document.getElementById('notepad-modal').addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeNotepad();
    }
});

async function saveNotepad() {
  const content = document.getElementById('notepadTextarea').value;
  try {
    const resp = await fetch('notepad.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'content=' + encodeURIComponent(content)
    });
    if (!resp.ok) throw new Error('Save failed');
    const text = await resp.text();
    if (text.trim() === 'OK') {
      const status = document.getElementById('notepad-status');
      const now = new Date();
      status.textContent = `Last saved ${now.toLocaleTimeString()}`;
    } else {
      throw new Error('Save error');
    }
  } catch(e) {
    alert(e.message);
  }
}

function formatRelativeTime(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return `${interval} years ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return `${interval} months ago`;
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return `${interval} days ago`;
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return `${interval} hours ago`;
  interval = Math.floor(seconds / 60);
  if (interval > 1) return `${interval} minutes ago`;
  return `${seconds} seconds ago`;
}
</script>