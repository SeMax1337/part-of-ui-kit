<template>
  <div :class="$style.AlertContainer">
    <div :class="$style.AlertContainer__itemsWrap">
      <transition-group
        :enter-class="$style.ListTransitionEnter"
        :leave-to-class="$style.ListTransitionLeaveTo"
        :leave-active-class="$style.ListTransitionActive"
        tag="div"
      >
        <AlertBox
          v-for="item in items"
          :key="item.id"
          :class="$style.AlertContainer__item"
          v-bind="item"
          @close="close(item)"
        />
      </transition-group>
    </div>
  </div>
</template>

<script>
import AlertBox from './AlertBox'
import { nanoid } from 'nanoid'

export default {
  name: 'AlertContainer',
  components: {
    AlertBox
  },
  data () {
    return {
      items: []
    }
  },
  methods: {
    close (item) {
      this.items = this.items.filter(v => v.id !== item.id)
      if (typeof item.onClose === 'function') {
        item.onClose()
      }
    },
    add (item) {
      const newItem = {
        id: nanoid(),
        ...item
      }
      newItem.close = this.close.bind(this, newItem)
      this.items.splice(0, 0, newItem)
      return newItem
    }
  }
}
</script>

<style module lang="scss">
$transitionFunction: cubic-bezier(0.25, 0.1, 0.25, 1);
$transitionTime: 0.2s;

.AlertContainer {
  display: block;
  position: fixed;
  top: 0;
  right: 0;
  padding: 48px;
  min-width: 284px;
  box-sizing: content-box;
  z-index: 100;
  pointer-events: none;
}

.AlertContainer__itemsWrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: all;
}

.AlertContainer__item {
  margin-bottom: 16px;
  transition: all $transitionTime $transitionFunction;
}

.ListTransitionEnter,
.ListTransitionLeaveTo {
  opacity: 0;
  transform: translateX(100%);
  position: relative;
  z-index: 1;
}

.ListTransitionActive {
  position: absolute;
}
</style>
