<template>
  <li :class="[$style.SelectItem, rootMod]">
    <template v-if="item.subItems">
      <div :class="$style.SelectItem__label">
        <slot name="optgroup-label" :item="item">
          {{ item.text }}
        </slot>
      </div>
      <ul>
        <SelectItem
          v-for="subItem in item.subItems"
          :key="subItem.value"
          :value="value"
          :cursor="cursor"
          :item="subItem"
          :level="level + 1"
          :size="size"
          :mouse-changed-since-last-keydown="mouseChangedSinceLastKeydown"
          @change="upChange"
          @cursor-change="upCursor"
        >
          <template #optgroup-label="slotProps">
            <slot name="optgroup-label" :item="slotProps.item" />
          </template>
          <template #item="slotProps">
            <slot name="item" :item="slotProps.item" />
          </template>
        </SelectItem>
      </ul>
    </template>
    <div
      v-else
      :class="{
        [$style.SelectItem__option]: true,
        [$style.SelectItem__option_selected]: value === item.value,
        [$style.SelectItem__option_highlighted]: cursor === item.value,
      }"
      @click="upChange(item.value)"
      @mousemove="onMouseMove"
      @mouseleave="if (mouseChangedSinceLastKeydown) upCursor(null)"
    >
      <slot name="item" :item="item">
        {{ item.text }}
      </slot>
    </div>
  </li>
</template>

<script>
export const SIZES = ['m', 's', 'l', 'xl']

export default {
  name: 'SelectItem',
  props: {
    level: {
      type: Number,
      default: 1
    },
    item: {
      type: Object,
      default: undefined
    },
    value: {
      type: [String, Boolean, Number],
      default: null
    },
    cursor: {
      type: [String, Boolean, Number],
      default: null
    },
    size: {
      type: String,
      required: true,
      validator (value) {
        return SIZES.indexOf(value) !== -1
      }
    },
    mouseChangedSinceLastKeydown: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    rootMod () {
      return [
        this.$style[`SelectItem_level_${this.level}`],
        this.$style[`SelectItem_size_${this.size}`],
        this.item.subItems ? this.$style.SelectItem_hasSubs : null
      ]
    }
  },
  methods: {
    upChange (value) {
      this.$emit('change', value)
    },
    upCursor (value) {
      this.$emit('cursor-change', value)
    },
    onMouseMove () {
      const v = this.item.value
      if (this.cursor !== v) {
        this.upCursor(v)
      }
    }
  }
}
</script>

<style lang="scss" src="./Select.scss" module />
