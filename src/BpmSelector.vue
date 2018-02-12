<template>
  <div id="bpmListContainer">
    <b-btn variant="primary" id="bpmListButton">
      BPM 列表
    </b-btn>
    <b-popover target="bpmListButton"
               triggers="click"
               :show.sync="bpmListPopoverShow"
               placement="auto"
               container="bpmListContainer"
               @show="onListShow">
      <template slot="title">
        <div style="padding: .75rem 1.25rem;">
          <span class="bpm-list-header"><span class="d-flex justify-content-center">BPM</span></span>
          <span class="bpm-list-value"><span class="d-flex justify-content-center">持續拍數</span></span>
        </div>
      </template>
      <b-list-group flush>
        <draggable v-model="bpmListInPopover">
          <transition-group name="list-complete">
            <b-list-group-item v-for="bpmDef of bpmListInPopover" :key="bpmDef.bpmIndex" class="list-complete-item"
                               :id="`bpmButton${bpmDef.bpmIndex}`">
              <div v-b-toggle="`bpmData${bpmDef.bpmIndex}`">
                <span class="bpm-list-header"><span class="d-flex justify-content-center">{{bpmDef.bpm | floor}}</span></span>
                <span class="bpm-list-value"><span class="d-flex justify-content-center">{{bpmDef.durationBeats ? bpmDef.durationBeats : '到結束'}}</span></span>
              </div>
              <b-collapse :id="`bpmData${bpmDef.bpmIndex}`">
                <div style="padding-top: 10px;">
                  <div class="mb-1"><span class="bpm-list-header"><span class="d-flex justify-content-center">BPM:</span></span>
                    <span class="bpm-list-value"><b-form-input type="text" style="width: 100%;"
                                                               class="d-flex justify-content-center text-center bpm-list-value"
                                                               v-model.number="bpmDef.bpm"></b-form-input></span>
                  </div>
                  <div><span class="bpm-list-header"><span class="d-flex justify-content-center">拍數:</span></span>
                    <span class="bpm-list-value"><b-form-input type="text" style="width: 100%;"
                                                               class="d-flex justify-content-center text-center"
                                                               v-model.number="bpmDef.durationBeats"></b-form-input></span>
                  </div>
                  <div class="d-flex justify-content-center">
                    <b-btn @click="onBpmDelete(bpmDef.bpmIndex)" size="sm" variant="danger" class="mt-2">刪除</b-btn>
                  </div>
                </div>
              </b-collapse>
            </b-list-group-item>
          </transition-group>
        </draggable>
        <b-list-group-item class="d-flex justify-content-center" @click="addNewBpm()">
          新增一筆
        </b-list-group-item>
      </b-list-group>
      <div class="d-flex justify-content-center mt-2">
        <b-btn @click="onClose" size="sm" variant="danger" class="mr-1">取消</b-btn>
        <b-btn @click="onOk" size="sm" variant="primary">修改</b-btn>
      </div>
    </b-popover>
  </div>
</template>

<script>
  import draggable from 'vuedraggable';

  export default {
    name: "bpm-selector",
    props: ['bpmList'],
    data() {
      return {
        bpmListPopoverShow: false,
        bpmListInPopover: [],
        nextBpmIndex: 3
      }
    },
    methods: {
      onListShow() {
        this.bpmListInPopover = JSON.parse(JSON.stringify(this.bpmList)).map((bpmDef, index) => {
          bpmDef.bpmIndex = index;
          return bpmDef;
        })
      },
      addNewBpm() {
        this.bpmListInPopover.push({
          durationBeats: null,
          bpm: 120,
          bpmIndex: this.nextBpmIndex++
        })
      },
      onBpmDelete(bpmIndex) {
        this.bpmListInPopover = this.bpmListInPopover.filter(bpmDef => bpmDef.bpmIndex !== bpmIndex)
      },
      onClose() {
        this.bpmListPopoverShow = false;
      },
      onOk() {
        const newBpmList = JSON.parse(JSON.stringify(this.bpmListInPopover), (key, value) => key === "bpmIndex" ? undefined : value)
        this.$emit('bpmListEdited', newBpmList);
        this.bpmListPopoverShow = false;
      }
    },
    computed: {},
    created: function () {
    },
    components: {
      draggable
    },
    filters: {
      floor: function (value) {
        if (!value || typeof value !== 'number') {
          return '';
        }
        return +value.toFixed(2);
      }
    }
  }
</script>

<style scoped>
  .bpm-list-header {
    width: 50px;
    padding-right: 10px;
    display: inline-block;
  }

  .bpm-list-value {
    padding-left: 10px;
    border-left: 1px solid rgba(0, 0, 0, 0.125);
    width: 100px;
    display: inline-block;
  }

  .list-complete-item {
    transition: all 1s;
  }

  .list-complete-enter, .list-complete-leave-active {
    opacity: 0;
  }
</style>