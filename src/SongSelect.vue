<template>
  <div>
    <b-modal :visible="songSelectModal" @hidden="hideModal" size="lg" hide-footer>
      <div slot="modal-title" class="w-100">
        選擇歌曲
      </div>
      <b-card-group v-for="row in totalRowCount" :key="row">
        <b-card v-for="songIndex in Array(songPerRow).fill(undefined).map((e,i) => i + (row - 1) * songPerRow)"
                v-if="songIndex < songList.length"
                :key="songIndex"
                :title="songList[songIndex].title"
                :sub-title="songList[songIndex].subTitle"
                :img-src="`./static/${songList[songIndex].sheetName}/jacket.png`"
                img-top
                bg-variant="dark"
                text-variant="white"
                class="mb-2">
          <div slot="footer">
            <b-list-group flush>
              <b-list-group-item v-for="difficulty in ['normal', 'hard', 'expert']"
                                 :key="difficulty"
                                 :href="songList[songIndex][difficulty].sheetReady ? '#' : ''"
                                 :variant="getSheetBadgeVariant(songList[songIndex][difficulty].sheetReady)"
                                 @click="onSheetClick(songList[songIndex],difficulty)"
                                 :class="{ 'text-not-selectable': !songList[songIndex][difficulty].sheetReady }"
                                 class="d-flex justify-content-between align-items-center">
                <span class="sheet-difficulty-text">{{ difficulty }}</span>
                <b-badge :variant="getSheetBadgeVariant(songList[songIndex][difficulty].sheetReady)" pill>
                  {{songList[songIndex][difficulty].difficulty}}
                </b-badge>
              </b-list-group-item>
            </b-list-group>
          </div>
        </b-card>
        <div v-else class="empty-card"></div>
      </b-card-group>
    </b-modal>
  </div>
</template>

<script>
  import SongList from './songList';

  export default {
    name: "song-select",
    methods: {
      getSheetBadgeVariant (ready) {
        return ready ? 'primary' : 'secondary';
      },
      onSheetClick (song, difficulty) {
        if (song[difficulty].sheetReady) {
          this.hideModal();
          this.$emit('sheetSelected', {
            sheetName: song.sheetName,
            difficulty: difficulty
          });
        }
      },
      hideModal () {
        this.updateProps('songSelectModal', false);
      },
      updateProps(propName, value) {
        this.$emit(`update:${propName}`, value);
      }
    },
    props: [
      'songSelectModal'
    ],
    data () {
      return {
        songPerRow: 3,
        songList: SongList
      }
    },
    computed: {
      totalRowCount: function () {
        return Math.ceil(this.songList.length / this.songPerRow);
      }
    }
  }
</script>

<style>
  .text-not-selectable {
    user-select: none;
  }

  .empty-card {
    display: flex;
    flex: 1;
  }

  .card-title {
    font-size: 1.25em;
  }

  .card-subtitle {
    font-size: 1em;
  }

  .card-footer {
    padding: 0;
  }

  .sheet-difficulty-text {
    text-transform: capitalize;
  }

  .modal-body {
    max-height: calc(100vh - 115px);
    overflow-y: auto;
  }
</style>