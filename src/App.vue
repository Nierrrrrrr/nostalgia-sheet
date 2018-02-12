<template>
  <b-container>
    <div>
      <b-navbar variant="dark" type="dark" toggleable>
        <b-navbar-brand class="unselectable">Nostalgia Sheet Player</b-navbar-brand>
        <b-navbar-toggle target="nav_dropdown_collapse"></b-navbar-toggle>
        <b-collapse is-nav id="nav_dropdown_collapse">
          <b-navbar-nav>
            <b-nav-item-dropdown text="檔案">
              <b-dropdown-item @click="newSheet">新譜面</b-dropdown-item>
              <b-dropdown-item @click="showSelectModal">選曲</b-dropdown-item>
              <b-dropdown-divider></b-dropdown-divider>
              <input type="file" id="musicFileFromDisk" style="display: none" @change="loadMusicFromDisk">
              <b-dropdown-item @click="loadMusicFromDiskClicked">讀取硬碟音樂檔</b-dropdown-item>
              <b-dropdown-divider></b-dropdown-divider>
              <b-dropdown-item @click="importSheetClicked">匯入</b-dropdown-item>
              <b-dropdown-item @click="exportSheetClicked">匯出</b-dropdown-item>
            </b-nav-item-dropdown>
            <b-nav-item-dropdown text="模式">
              <b-dropdown-item @click="editMode = false"><icon name="check" class="dropdown-check-icon" v-if="!editMode" />瀏覽模式</b-dropdown-item>
              <b-dropdown-item @click="editMode = true"><icon name="check" class="dropdown-check-icon" v-if="editMode" />編輯模式</b-dropdown-item>
            </b-nav-item-dropdown>
            <b-nav-item href="#" v-b-toggle.collapseSettings>設定</b-nav-item>
            <span class="nav-divider"></span>
            <b-button style="width: 2.3rem;" @click="play"><icon :name="playing ? 'pause' : 'play'"/></b-button>
            <b-nav-form>
              <b-form-input type="range" style="width: 300px; margin-left: 10px; margin-right:10px; padding: 0; border: 0;" min="0" :max="maxTime" step="any" v-model.number="time"></b-form-input>
            </b-nav-form>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>

      <b-collapse id="collapseSettings">
        <b-navbar variant="info" type="light">
          <b-nav-form>
            <b-nav-text class="input-text-label">速度:</b-nav-text><b-form-input type="text" placeholder="Speed" style="width: 70px; margin-right: 10px;" v-model.number="speed"></b-form-input>
            <b-nav-text class="input-text-label">音樂偏移:</b-nav-text><b-form-input type="text" placeholder="Shift" style="width: 70px; margin-right: 10px;" v-model.number="soundShift"></b-form-input>
            <b-button-group style="margin-right: 10px;">
              <b-button @click="leftHand" :variant="isLeft ? 'primary' : ''">左手</b-button>
              <b-button @click="rightHand" :variant="!isLeft ? 'primary' : ''">右手</b-button>
            </b-button-group>
            <b-button-group style="margin-right: 10px;">
              <b-button @click="shortNote" :variant="isShortNote ? 'primary' : ''">短鍵</b-button>
              <b-button @click="slideNote" :variant="isSlideNote ? 'primary' : ''">滑鍵</b-button>
              <b-button @click="longNote" :variant="isLongNote ? 'primary' : ''">長條</b-button>
            </b-button-group>
            <b-nav-text class="input-text-label">分拍:</b-nav-text><b-form-input type="text" placeholder="Slice" style="width: 70px; margin-right: 10px" v-model.number="editSlide"></b-form-input>
            <b-nav-text class="input-text-label">音符寬度:</b-nav-text><b-form-input type="text" placeholder="Slice" style="width: 70px; margin-right: 10px" v-model.number="editNoteWidth"></b-form-input>
            <bpm-selector :bpmList="bpmList" @bpmListEdited="bpmListEdited"></bpm-selector>
          </b-nav-form>
        </b-navbar>
      </b-collapse>
    </div>
    <loading :show="isLoading" />
    <song-select :songSelectModal.sync="songSelectModal" @sheetSelected="sheetSelected" />
    <b-modal v-model="exportModal" hide-footer>
      <div slot="modal-title" class="w-100">
        譜面資料 - 匯出
      </div>
      <b-form-textarea plaintext :value="exportedSheet" :rows="20"></b-form-textarea>
    </b-modal>
    <b-modal v-model="importModal" @ok="importSheet">
      <div slot="modal-title" class="w-100">
        譜面資料 - 匯入
      </div>
      <b-form-textarea v-model="importedSheet" :rows="20"></b-form-textarea>
    </b-modal>
    <sheet-player
      style="text-align: center;"
      ref="sheetPlayer"
      :editMode="editMode"
      :editNoteType="editNoteType"
      :editSlide="editSlide"
      :playing="playing"
      :speed="speed"
      :editNoteWidth="editNoteWidth"
      :soundShift="soundShift"
      :time.sync="time"
      @maxTime="newMaxTime => maxTime = newMaxTime"
    />
  </b-container>
</template>

<script>
import SongSelect from "./SongSelect.vue";
import BpmSelector from './BpmSelector.vue';
import SheetPlayer from './SheetPlayer.vue';
import Loading from './Loading.vue';
import Tone from 'tone';

