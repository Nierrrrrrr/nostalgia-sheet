<template>
  <div id="player"></div>
</template>

<script>
  import * as PIXI from 'pixi.js';
  import Tone from 'tone';

  const INIT_SHEET_DATA = {
    totalBeats: 500,
    soundShift: 0,
    bpmList: [{
      durationBeats: null,
      bpm: 120
    }],
    noteList: []
  };

  const textures = {
    piano: null,
    pianoLine: null,
    noteLeft: null,
    noteRight: null,
    noteLong: null,
    measure: null,
    subMeasure: null
  };

  const playerData = {
    noteContainerClickDownPosition: null,
    noteContainerDragSlidePreviewNote: new PIXI.Graphics(),
    app: null,
    isSimplePianoLine: true,
    pianoLineContainer: new PIXI.Container(),
    simplePianoLineContainer: new PIXI.Container(),
    measureContainer: new PIXI.Container(),
    submeasureContainer: new PIXI.Container(),
    sheetNoteContainer: new PIXI.Container(),
    JUDGEMENT_LINE_COLOR: 0xFFFFFF,
    MEASURE_LINE_COLOR: 0xFFFFFF,
    NOTE_COLOR: 0xFFFFFF,
    NOTE_SLIDE_COLOR: 0xFFFF00,
    NOTE_LEFT_BORDER_COLOR: 0x0000FF,
    NOTE_RIGHT_BORDER_COLOR: 0xFF0000,
    NOTE_LEFT_LONG_COLOR: 0x2222FF,
    NOTE_RIGHT_LONG_COLOR: 0xFF2222,
    NOTE_LONG_END_COLOR: 0xFFFFFF,
    PIANO_COLOR: 0xDDDDDD,
    NOTE_HEIGHT: 5,
    lastTime: null,
    bpmList: [],
    currentSheetData: null,
    tickTimer: []
  };

  const audioContext = window.AudioContext || window.webkitAudioContext;
  const tickContext = new audioContext();

  function loadTickSound() {
    const tickReq = new XMLHttpRequest();
    tickReq.open('GET', './static/tick.wav');
    tickReq.responseType = 'arraybuffer';
    tickReq.onload = function() {
      tickContext.decodeAudioData(tickReq.response, function(buffer) {
        playerData.tickSound = buffer;
      });
    };
    tickReq.send();
  }

  function playTickSound() {
    const tickSource = tickContext.createBufferSource();
    tickSource.buffer = playerData.tickSound;
    tickSource.loop = false;
    const tickGainNode = tickContext.createGain();
    tickSource.connect(tickGainNode);
    tickGainNode.connect(tickContext.destination);
    tickSource.start(0, 0);
  }

  function createPianoTexture() {
    const texture = PIXI.RenderTexture.create(8, 24);
    const piano = new PIXI.Graphics();
    piano.beginFill(playerData.PIANO_COLOR);
    piano.drawRect(0, 0, 8, 24);
    piano.endFill();
    playerData.app.renderer.render(piano, texture);
    textures.piano = texture;
  }

  // const piano = new PIXI.Sprite(textures.piano);

  function createMeasureTexture() {
    const texture = PIXI.RenderTexture.create(280, 1);
    const measure = new PIXI.Graphics();
    measure.beginFill(playerData.MEASURE_LINE_COLOR);
    measure.drawRect(0, 0, 280, 1);
    measure.endFill();
    playerData.app.renderer.render(measure, texture);
    textures.measure = texture;
  }

  function createSubMeasureTexture() {
    const texture = PIXI.RenderTexture.create(280, 1);
    const measure = new PIXI.Graphics();
    measure.beginFill(playerData.MEASURE_LINE_COLOR);
    measure.drawRect(0, 0, 280, 1);
    measure.endFill();
    playerData.app.renderer.render(measure, texture);
    textures.subMeasure = texture;
  }

  function createTextures() {
    createPianoTexture();
    createMeasureTexture();
    createSubMeasureTexture();
  }

  export default {
    name: "sheet-player",
    props: {
      editMode: Boolean,
      editNoteType: Number,
      editSlide: Number,
      playing: Boolean,
      speed: Number,
      editNoteWidth: Number,
      soundShift: Number,
      time: Number
    },
    data() {
      return {}
    },
    methods: {
      updateCurrentSheetData: function(sheetData) {
        playerData.currentSheetData = sheetData;
        this.$emit('maxTime', this.getTimeByBeat(sheetData.totalBeats));
      },
      updateTime: function (newTime) {
        this.$emit('update:time', newTime);
      },

      exportSheet: function() {
        return JSON.stringify(playerData.currentSheetData, (key, value) => key === "note" || key === "durationTime" ? undefined : value);
      },

      tick: function (now) {
        if (!playerData.lastTime) {
          playerData.lastTime = now;
        }
        const deltaTime = now - playerData.lastTime;
        let newTime = this.time;

        if (this.playing) {
          newTime += deltaTime / 1000;
          this.updateTime(newTime);

          // play tick
          for (const tickTime of playerData.tickTimer) {
            if (tickTime > this.time && tickTime <= newTime) {
              playTickSound();
              break;
            } else if (tickTime > newTime) {
              break;
            }
          }
        }

        if (playerData.currentSheetData) {
          this.noteContainer.y = 300 + this.getYByTime(newTime);
        }

        playerData.lastTime = now;

        requestAnimationFrame(this.tick);
      },
      drawJudgementLine: function () {
        let judgementLine = new PIXI.Graphics();
        judgementLine.beginFill(playerData.JUDGEMENT_LINE_COLOR);
        judgementLine.drawRect(0, 0, 280, 5);
        judgementLine.endFill();

        judgementLine.x = 0;
        judgementLine.y = 300;
        playerData.app.stage.addChild(judgementLine);
      },
      drawPiano: function () {
        for (let i = 0; i <= 28; i++) {
          const piano = new PIXI.Sprite(textures.piano);

          piano.x = i * 10 + 1;
          piano.y = 306;
          playerData.app.stage.addChild(piano);

          this.drawPianoLine(playerData.pianoLineContainer, i);
        }

        const simplePianoLines = [0, 3, 6, 9, 12, 16, 19, 22, 25, 28];
        for (let i of simplePianoLines) {
          this.drawPianoLine(playerData.simplePianoLineContainer, i);
        }
      },
      drawPianoLine: function (container, pos) {
        const pianoLine = new PIXI.Graphics();
        pianoLine.beginFill(playerData.MEASURE_LINE_COLOR);
        pianoLine.drawRect(pos * 10, 0, 0.2, 300);
        pianoLine.endFill();
        container.addChild(pianoLine);
      },
      initNoteContainer: function () {
        const noteContainer = new PIXI.Container();

        const mask = new PIXI.Graphics();
        mask.beginFill(0, 0);
        mask.drawRect(0, 0, 280, 300);
        mask.endFill();

        noteContainer.mask = mask;

        noteContainer.interactive = true;
        noteContainer.containsPoint = () => true;
        noteContainer.on('pointerdown', this.onNoteContainerClick);
        noteContainer.on('pointerup', this.onNoteContainerClickUp);
        noteContainer.on('pointermove', this.onNoteContainerDrag);
        noteContainer.addChild(playerData.noteContainerDragSlidePreviewNote);

        return noteContainer;
      },
      addNoteToCurrentSheetData(noteDef) {
        playerData.currentSheetData.noteList.push(noteDef);
        this.calculateTickTimeList(playerData.currentSheetData);
      },
      removeNoteFromCurrentSheetData(note) {
        playerData.currentSheetData.noteList = playerData.currentSheetData.noteList.filter(e => e !== note);
        this.calculateTickTimeList(playerData.currentSheetData);
      },
      onNoteContainerClick: function (event) {
        if (this.editMode) {
          const position = event.data.getLocalPosition(this.noteContainer);
          const pos = this.getNotePosByX(position.x);
          const beat = this.getNoteBeatByY(-position.y);

          // find note
          const note = playerData.currentSheetData.noteList.find((e) => e.pos === pos && e.beat === beat);
          if (note) {
            playerData.sheetNoteContainer.removeChild(note.note);
            this.removeNoteFromCurrentSheetData(note);
          } else {
            if (this.editNoteType === 0 || this.editNoteType === 1) {
              const noteDef = {
                pos: pos,
                beat: beat,
                noteType: this.editNoteType,
                noteWidth: this.editNoteWidth
              };

              const note = this.createNoteByDef(noteDef);
              playerData.sheetNoteContainer.addChild(note);
              noteDef.note = note;
              this.addNoteToCurrentSheetData(noteDef);
            } else if (this.editNoteType === 2 || this.editNoteType === 3 || this.editNoteType === 4 || this.editNoteType === 5) {
              playerData.noteContainerClickDownPosition = position;
            }
          }
        }
      },
      onNoteContainerClickUp: function (event) {
        if (this.editMode) {
          if (playerData.noteContainerClickDownPosition) {
            const downPosition = playerData.noteContainerClickDownPosition;
            const downPos = this.getNotePosByX(downPosition.x);
            const downBeat = this.getNoteBeatByY(-downPosition.y);

            const upPosition = event.data.getLocalPosition(this.noteContainer);
            const upPos = this.getNotePosByX(upPosition.x);
            const upBeat = this.getNoteBeatByY(-upPosition.y);

            let noteDef = null;
            if (this.editNoteType === 2 || this.editNoteType === 3) {
              noteDef = {
                pos: downPos,
                beat: downBeat,
                noteType: this.editNoteType,
                noteWidth: this.editNoteWidth,
                duration: upBeat - downBeat,
                posShift: upPos - downPos
              };
            }
            else if (this.editNoteType === 4 || this.editNoteType === 5) {
              noteDef = {
                pos: downPos,
                beat: downBeat,
                noteType: this.editNoteType,
                noteWidth: this.editNoteWidth,
                duration: upBeat - downBeat
              };
            }

            const note = this.createNoteByDef(noteDef);
            playerData.sheetNoteContainer.addChild(note);
            noteDef.note = note;
            this.addNoteToCurrentSheetData(noteDef);
            playerData.noteContainerClickDownPosition = null;
            playerData.noteContainerDragSlidePreviewNote.clear();
          }
        }
      },
      onNoteContainerDrag: function (event) {
        if (this.editMode) {
          if (playerData.noteContainerClickDownPosition) {
            const downPosition = playerData.noteContainerClickDownPosition;
            const downPos = this.getNotePosByX(downPosition.x);
            const downBeat = this.getNoteBeatByY(-downPosition.y);

            const dragPosition = event.data.getLocalPosition(this.noteContainer);
            const dragPos = this.getNotePosByX(dragPosition.x);
            const dragBeat = this.getNoteBeatByY(-dragPosition.y);

            let noteDef = null;

            if (this.editNoteType === 2 || this.editNoteType === 3) {
              noteDef = {
                pos: downPos,
                beat: downBeat,
                noteType: this.editNoteType,
                noteWidth: this.editNoteWidth,
                duration: dragBeat - downBeat,
                posShift: dragPos - downPos
              };
            } else if (this.editNoteType === 4 || this.editNoteType === 5) {
              noteDef = {
                pos: downPos,
                beat: downBeat,
                noteType: this.editNoteType,
                noteWidth: this.editNoteWidth,
                duration: dragBeat - downBeat
              };
            }

            playerData.noteContainerDragSlidePreviewNote.clear();
            this.setNoteByDef(playerData.noteContainerDragSlidePreviewNote, noteDef);
            this.setNotePosByPosAndBeat(playerData.noteContainerDragSlidePreviewNote, noteDef.pos, noteDef.beat);
          }
        }
      },
      createNoteByDef: function (noteDef) {
        let note = this.createNote(noteDef);
        this.setNotePosByPosAndBeat(note, noteDef.pos, noteDef.beat);
        return note;
      },
      createNote: function (noteDef) {
        let note = new PIXI.Graphics();

        this.setNoteByDef(note, noteDef);

        return note;
      },
      setNoteByDef: function (note, noteDef) {
        note.clear();
        const noteWidthInPixel = 10 * noteDef.noteWidth - 4;

        if ((noteDef.noteType === 2 || noteDef.noteType === 3) && noteDef.duration !== 0) {
          const yShift = -playerData.NOTE_HEIGHT / 2;
          const endY = -this.getNoteYByBeat(noteDef.duration) + yShift;
          if (noteDef.noteType === 2) {
            note.beginFill(playerData.NOTE_LEFT_LONG_COLOR);
          } else if (noteDef.noteType === 3) {
            note.beginFill(playerData.NOTE_RIGHT_LONG_COLOR);
          }
          note.moveTo(0, yShift);
          note.lineTo(noteWidthInPixel, yShift);
          note.lineTo(noteWidthInPixel + noteDef.posShift * 10, endY);
          note.lineTo(noteDef.posShift * 10, endY);
          note.endFill();
        } else if (noteDef.noteType === 4 || noteDef.noteType === 5) {
          const yShift = -playerData.NOTE_HEIGHT / 2;
          if (noteDef.noteType === 4) {
            note.beginFill(playerData.NOTE_LEFT_LONG_COLOR);
          } else if (noteDef.noteType === 5) {
            note.beginFill(playerData.NOTE_RIGHT_LONG_COLOR);
          }

          note.drawRect(0, yShift, noteWidthInPixel, -this.getNoteYByBeat(noteDef.duration));
          note.endFill();
        }

        if (noteDef.noteType === 0 || noteDef.noteType === 1 || noteDef.noteType === 4 || noteDef.noteType === 5) {
          note.beginFill(playerData.NOTE_COLOR);
        } else if (noteDef.noteType === 2 || noteDef.noteType === 3) {
          note.beginFill(playerData.NOTE_SLIDE_COLOR);
        }

        if (noteDef.noteType === 0 || noteDef.noteType === 4) {
          note.lineStyle(1, playerData.NOTE_LEFT_BORDER_COLOR, 0.5);
        } else if (noteDef.noteType === 1 || noteDef.noteType === 5) {
          note.lineStyle(1, playerData.NOTE_RIGHT_BORDER_COLOR, 0.5)
        }
        note.drawRect(0, -playerData.NOTE_HEIGHT, noteWidthInPixel, playerData.NOTE_HEIGHT);
        note.endFill();

        // long note end
        if (noteDef.noteType === 4 || noteDef.noteType === 5) {
          note.beginFill(playerData.NOTE_LONG_END_COLOR);
          note.drawRect(0, -playerData.NOTE_HEIGHT - this.getNoteYByBeat(noteDef.duration), noteWidthInPixel, playerData.NOTE_HEIGHT);
          note.endFill();
        }
      },
      setNotePosByPosAndBeat: function (note, pos, beat) {
        note.position.set(this.getNoteXByPos(pos), -this.getNoteYByBeat(beat));
      },
      getNoteXByPos: function (pos) {
        return pos * 10 + 2;
      },
      getNotePosByX: function (x) {
        return Math.floor(x / 10);
      },
      getNoteYByBeat: function (beat) {
        return beat * 60 * this.speed;
      },
      getNoteBeatByY: function (y) {
        return Math.floor((y / 60 / this.speed) * this.editSlide) / this.editSlide;
      },
      getTimeByBeat: function(beat) {
        let totalTime = 0;

        for (let bpmDef of playerData.currentSheetData.bpmList) {
          if (bpmDef.durationBeats === null || bpmDef.durationBeats >= beat) {
            totalTime += beat / bpmDef.bpm * 60;
            break;
          } else {
            totalTime += bpmDef.durationTime;
            beat -= bpmDef.durationBeats;
          }
        }

        return totalTime;
      },
      getYByTime: function (time) {
        let totalY = 0;

        for (let bpmDef of playerData.currentSheetData.bpmList) {
          if (bpmDef.durationTime == null || bpmDef.durationTime >= time) {
            totalY += time * bpmDef.bpm * this.speed;
            break;
          } else {
            totalY += bpmDef.durationTime * bpmDef.bpm * this.speed;
            time -= bpmDef.durationTime;
          }
        }

        return totalY;
      },
      importSheetClick: function () {
        playerData.importedSheet = "";
      },
      onFileChange: function (event) {
        const musicReader = new FileReader();
        musicReader.readAsArrayBuffer(event.target.files[0]);
        musicReader.onload = function (e) {
          const arrayBuffer = e.target.result;
          const context = new audioContext();
          context.decodeAudioData(arrayBuffer, function (buffer) {
            loadMusic(buffer).then(() => {
              // TODO: music loaded
            });
          });
        };
      },
      onWheel: function (deltaY) {
        let newTime = this.time;
        newTime += deltaY > 0 ? 0.1 : -0.1;
        if (newTime < 0) {
          newTime = 0;
        }
        if (this.playing) {
          this.seekMusic(newTime + this.soundShift);
        }
        this.updateTime(newTime);
      },
      repositionSheet: function () {
        playerData.currentSheetData.noteList.forEach(noteDef => {
          this.setNoteByDef(noteDef.note, noteDef);
          this.setNotePosByPosAndBeat(noteDef.note, noteDef.pos, noteDef.beat);
        });
        this.drawMeasuresBySheetData(playerData.currentSheetData);
        this.createEditContainer(playerData.currentSheetData);
      },
      drawMeasuresBySheetData: function (sheetData) {
        playerData.measureContainer.removeChildren();
        for (let beat = 0; beat !== sheetData.totalBeats; beat++) {
          playerData.measureContainer.addChild(this.createMeasureByBeat(beat));
        }
      },
      createMeasureByBeat: function (beat) {
        const y = -this.getNoteYByBeat(beat);
        const measureWithTextContainer = new PIXI.Container();

        const measure = new PIXI.Sprite(textures.measure);

        const measureText = new PIXI.Text((beat + 1).toString(), new PIXI.TextStyle({
          fontWeight: 'bold',
          fill: playerData.MEASURE_LINE_COLOR,
          fontSize: 8
        }));
        measureText.x = 2;
        measureText.y = -15;

        measureWithTextContainer.addChild(measure);
        measureWithTextContainer.addChild(measureText);

        measureWithTextContainer.position.set(0, y);
        return measureWithTextContainer;
      },
      createEditContainer: function (sheetData) {
        // submeasure
        playerData.submeasureContainer.removeChildren();
        for (let beat = 0; beat !== sheetData.totalBeats; beat++) {
          for (let slide = 1; slide !== this.editSlide; slide++) {
            playerData.submeasureContainer.addChild(this.createSubMeasureByBeat(beat + (1 / this.editSlide * slide)));
          }
        }

        // show piano lines
        if (playerData.isSimplePianoLine) {
          playerData.simplePianoLineContainer.visible = true;
        } else {
          playerData.pianoLineContainer.visible = true;
        }
      },
      createSubMeasureByBeat: function (beat) {
        const y = -this.getNoteYByBeat(beat);
        const measure = new PIXI.Sprite(textures.subMeasure);
        measure.scale.y = 0.2;
        measure.position.set(0, y);

        return measure;
      },
      calculateTickTimeList(sheetData) {
        const tickTimeList = new Set();
        for (const noteDef of sheetData.noteList) {
          const noteTime = this.getTimeByBeat(noteDef.beat);
          if (noteDef.durationBeats !== 0 && !tickTimeList.has(noteTime)) {
            tickTimeList.add(noteTime);
          }
        }
        playerData.tickTimer = Array.from(tickTimeList).sort((x, y) => x - y);
      },
      loadSheetToContainer: function (sheetData) {
        playerData.sheetNoteContainer.removeChildren();

        // BPM
        for (const bpmDef of sheetData.bpmList) {
          bpmDef.durationTime = bpmDef.durationBeats ? (60 / bpmDef.bpm) * bpmDef.durationBeats : null;
        }

        playerData.currentSheetData = sheetData;

        // notes
        for (const noteDef of sheetData.noteList) {
          const note = this.createNoteByDef(noteDef);
          playerData.sheetNoteContainer.addChild(note);
          noteDef.note = note;
        }

        // set tick sound
        this.calculateTickTimeList(sheetData);

        // measure
        this.drawMeasuresBySheetData(sheetData);

        this.createEditContainer(sheetData);

        this.updateCurrentSheetData(sheetData);
      },
      playMusic: function (start) {
        if (start >= 0) {
          Tone.Transport.start("+0", "+" + start);
        } else {
          Tone.Transport.start("+" + (-start), "+0")
        }
      },
      stopMusic: function () {
        Tone.Transport.stop();
      },
      seekMusic: function (time) {
        Tone.Transport.seconds = time;
      },
      updateBpmList: function(bpmList) {
        playerData.currentSheetData.bpmList = bpmList;
        this.loadSheetToContainer(playerData.currentSheetData);
      }
    },
    watch: {
      speed: function (newVal) {
        this.repositionSheet(newVal);
      },
      editSlide: function (newVal) {
        if (newVal >= 1) {
          if (playerData.currentSheetData) {
            this.createEditContainer(playerData.currentSheetData);
          }
        }
      },
      playing: function (newVal) {
        if (newVal) {
          this.playMusic(this.time + this.soundShift);
        } else {
          this.stopMusic();
        }
      }
    },
    mounted() {
      playerData.app = new PIXI.Application({
        width: 280,
        height: 330,
        antialias: true,
        transparent: false,
        resolution: 2,
        backgroundColor: 0
      });

      createTextures();

      playerData.pianoLineContainer.visible = false;
      playerData.simplePianoLineContainer.visible = false;

      document.querySelector('#player').appendChild(playerData.app.view);

      this.drawJudgementLine();
      this.drawPiano();

      this.noteContainer = this.initNoteContainer();
      this.noteContainer.addChild(playerData.submeasureContainer);
      this.noteContainer.addChild(playerData.sheetNoteContainer);
      this.noteContainer.addChild(playerData.measureContainer);
      this.noteContainer.addChild(playerData.noteContainerDragSlidePreviewNote);

      playerData.app.stage.addChild(playerData.pianoLineContainer);
      playerData.app.stage.addChild(playerData.simplePianoLineContainer);
      playerData.app.stage.addChild(this.noteContainer);

      requestAnimationFrame(this.tick);

      const mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "wheel" : "mousewheel";
      playerData.app.view.addEventListener(mousewheelevt, (event) => {
        this.onWheel(event.deltaY);
      });

      loadTickSound();
    }
  }
</script>

<style scoped>

</style>