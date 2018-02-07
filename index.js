const JUDGEMENT_LINE_COLOR = 0xFFFFFF;
const MEASURE_LINE_COLOR = 0xFFFFFF;
const NOTE_COLOR = 0xFFFFFF;
const NOTE_SLIDE_COLOR = 0xFFFF00;
const NOTE_LEFT_BORDER_COLOR = 0x0000FF;
const NOTE_RIGHT_BORDER_COLOR = 0xFF0000;
const NOTE_LEFT_LONG_COLOR = 0x2222FF;
const NOTE_RIGHT_LONG_COLOR = 0xFF2222;
const NOTE_LONG_END_COLOR = 0xFFFFFF;
const PIANO_COLOR = 0xDDDDDD;

const NOTE_HEIGHT = 5;

let speed = 2;
let bpmList = [];

let playing = false;
let time = 0;

let currentSheetData = null;
let editMode = false;
let editSlide = 4;
let editNoteWidth = 3;
let editNoteType = 3;

let soundInstance = null;
let soundShift = 1.37;

let noteContainerClickDownPosition = null;
let noteContainerDragSlidePreviewNote = new PIXI.Graphics();

let app = new PIXI.Application({
    width: 280,
    height: 330,
    antialias: true,
    transparent: false,
    resolution: 2,
    backgroundColor: 0
});

let isSimplePianoLine = true;
const pianoLineContainer = new PIXI.Container();
pianoLineContainer.visible = false;
const simplePianoLineContainer = new PIXI.Container();
simplePianoLineContainer.visible = false;

const submeasureContainer = new PIXI.Container();
const sheetNoteContainer = new PIXI.Container();

document.body.appendChild(app.view);
drawJudgementLine();
drawPiano();

let noteContainer = initNoteContainer();
noteContainer.addChild(submeasureContainer);
noteContainer.addChild(sheetNoteContainer);
noteContainer.addChild(noteContainerDragSlidePreviewNote);

app.stage.addChild(pianoLineContainer);
app.stage.addChild(simplePianoLineContainer);
app.stage.addChild(noteContainer);

