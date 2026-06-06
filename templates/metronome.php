<div class="section">
    <h2>metronome</h2>
    <div>
        <label for="tempo">Tempo (BPM):</label>
        <input type="number" id="tempo" value="120" min="30" max="250">

        <label for="time-signature">Time Signature:</label>
        <select id="time-signature">
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
        </select>

        <label for="note-value">Note Value:</label>
        <select id="note-value">
            <option value="quarter">Quarter Note</option>
            <option value="eighth">Eighth Note</option>
            <option value="sixteenth">Sixteenth Note</option>
        </select>

        <button id="start-metronome">Start</button>
        <button id="stop-metronome" disabled>Stop</button>

        <div id="metronome-display"></div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const tempoInput = document.getElementById('tempo');
    const timeSignatureSelect = document.getElementById('time-signature');
    const noteValueSelect = document.getElementById('note-value');
    const startButton = document.getElementById('start-metronome');
    const stopButton = document.getElementById('stop-metronome');
    const metronomeDisplay = document.getElementById('metronome-display');

    let intervalId = null;
    let currentBeat = 0;
    let beatsPerMeasure = 4; // Default for 4/4

    function calculateInterval() {
        const tempo = parseInt(tempoInput.value);
        const noteValue = noteValueSelect.value; // e.g., 'quarter', 'eighth'

        if (isNaN(tempo) || tempo <= 0) {
            return 0; // Invalid tempo
        }

        let intervalMilliseconds = (60 / tempo) * 1000; // Time per quarter note beat in ms

        // Adjust for different note values
        if (noteValue === 'eighth') {
            intervalMilliseconds /= 2;
        } else if (noteValue === 'sixteenth') {
            intervalMilliseconds /= 4;
        }

        return intervalMilliseconds;
    }

    function updateTimeSignature() {
        const [numerator, denominator] = timeSignatureSelect.value.split('/');
        beatsPerMeasure = parseInt(numerator);
        // We are currently only using the numerator for beat tracking,
        // the denominator is mostly for musical context and note value selection.
    }

    function metronomeBeat() {
        const interval = calculateInterval();
        if (interval === 0) return; // Prevent division by zero or infinite loop

        currentBeat++;
        if (currentBeat > beatsPerMeasure) {
            currentBeat = 1; // Reset to 1 after the last beat of the measure
        }

        // Show the 'TOCK' text
        metronomeDisplay.textContent = 'TOCK'; // Or '1', '2', '3', '4' based on currentBeat if desired

        // Hide the 'TOCK' text shortly after to simulate blinking
        setTimeout(() => {
            metronomeDisplay.textContent = '';
        }, 100); // Display 'TOCK' for 100ms
    }

    function startMetronome() {
        if (intervalId !== null) {
            clearInterval(intervalId);
        }

        updateTimeSignature(); // Set beatsPerMeasure when starting
        currentBeat = 0; // Reset beat count on start

        const interval = calculateInterval();
        if (interval > 0) {
            // Immediately play the first beat, then start the interval
            metronomeBeat();
            intervalId = setInterval(metronomeBeat, interval);
            startButton.disabled = true;
            stopButton.disabled = false;
        } else {
            console.error("Invalid tempo or interval calculation.");
        }
    }

    function stopMetronome() {
        clearInterval(intervalId);
        intervalId = null;
        startButton.disabled = false;
        stopButton.disabled = true;
        metronomeDisplay.textContent = ''; // Clear display when stopped
        currentBeat = 0; // Reset beat count
    }

    // Event Listeners
    startButton.addEventListener('click', startMetronome);
    stopButton.addEventListener('click', stopMetronome);

    // Update time signature on change
    timeSignatureSelect.addEventListener('change', updateTimeSignature);

    // Initial state: disable stop button
    stopButton.disabled = true;
});
</script>