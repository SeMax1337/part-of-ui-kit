<template>
  <span />
</template>

<script>
import showAlert from './'

export default {
  name: 'AlertTemplate',
  data: () => ({
    item: null
  }),
  mounted () {
    this.item = showAlert({
      content: this.$slots.default,
      ...this.$attrs
    })
    this.item.onClose = () => this.$emit('close')
  },
  beforeDestroy () {
    this.item.close()
  }
}
</script>
