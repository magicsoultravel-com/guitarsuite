/** @typedef {'unsupported' | 'denied' | 'none' | 'ready'} MidiStatusKind */

/**
 * @typedef {{
 *   kind: MidiStatusKind,
 *   deviceName?: string,
 * }} MidiStatus
 */

/**
 * @typedef {{
 *   onNoteOn?: (midiNote: number, velocity: number) => void,
 *   onNoteOff?: (midiNote: number) => void,
 *   onStatus?: (status: MidiStatus) => void,
 * }} MidiInputHandlers
 */

export function isMidiSupported() {
  return typeof navigator !== 'undefined'
    && typeof navigator.requestMIDIAccess === 'function';
}

/**
 * Connect to Web MIDI inputs. Listens for note on/off on all devices;
 * rebinds on hotplug. Returns a disconnect handle.
 *
 * @param {MidiInputHandlers} handlers
 * @returns {{ disconnect: () => void }}
 */
export function connectMidiInput(handlers = {}) {
  const { onNoteOn, onNoteOff, onStatus } = handlers;
  /** @type {MIDIAccess | null} */
  let access = null;
  /** @type {Set<MIDIInput>} */
  const wired = new Set();
  let closed = false;

  function emitStatus(status) {
    onStatus?.(status);
  }

  function reportFromAccess() {
    if (!access) return;
    const inputs = [...access.inputs.values()].filter((i) => i.state === 'connected');
    if (!inputs.length) {
      emitStatus({ kind: 'none' });
      return;
    }
    const name = inputs.map((i) => i.name || i.id).filter(Boolean).join(', ') || 'MIDI';
    emitStatus({ kind: 'ready', deviceName: name });
  }

  /**
   * @param {MIDIMessageEvent} event
   */
  function onMidiMessage(event) {
    const data = event.data;
    if (!data || data.length < 2) return;
    const status = data[0] & 0xf0;
    const note = data[1] & 0x7f;
    const velocity = data.length > 2 ? data[2] & 0x7f : 0;

    if (status === 0x90) {
      if (velocity > 0) {
        onNoteOn?.(note, velocity / 127);
      } else {
        onNoteOff?.(note);
      }
      return;
    }
    if (status === 0x80) {
      onNoteOff?.(note);
    }
  }

  function unwireAll() {
    for (const input of wired) {
      input.removeEventListener('midimessage', onMidiMessage);
    }
    wired.clear();
  }

  function wireAll() {
    if (!access) return;
    unwireAll();
    for (const input of access.inputs.values()) {
      input.addEventListener('midimessage', onMidiMessage);
      wired.add(input);
    }
    reportFromAccess();
  }

  function onStateChange() {
    if (closed) return;
    wireAll();
  }

  if (!isMidiSupported()) {
    emitStatus({ kind: 'unsupported' });
    return { disconnect() {} };
  }

  navigator.requestMIDIAccess({ sysex: false }).then((midiAccess) => {
    if (closed) return;
    access = midiAccess;
    access.addEventListener('statechange', onStateChange);
    wireAll();
  }, () => {
    if (closed) return;
    emitStatus({ kind: 'denied' });
  });

  return {
    disconnect() {
      closed = true;
      unwireAll();
      if (access) {
        access.removeEventListener('statechange', onStateChange);
        access = null;
      }
    },
  };
}
