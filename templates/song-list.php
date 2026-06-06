<?php
if (!isset($songs)) {
    $songs = json_decode(file_get_contents(__DIR__ . '/../assets/songs.json'), true);
}
?>

<div id="songTitleModal" style="position: fixed; bottom: 20px; right: 20px; background-color: rgba(255, 255, 255, 0.8); border: 1px solid #ccc; border-radius: 5px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2); width: 300px; height: 30px; overflow: hidden; z-index: 1000; font-size: 0.8em; user-select: none;">
    <div style="background-color: #f0f0f0; padding: 5px 10px; border-bottom: 1px solid #eee; border-top-left-radius: 5px; border-top-right-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.2em; margin: 0; color: #333;">song list</h2>
        <button id="minimizeButton" style="background: none; border: none; font-size: 1em; line-height: 1; padding: 0; margin-left: 10px; cursor: pointer; color: #555;">+</button>
    </div>
    <div id="modalContent" style="padding: 10px; overflow: auto; height: 0; visibility: hidden;">
        <table id="songsTable" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th data-column="artist" style="text-align: left; border-bottom: 1px solid #ccc; cursor: pointer; user-select:none;">
                        Artist <span class="sort-indicator"></span>
                    </th>
                    <th data-column="title" style="text-align: left; border-bottom: 1px solid #ccc; cursor: pointer; user-select:none;">
                        Song <span class="sort-indicator"></span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <?php
                if (!empty($songs)) {
                    foreach ($songs as $index => $song) {
                        echo '<tr>';
                        echo '<td style="padding: 5px; border-bottom: 1px solid #ccc;">';
                        echo '<a href="?songIndex=' . $index . '" style="text-decoration: none; color: #0078d7;">' . htmlspecialchars($song['artist']) . '</a>';
                        echo '</td>';
                        echo '<td style="padding: 5px; border-bottom: 1px solid #ccc;">';
                        echo '<a href="?songIndex=' . $index . '" style="text-decoration: none; color: #0078d7;">' . htmlspecialchars($song['title']) . '</a>';
                        echo '</td>';
                        echo '</tr>';
                    }
                } else {
                    echo '<tr><td colspan="2" style="padding: 5px; text-align: center;">No songs found.</td></tr>';
                }
                ?>
            </tbody>
        </table>
    </div>
    <div id="resizeHandle" style="position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; cursor: nwse-resize; background-color: rgba(0,0,0,0.3); border-radius: 3px; z-index: 1010;"></div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('songTitleModal');
    const minimizeButton = document.getElementById('minimizeButton');
    const modalContent = document.getElementById('modalContent');
    const resizeHandle = document.getElementById('resizeHandle');
    const songsTable = document.getElementById('songsTable');

    let minimized = true; // default minimized

    minimizeButton.addEventListener('click', function() {
        if (!minimized) {
            modal.style.height = '30px';
            modalContent.style.visibility = 'hidden';
            modalContent.style.height = '0';
            minimizeButton.textContent = '+';
        } else {
            modal.style.height = '400px';
            modalContent.style.visibility = 'visible';
            modalContent.style.height = 'calc(100% - 30px)';
            minimizeButton.textContent = '-';
        }
        minimized = !minimized;
    });

    resizeHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = modal.offsetWidth;
        const startHeight = modal.offsetHeight;

        function onMouseMove(e) {
            let deltaX = startX - e.clientX;
            let deltaY = startY - e.clientY;

            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;

            newWidth = Math.max(newWidth, 200);
            newHeight = Math.max(newHeight, 100);

            newWidth = Math.min(newWidth, window.innerWidth - 40);
            newHeight = Math.min(newHeight, window.innerHeight - 40);

            modal.style.width = newWidth + 'px';
            modal.style.height = newHeight + 'px';
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Sorting logic
    let sortDirection = {
        artist: 1,
        title: 1
    };

    const headers = songsTable.querySelectorAll('th[data-column]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            sortDirection[column] = -sortDirection[column]; // toggle sort

            sortTableByColumn(songsTable, column, sortDirection[column]);

            // Update indicators
            headers.forEach(h => {
                h.querySelector('.sort-indicator').textContent = '';
            });
            header.querySelector('.sort-indicator').textContent = sortDirection[column] === 1 ? ' ▲' : ' ▼';
        });
    });

    function sortTableByColumn(table, column, direction) {
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.querySelectorAll('tr'));

        const columnIndex = column === 'artist' ? 0 : 1;

        rows.sort((a, b) => {
            const aText = a.cells[columnIndex].textContent.trim().toLowerCase();
            const bText = b.cells[columnIndex].textContent.trim().toLowerCase();

            if (aText < bText) return -1 * direction;
            if (aText > bText) return 1 * direction;
            return 0;
        });

        // Append sorted rows back
        rows.forEach(row => tbody.appendChild(row));
    }
});
</script>
