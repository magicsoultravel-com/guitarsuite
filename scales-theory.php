document.addEventListener('DOMContentLoaded', function() {

    const fretboardTable = document.getElementById('fretboard-table');
    const fretNotationDisplay = document.getElementById('fret-notation-display');
    const relatedChordsDisplay = document.getElementById('related-chords-display');

    if (typeof ASSETS_BASE_PATH === 'undefined') {
        console.error("ASSETS_BASE_PATH is not defined. Ensure it's set in the PHP before loading this script.");
        return; 
    }

    if (!fretboardTable) {
        console.warn("Fretboard table element not found. Interactivity will not be enabled.");
        return;
    }

    let notesData = null;
    let chordsData = null;

    const activeNotes = new Set();
    const stringOrder = ['E', 'A', 'D', 'G', 'B', 'e']; 

    function getNoteFromFret(stringName, fretNumber) {
        if (!notesData || !notesData[stringName]) {
            console.warn(`Notes data not loaded or string "${stringName}" not found in notesData.`);
            return '';
        }
        if (fretNumber === 0) {
            return stringName; 
        }
        return notesData[stringName][fretNumber] || '';
    }

    function updateFretboardDisplay() {
        fretboardTable.querySelectorAll('.selected, .highlighted').forEach(cell => {
            cell.classList.remove('selected', 'highlighted');
        });

        const stringFretsMap = {};
        stringOrder.forEach(str => {
            stringFretsMap[str] = [];
        });

        fretboardTable.querySelectorAll('tbody tr').forEach((row, rowIndex) => {
            const stringNameCell = row.querySelector('td:first-child strong');
            if (!stringNameCell) return;

            const currentStringName = stringNameCell.textContent.trim(); 

            row.querySelectorAll('td').forEach((cell, cellIndex) => {
                let cellNotePitch = '';
                let isFretZeroCell = false;

                if (cellIndex === 0) { 
                    isFretZeroCell = true;
                    cellNotePitch = stringNameCell.textContent.trim(); 
                } else { 
                    const cellStrongTag = cell.querySelector('strong');
                    if (cellStrongTag) {
                        cellNotePitch = cellStrongTag.textContent.trim(); 
                    } else {
                        cellNotePitch = cell.textContent.trim(); 
                    }
                }

                if (cellNotePitch === '') return; 

                cellNotePitch = cellNotePitch.toUpperCase(); 

                if (activeNotes.has(cellNotePitch)) {
                    cell.classList.add('selected');
                    if (isFretZeroCell) {
                        stringFretsMap[currentStringName].push(0);
                    } else {
                        stringFretsMap[currentStringName].push(cellIndex);
                    }
                }
            });
        });

        if (fretNotationDisplay) {
            let notationLines = [];
            stringOrder.forEach(str => {
                if (stringFretsMap[str].length > 0) {
                    stringFretsMap[str].sort((a, b) => a - b);
                    notationLines.push(`${str} - ${stringFretsMap[str].join(', ')}`);
                }
            });

            if (notationLines.length > 0) {
                fretNotationDisplay.innerText = `Selected Frets:\n${notationLines.join('\n')}`;
            } else {
                fretNotationDisplay.innerText = 'Click on notes to see their fret notation here.';
            }
        }

        if (relatedChordsDisplay && chordsData && notesData) {
            const currentSelectedPitches = Array.from(activeNotes);
            let matchedChords = [];

            if (currentSelectedPitches.length === 0) {
                relatedChordsDisplay.innerText = 'Select notes to find related chords.';
                return;
            }

            for (const chordName in chordsData) {
                const chordDetails = chordsData[chordName];
                const chordFrets = chordDetails.variant1;

                if (!chordFrets) {
                    continue;
                }

                const chordPitches = new Set();
                for (const string in chordFrets) {
                    const fret = chordFrets[string];
                    
                    if (fret !== null && fret !== undefined && fret !== 'X') {
                        let stringName = string;
                        if (stringName === 'E1' || stringName === 'E2') {
                            stringName = 'E';
                        } else if (stringName === 'e') {
                            stringName = 'E';
                        }
                        const note = getNoteFromFret(stringName, fret);
                        if (note) {
                            chordPitches.add(note.toUpperCase());
                        }
                    }
                }

                let isMatch = true;
                for (const selectedPitch of currentSelectedPitches) {
                    if (!chordPitches.has(selectedPitch)) {
                        isMatch = false;
                        break;
                    }
                }

                if (isMatch) {
                    matchedChords.push(chordName);
                }
            }

            if (matchedChords.length > 0) {
                relatedChordsDisplay.innerText = `Related Chords:\n${matchedChords.sort().join(', ')}`;
            } else {
                relatedChordsDisplay.innerText = 'No chords found containing ALL selected notes.';
            }
        } else if (relatedChordsDisplay) {
            relatedChordsDisplay.innerText = 'Loading chord data...';
        }
    }

    Promise.all([
        fetch(ASSETS_BASE_PATH + 'notes.json').then(response => response.json()),
        fetch(ASSETS_BASE_PATH + 'chords.json').then(response => response.json())
    ])
    .then(([fetchedNotesData, fetchedChordsData]) => {
        notesData = fetchedNotesData;
        chordsData = fetchedChordsData;
        console.log('Notes and Chords data loaded successfully.');
        updateFretboardDisplay(); 
    })
    .catch(error => {
        console.error('Error loading JSON data:', error);
        if (relatedChordsDisplay) {
            relatedChordsDisplay.innerText = 'Error loading chord data.';
        }
    });

    fretboardTable.addEventListener('click', function(event) {
        const clickedCell = event.target.closest('td');

        if (clickedCell && fretboardTable.contains(clickedCell)) {
            let clickedNotePitch;
            const strongTag = clickedCell.querySelector('strong');
            if (strongTag) {
                clickedNotePitch = strongTag.textContent.trim();
            } else {
                clickedNotePitch = clickedCell.textContent.trim();
            }

            if (clickedNotePitch === '') {
                return;
            }

            clickedNotePitch = clickedNotePitch.toUpperCase(); 

            if (activeNotes.has(clickedNotePitch)) {
                activeNotes.delete(clickedNotePitch);
            } else {
                activeNotes.add(clickedNotePitch);
            }

            updateFretboardDisplay(); 
        }
    });

    updateFretboardDisplay(); 
});