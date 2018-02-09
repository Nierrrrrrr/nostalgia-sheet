<template>
  <b-modal :visible="show" size="lg" hide-footer hide-header no-close-on-esc no-close-on-backdrop text-center>
    <div class="text-center">Loading...</div>
    <b-progress :value="100" variant="primary" :animated="true" class="mb-3"></b-progress>
  </b-modal>
</template>

<script>
  export default {
    name: "loading",
    props: {
      show: Boolean
    }
  }
</script>

<style scoped>

</style>