export default {
  components: {
    'song-select': SongSelect,
    'sheet-player': SheetPlayer,
    'loading': Loading,
    'bpm-selector': BpmSelector
  },
  name: 'app',
  methods: {
    bpmListEdited: function(bpmList) {
      this.$refs.sheetPlayer.updateBpmList(bpmList);
    },
    importSheetClicked: function() {
      this.importedSheet = "";
      this.importModal = true;
    },
    newSheet: function() {
      this.loadSheetFromData({
        totalBeats: 500,
        soundShift: 0,
        bpmList: [{
          durationBeats: null,
          bpm: 120
        }],
        noteList: []
      });
    },
    importSheet: function() {
      let currentSheetData;
      if (this.importedSheet.length === 0) {
        currentSheetData = {
          totalBeats: 500,
          soundShift: 0,
          bpmList: [{
            durationBeats: null,
            bpm: 120
          }],
          noteList: []
        };
      } else {
        currentSheetData = JSON.parse(this.importedSheet);
      }
      this.loadSheetFromData(currentSheetData);
    },
    exportSheetClicked: function() {
      this.exportedSheet = this.$refs.sheetPlayer.exportSheet();
      this.exportModal = true;
    },
    loadMusicFromDisk: function(event) {
      this.isLoading = true;
      const musicReader = new FileReader();
      musicReader.readAsArrayBuffer(event.target.files[0]);
      musicReader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const audioContext = window.AudioContext || window.webkitAudioContext;
        const context = new audioContext();
        context.decodeAudioData(arrayBuffer, async (buffer) => {
          await this.loadMusic(buffer);
          this.isLoading = false;
        });
      };
    },
    loadMusicFromDiskClicked: function() {
      document.querySelector('#musicFileFromDisk').click();
    },
    showSelectModal: function() {
      this.playing = false;
      this.songSelectModal = true;
    },
    sheetSelected: async function(data) {
      this.isLoading = true;
      await this.loadMusic(`./static/${data.sheetName}/${data.difficulty}.ogg`);
      await this.loadSheetFromUrl(`./static/${data.sheetName}/${data.difficulty}.json`);
      this.isLoading = false;
    },
    loadMusic: function(url) {
      return new Promise((resolve) => {
        if (this.loadedMusic) {
          this.loadedMusic.unsync();
          this.loadedMusic.disconnect();
        }

        this.loadedMusic = new Tone.Player({
          url: url,
          onload: function() {
            resolve();
          }
        }).toMaster().sync().start(0);
      });
    },
    loadSheetFromUrl: async function(sheetUrl) {
      const response = await fetch(sheetUrl);
      const sheetData = await response.json();
      this.loadSheetFromData(sheetData);
    },
    loadSheetFromData: function(sheetData) {
      this.$refs.sheetPlayer.loadSheetToContainer(sheetData);
      this.soundShift = sheetData.soundShift;
      this.bpmList = sheetData.bpmList;
    },
    play: function() {
      this.playing = !this.playing;
    },
    leftHand: function () {
      if (!this.isLeft) {
        this.editNoteType -= 1;
      }
    },
    rightHand: function () {
      if (this.isLeft) {
        this.editNoteType += 1;
      }
    },
    shortNote: function () {
      this.editNoteType = this.editNoteType % 2;
    },
    slideNote: function () {
      this.editNoteType = this.editNoteType % 2 + 2;
    },
    longNote: function () {
      this.editNoteType = this.editNoteType % 2 + 4;
    }
  },
  data() {
    return {
      songSelectModal: false,
      exportModal: false,
      importModal: false,
      loadedMusic: null,
      editMode: false,
      editNoteType: 0,
      editSlide: 4,
      playing: false,
      speed: 2,
      editNoteWidth: 3,
      soundShift: 0,
      time: 0,
      maxTime: 0,
      exportedSheet: "",
      importedSheet: "",
      isLoading: false,
      bpmList: []
    }
  },
  computed: {
    isLeft: function () {
      return this.editNoteType % 2 === 0;
    },
    isShortNote: function () {
      return this.editNoteType === 0 || this.editNoteType === 1;
    },
    isSlideNote: function () {
      return this.editNoteType === 2 || this.editNoteType === 3;
    },
    isLongNote: function () {
      return this.editNoteType === 4 || this.editNoteType === 5;
    }
  },
  mounted() {
    window.addEventListener('keydown', (event) => {
      switch (event.keyCode) {
        case 32:
          this.play();
          break;
        case 65: // A
          this.editNoteType = 0;
          break;
        case 83: // S
          this.editNoteType = 1;
          break;
        case 68: // D
          this.editNoteType = 2;
          break;
        case 70: // F
          this.editNoteType = 3;
          break;
        case 71: // G
          this.editNoteType = 4;
          break;
        case 72: // H
          this.editNoteType = 5;
          break;
        case 81: // Q
          this.editSlide = 1;
          break;
        case 87: // W
          this.editSlide = 2;
          break;
        case 69: // E
          this.editSlide = 3;
          break;
        case 82: // R
          this.editSlide = 4;
          break;
        case 84: // T
          this.editSlide = 6;
          break;
        case 89: // Y
          this.editSlide = 8;
          break;
        case 85: // U
          this.editSlide = 12;
          break;
        case 73: // I
          this.editSlide = 16;
          break;
      }
    });
    this.newSheet();
  }
}
</script>

<style>
  .unselectable {
    user-select: none;
  }

  .input-text-label {
    margin-right: 5px;
  }

  .nav-divider {
    margin-left: 10px;
    margin-right: 10px;
    border-right: 1px solid #aaa;
  }

  .dropdown-check-icon {
    margin-right: 5px;
  }

  body {
    font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Microsoft JhengHei",serif;
  }
</style>
