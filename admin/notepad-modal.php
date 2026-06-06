<?php
require_once __DIR__ . '/../inc/auth.php';
if (!is_admin()) exit;
?>
<!-- Notepad Modal + Button HTML + JS -->
<div id="notepad-modal" class="modal-overlay">
  <div class="modal-content">
    <h2 style="margin-top:0;">Admin Notepad</h2>
    <textarea id="notepadTextarea" class="modal-textarea"></textarea>
    <div style="margin-top:10px; text-align:right;">
      <button onclick="saveNotepad()">Save</button>
      <button onclick="closeNotepad()">Close</button>
      <span id="notepad-status" style="margin-left:15px; color:#4caf50; display:none;">Saved!</span>
    </div>
  </div>
</div>

<!-- Floating button to open notepad -->
<button onclick="openNotepad()" style="position:fixed; bottom:20px; right:20px; z-index:10000; background:#4caf50; border:none; padding:10px 15px; color:#fff; font-weight:bold; border-radius:5px; cursor:pointer;">
  📝 Notepad
</button>

<script>
async function openNotepad() {
  const modal = document.getElementById('notepad-modal');
  const textarea = document.getElementById('notepadTextarea');
  const status = document.getElementById('notepad-status');
  modal.style.display = 'flex';
  status.style.display = 'none';

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
  document.getElementById('notepad-modal').style.display = 'none';
  document.getElementById('notepad-status').style.display = 'none';
}

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
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    } else {
      throw new Error('Save error');
    }
  } catch(e) {
    alert(e.message);
  }
}
</script>