(() =>
{
    let lastTime;

    function tick(now) {
        if (!lastTime) {
            lastTime = now;
        }
        const deltaTime = now - lastTime;

        if (playing) {
            time += deltaTime / 1000;
        }

        noteContainer.y = 300 + getYByTime(time);

        lastTime = now;
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    loadData("sheet.json");

    app.view.addEventListener('mousewheel', (event) => {
        time += event.deltaY > 0 ? 0.1 : -0.1;
    });

    app.view.addEventListener('wheel', (event) => {
        time += event.deltaY > 0 ? 0.1 : -0.1;
    });

    window.addEventListener('keydown', (event) => {
        switch(event.keyCode) {
        case 32:
            playerControlPlaying(!playing);
            break;
        case 49:
            editNoteType = 0;
            break;
        case 50:
            editNoteType = 1;
            break;
        case 51:
            editNoteType = 2;
            break;
        case 52:
            editNoteType = 3;
            break;
        case 53:
            editNoteType = 4;
            break;
        case 54:
            editNoteType = 5;
            break;
        case 81: // Q
            modifyEditSlide(1);
            break;
        case 87: // W
            modifyEditSlide(2);
            break;
            case 69: // E
            modifyEditSlide(3);
            break;
        case 82: // R
            modifyEditSlide(4);
            break;
        case 84: // T
            modifyEditSlide(6);
            break;
        case 89: // Y
            modifyEditSlide(8);
            break;
        case 85: // U
            modifyEditSlide(12);
            break;
        case 73: // I
            modifyEditSlide(16);
            break;
        }
    });
})();

function modifyEditSlide(newEditSlide) {
    editSlide = newEditSlide;
    createEditContainer(currentSheetData);
}

function playerControlPlaying(isPlaying) {
    playing = isPlaying;
    if (isPlaying) {
        soundInstance.play({
            start: time + soundShift
        });
    } else {
        soundInstance.stop();
    }
}

function exportSheet() {
    return JSON.stringify(currentSheetData, (key, value) => key === "note" ? undefined : value);
}

async function loadData(sheet) {
    // load sound
    PIXI.sound.Sound.from({
      url: './lord.ogg',
      preload: true,
      loaded: async (err, sound) => {
        await loadSheet(sheet);
        soundInstance = sound;
      }
    });
}

async function loadSheet(sheet) {
    clearSheetNoteContainer();
    const response = await fetch('./' + sheet);
    currentSheetData = await response.json();
    loadSheetToContainer(currentSheetData);
}

function getYByTime(time) {
    let totalY = 0;

    for (let bpmDef of bpmList) {
        if (bpmDef.duration == null || bpmDef.duration >= time) {
            totalY += time * bpmDef.bpm * speed;
            break;
        } else {
            totalY += bpmDef.duration * bpmDef.bpm * speed;
            time -= bpmDef.duration;
        }
    }

    return totalY;
}

function loadSheetToContainer(sheetData) {
    // BPM
    for (const bpmDef of sheetData.bpmList) {
        bpmList.push({
            duration: bpmDef.durationBeats ? (60 / bpmDef.bpm) * bpmDef.durationBeats : null,
            bpm: bpmDef.bpm
        })
    }

    // notes
    for (const noteDef of sheetData.noteList) {
        const note = createNoteByDef(noteDef);
        sheetNoteContainer.addChild(note);
        noteDef.note = note;
    }

    // measure
    for (let beat = 0; beat !== sheetData.totalBeats; beat++) {
        sheetNoteContainer.addChild(createMeasureByBeat(beat));
    }

    createEditContainer(sheetData);
}

function createEditContainer(sheetData) {
    // submeasure
    submeasureContainer.removeChildren();
    for (let beat = 0; beat !== sheetData.totalBeats; beat++) {
        for (let slide = 1; slide !== editSlide; slide++) {
            submeasureContainer.addChild(createSubMeasureByBeat(beat + (1 / editSlide * slide)));
        }
    }

    // show piano lines
    if (isSimplePianoLine) {
        simplePianoLineContainer.visible = true;
    } else {
        pianoLieContainer.visible = true;
    }
}

function createSubMeasureByBeat(beat) {
    const y = -getNoteYByBeat(beat);
    const measure = new PIXI.Graphics();
    measure.beginFill(MEASURE_LINE_COLOR);
    measure.drawRect(0, y, 280, 0.2);
    measure.endFill();

    return measure;
}

function createMeasureByBeat(beat) {
    const y = -getNoteYByBeat(beat);
    const measureWithTextContainer = new PIXI.Container();

    const measure = new PIXI.Graphics();
    measure.beginFill(MEASURE_LINE_COLOR);
    measure.drawRect(0, 0, 280, 1);
    measure.endFill();

    const measureText = new PIXI.Text((beat + 1).toString(), new PIXI.TextStyle({
        fontWeight: 'bold',
        fill: MEASURE_LINE_COLOR,
        fontSize: 8
    }));
    measureText.x = 2;
    measureText.y = -15;

    measureWithTextContainer.addChild(measure);
    measureWithTextContainer.addChild(measureText);

    measureWithTextContainer.position.set(0, y);
    return measureWithTextContainer;
}

function initNoteContainer() {
    const noteContainer = new PIXI.Container();

    const mask = new PIXI.Graphics();
    mask.beginFill(0, 0);
    mask.drawRect(0, 0, 280, 300);
    mask.endFill();

    noteContainer.mask = mask;

    noteContainer.interactive = true;
    noteContainer.containsPoint = () => true;
    noteContainer.on('pointerdown', onNoteContainerClick);
    noteContainer.on('pointerup', onNoteContainerClickUp);
    noteContainer.on('pointermove', onNoteContainerDrag);
    noteContainer.addChild(noteContainerDragSlidePreviewNote);

    return noteContainer;
}

function clearSheetNoteContainer() {
    sheetNoteContainer.removeChildren();
}

function onNoteContainerClick(event) {
    if (editMode) {
        const position = event.data.getLocalPosition(noteContainer);
        const pos = getNotePosByX(position.x);
        const beat = getNoteBeatByY(-position.y);

        // find note
        const note = currentSheetData.noteList.find((e) => e.pos === pos && e.beat === beat);
        if (note) {
            sheetNoteContainer.removeChild(note.note);
            currentSheetData.noteList = currentSheetData.noteList.filter(e => e !== note);
        } else {
            if (editNoteType === 0 || editNoteType === 1) {
                const noteDef = {
                    pos: pos,
                    beat: beat,
                    noteType: editNoteType,
                    noteWidth: editNoteWidth
                };

                const note = createNoteByDef(noteDef);
                sheetNoteContainer.addChild(note);
                noteDef.note = note;
                currentSheetData.noteList.push(noteDef);
            } else if (editNoteType === 2 || editNoteType === 3 || editNoteType === 4 || editNoteType === 5) {
                noteContainerClickDownPosition = position;
            }
        }
    }
}

function onNoteContainerDrag(event) {
    if (editMode) {
        if (noteContainerClickDownPosition) {
            const downPosition = noteContainerClickDownPosition;
            const downPos = getNotePosByX(downPosition.x);
            const downBeat = getNoteBeatByY(-downPosition.y);

            const dragPosition = event.data.getLocalPosition(noteContainer);
            const dragPos = getNotePosByX(dragPosition.x);
            const dragBeat = getNoteBeatByY(-dragPosition.y);

            let noteDef = null;

            if (editNoteType === 2 || editNoteType === 3) {
                noteDef = {
                    pos: downPos,
                    beat: downBeat,
                    noteType: editNoteType,
                    noteWidth: editNoteWidth,
                    duration: dragBeat - downBeat,
                    posShift: dragPos - downPos
                };
            } else if (editNoteType === 4 || editNoteType === 5) {
                noteDef = {
                    pos: downPos,
                    beat: downBeat,
                    noteType: editNoteType,
                    noteWidth: editNoteWidth,
                    duration: dragBeat - downBeat
                };
            }

            noteContainerDragSlidePreviewNote.clear();
            setNoteByDef(noteContainerDragSlidePreviewNote, noteDef);
            setNotePosByPosAndBeat(noteContainerDragSlidePreviewNote, noteDef.pos, noteDef.beat);
        }
    }
}

function onNoteContainerClickUp(event) {
    if (editMode) {
        if (noteContainerClickDownPosition) {
            const downPosition = noteContainerClickDownPosition;
            const downPos = getNotePosByX(downPosition.x);
            const downBeat = getNoteBeatByY(-downPosition.y);

            const upPosition = event.data.getLocalPosition(noteContainer);
            const upPos = getNotePosByX(upPosition.x);
            const upBeat = getNoteBeatByY(-upPosition.y);

            let noteDef = null;
            if (editNoteType === 2 || editNoteType === 3) {
                noteDef = {
                    pos: downPos,
                    beat: downBeat,
                    noteType: editNoteType,
                    noteWidth: editNoteWidth,
                    duration: upBeat - downBeat,
                    posShift: upPos - downPos
                };
            }
            else if (editNoteType === 4 || editNoteType === 5) {
                noteDef = {
                    pos: downPos,
                    beat: downBeat,
                    noteType: editNoteType,
                    noteWidth: editNoteWidth,
                    duration: upBeat - downBeat
                };
            }

            const note = createNoteByDef(noteDef);
            sheetNoteContainer.addChild(note);
            noteDef.note = note;
            currentSheetData.noteList.push(noteDef);

            noteContainerClickDownPosition = null;

            noteContainerDragSlidePreviewNote.clear();
        }
    }
}


function drawJudgementLine() {
    let judgementLine = new PIXI.Graphics();
    judgementLine.beginFill(JUDGEMENT_LINE_COLOR);
    judgementLine.drawRect(0, 0, 280, 5);
    judgementLine.endFill();

    judgementLine.x = 0;
    judgementLine.y = 300;
    app.stage.addChild(judgementLine);
}

function drawPianoLine(container, pos) {
    const pianoLine = new PIXI.Graphics();
    pianoLine.beginFill(MEASURE_LINE_COLOR);
    pianoLine.drawRect(pos * 10, 0, 0.2, 300);
    pianoLine.endFill();
    container.addChild(pianoLine);
}

function drawPiano() {
    for (let i = 0; i <= 28; i++) {
        const piano = new PIXI.Graphics();
        piano.beginFill(PIANO_COLOR);
        piano.drawRect(0, 0, 8, 24);
        piano.endFill();

        piano.x = i * 10 + 1;
        piano.y = 306;
        app.stage.addChild(piano);

        drawPianoLine(pianoLineContainer, i);
    }

    const simplePianoLines = [0, 3, 6, 9, 12, 16, 19, 22, 25, 28];
    for (let i of simplePianoLines) {
        drawPianoLine(simplePianoLineContainer, i);
    }
}

function createNoteByDef(noteDef) {
    let note = createNote(noteDef);
    setNotePosByPosAndBeat(note, noteDef.pos, noteDef.beat);
    return note;
}

function createNote(noteDef) {
    let note = new PIXI.Graphics();

    setNoteByDef(note, noteDef);

    return note;
}

function setNoteByDef(note, noteDef) {
    const noteWidthInPixel = 10 * noteDef.noteWidth - 4;

    if ((noteDef.noteType === 2 || noteDef.noteType === 3) && noteDef.duration !== 0) {
        const yShift = -NOTE_HEIGHT / 2;
        const endY = -getNoteYByBeat(noteDef.duration) + yShift;
        if (noteDef.noteType === 2) {
            note.beginFill(NOTE_LEFT_LONG_COLOR);
        } else if (noteDef.noteType === 3) {
            note.beginFill(NOTE_RIGHT_LONG_COLOR);
        }
        note.moveTo(0, yShift);
        note.lineTo(noteWidthInPixel, yShift);
        note.lineTo(noteWidthInPixel + noteDef.posShift * 10, endY);
        note.lineTo(noteDef.posShift * 10, endY);
        note.endFill();
    } else if (noteDef.noteType === 4 || noteDef.noteType === 5) {
        const yShift = -NOTE_HEIGHT / 2;
        if (noteDef.noteType === 4) {
            note.beginFill(NOTE_LEFT_LONG_COLOR);
        } else if (noteDef.noteType === 5) {
            note.beginFill(NOTE_RIGHT_LONG_COLOR);
        }

        note.drawRect(0, yShift, noteWidthInPixel, -getNoteYByBeat(noteDef.duration));
        note.endFill();
    }

    if (noteDef.noteType === 0 || noteDef.noteType === 1 || noteDef.noteType === 4 || noteDef.noteType === 5) {
        note.beginFill(NOTE_COLOR);
    } else if (noteDef.noteType === 2 || noteDef.noteType === 3) {
        note.beginFill(NOTE_SLIDE_COLOR);
    }

    if (noteDef.noteType === 0 || noteDef.noteType === 4) {
        note.lineStyle(1, NOTE_LEFT_BORDER_COLOR, 0.5);
    } else if (noteDef.noteType === 1 || noteDef.noteType === 5) {
        note.lineStyle(1, NOTE_RIGHT_BORDER_COLOR, 0.5)
    }
    note.drawRect(0, -NOTE_HEIGHT, noteWidthInPixel, NOTE_HEIGHT);
    note.endFill();

    // long note end
    if (noteDef.noteType === 4 || noteDef.noteType === 5) {
        note.beginFill(NOTE_LONG_END_COLOR);
        note.drawRect(0, -NOTE_HEIGHT-getNoteYByBeat(noteDef.duration), noteWidthInPixel, NOTE_HEIGHT);
        note.endFill();
    }
}

function setNotePosByPosAndBeat(note, pos, beat) {
    note.position.set(getNoteXByPos(pos), -getNoteYByBeat(beat));
}

function getNoteXByPos(pos) {
    return pos * 10 + 2;
}

function getNotePosByX(x) {
    return Math.floor(x / 10);
}

function getNoteYByBeat(beat) {
    return beat * 60 * speed;
}

function getNoteBeatByY(y) {
    return Math.floor((y / 60 / speed) * editSlide) / editSlide;
}