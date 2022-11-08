<template>
  <div
    :class="{
      [$style.Select]: true,
      [$style[`Select_size_${size}`]]: true,
      [$style.Select_error]: error,
      [$style.Select_disabled]: disabled,
      [$style.Select_native]: native
    }"
    tabindex="0"
    @blur="opened = false"
    @keydown="onKeydown"
  >
    <select
      :id="id"
      ref="select"
      v-model="currentValue"
      :class="$style.Select__nativeElement"
      :name="name"
      :disabled="isDisabled"
      tabindex="-1"
    >
      <option v-for="item in itemList" :key="item.value" :value="item.value">
        {{ item.text }}
      </option>
    </select>

    <div
      ref="widget"
      :class="{
        [$style.Select__widget]: true,
        [$style.Select__widget_opened]: opened,
        [$style.Select__widget_native]: native,
        [$style.Select__widget_calculating]: calculating,
        [$style.Select__widget_top]: top,
        [$style.Select__widget_left]: left
      }"
    >
      <div
        :class="{[$style.Select__placeholder]: true, [$style.Select__placeholder_highlighted]: highlighted}"
        @click="clickPlaceholder()"
      >
        <span
          v-if="label"
          :class="{
            [$style.Select__label]: true,
            [$style.Select__label_raised]: isLabelRaised,
            [$style.Select__label_required]: required
          }"
        >{{ label }}</span>
        <span v-if="isLabelRaised">
          <slot
            name="placeholder"
            :currentItem="{currentItemLabel: currentItemLabel, currentValue: currentValue}"
          >
            {{ currentItemLabel }}
          </slot>
        </span>
        <InlineIcon
          :ssr-class="[
            $style.Select__arrow,
            {
              [$style.Select__arrow_up]: opened
            }
          ]"
          name="arrow-select-down"
          size="s"
        />
      </div>
      <transition
        :enter-class="$style.Select__options_fade_enter"
        :enter-active-class="$style.Select__options_fade_active"
        :leave-active-class="$style.Select__options_fade_leaveActive"
        :leave-to-class="$style.Select__options_fade_leaveTo"
        @after-leave="onTransitionEnd"
      >
        <ul
          v-if="opened"
          ref="options"
          :class="$style.Select__options"
          @wheel="onOptionsWheel"
          @mousemove="onOptionsMouseMove"
        >
          <div
            :class="$style.Select__optionsInner"
            @mouseleave="cursor = null"
          >
            <SelectItem
              v-for="item in displayOptions"
              :key="item.value"
              :value="currentValue"
              :cursor="cursor"
              :item="item"
              :class="$style.Select__option"
              :size="size"
              :mouse-changed-since-last-keydown="mouseChangedSinceLastKeydown"
              @change="upChange"
              @cursor-change="cursor = $event"
            >
              <template #optgroup-label="slotProps">
                <slot name="optgroup-label" :item="slotProps.item" />
              </template>
              <template #item="slotProps">
                <slot name="item" :item="slotProps.item" />
              </template>
            </SelectItem>
          </div>
        </ul>
      </transition>
    </div>
  </div>
</template>

<script>
import InlineIcon from '../InlineIcon'
import SelectItem from './SelectItem.vue'
import { isMobileTouchDevice } from '../../lib/env'

export const SIZES = ['m', 's', 'l', 'xl']
const BOUNDARIES_PADDING = 8
const SEARCH_RESET_DELAY = 1000

function getFlatItems (items, labels = []) {
  return items.reduce((result, item) => {
    if (item.subItems) {
      const subItems = getFlatItems(item.subItems, [...labels, item.text])
      result = result.concat(subItems)
    } else {
      result.push({ ...item, labels: [...labels, item.text] })
    }
    return result
  }, [])
}

export default {
  name: 'Select',
  components: {
    SelectItem,
    InlineIcon
  },
  model: {
    prop: 'value',
    event: 'change'
  },
  props: {
    items: {
      type: Array,
      default: () => []
    },
    value: {
      type: [String, Boolean, Number],
      default: undefined
    },
    size: {
      type: String,
      default: SIZES[0],
      validator (value) {
        return SIZES.indexOf(value) !== -1
      }
    },
    id: {
      type: String,
      default: undefined
    },
    name: {
      type: String,
      default: undefined
    },
    error: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    selectedLabelFunc: {
      type: Function,
      default: labels => {
        return labels.join(' / ')
      }
    },
    /**
     * Only for XL
    */
    label: {
      type: String,
      default: undefined
    },
    excludeOptions: {
      type: Array,
      default: () => []
    },
    highlighted: Boolean,
    required: Boolean
  },
  data () {
    return {
      internalValue: undefined,
      cursor: null,
      searchWord: null,
      searchWordTimer: null,
      spaceToViewportEdge: 20,
      selectWidgetActiveClass: false,
      opened: false,
      native: false,
      top: false,
      left: false,
      calculating: false,
      mouseChangedSinceLastKeydown: true
    }
  },
  computed: {
    isDisabled () {
      return this.disabled || !this.items.length
    },
    isItemsFlat () {
      return this.items.every(v => !v.subItems)
    },
    currentValue: {
      get () {
        return this.value !== undefined ? this.value : this.internalValue
      },
      set (value) {
        this.internalValue = value
        this.$emit('change', value)
      }
    },
    itemList () {
      return getFlatItems(this.items)
    },
    displayOptions () {
      const processItems = items => {
        return items
          .filter(item => !this.excludeOptions.includes(item.value))
          .map(item => {
            if (!item.subItems) return item
            else return { ...item, subItems: processItems(item.subItems) }
          })
      }
      return processItems(this.items)
    },
    itemMap () {
      const result = {}
      this.itemList.forEach(item => {
        if ({}.hasOwnProperty.call(result, item.value)) return
        result[item.value] = item
      })
      return result
    },
    currentItem () {
      return this.itemMap[this.currentValue] || this.itemList[0]
    },
    currentItemLabel () {
      if (!this.currentItem) return ''
      return this.selectedLabelFunc(this.currentItem.labels)
    },
    isLabelRaised () {
      if (!this.label) {
        return true
      }
      return this.currentValue
    }
  },
  watch: {
    opened (value) {
      if (value) {
        this.open()
      } else {
        this.cursor = null
      }
    },
    searchWord (v) {
      clearTimeout(this.searchWordTimer)
      this.searchWordTimer = setTimeout(() => {
        this.searchWord = null
      }, SEARCH_RESET_DELAY)
    }
  },
  created () {
    if (this.value !== undefined) this.internalValue = this.value
    else this.internalValue = this.itemList.length ? this.itemList[0].value : undefined
  },
  mounted () {
    if (this.itemList.length && !this.currentValue) {
      this.currentValue = this.itemList[0].value
    }
    if (window && typeof window.matchMedia === 'function') {
      this.native = isMobileTouchDevice() && this.isItemsFlat
    }
  },
  methods: {
    onOptionsWheel (e) {
      if (typeof CSS !== 'undefined' && CSS.supports('overscroll-behavior', 'contain')) return
      const options = this.$refs.options
      const delta = e.wheelDeltaY ? e.wheelDeltaY : e.deltaY * -1
      if (delta < 0 && (options.scrollHeight - options.offsetHeight - options.scrollTop) <= 0) {
        options.scrollTop = options.scrollHeight
        e.preventDefault()
      } else if (delta > 0 && delta > options.scrollTop) {
        options.scrollTop = 0
        e.preventDefault()
      }
    },
    onOptionsMouseMove () {
      this.mouseChangedSinceLastKeydown = true
    },
    clickPlaceholder () {
      if (this.isDisabled) return
      this.opened = !this.opened
      this.$el.focus()
    },
    async open () {
      this.calculating = true
      await this.$nextTick()
      const options = this.$refs.options
      const select = this.$el

      const allSizesOptions = options.getBoundingClientRect()
      const allSizesSelect = select.getBoundingClientRect()

      const height = allSizesOptions.height
      const topSpace = allSizesSelect.top
      const windowH = document.documentElement.clientHeight
      const bottomSpaceForWindowTop = allSizesSelect.bottom
      const bottomSpace = windowH - bottomSpaceForWindowTop

      const width = allSizesOptions.width
      const leftSpace = allSizesSelect.left
      const windowW = document.documentElement.clientWidth
      const rightSpaceForWindowLeft = allSizesSelect.right
      const rightSpace = windowW - rightSpaceForWindowLeft

      if (height > bottomSpace && topSpace > bottomSpace) this.top = true
      if (width > rightSpace && leftSpace > rightSpace) this.left = true

      options.style.maxHeight = Math.max(topSpace, bottomSpace) - this.spaceToViewportEdge + 'px'

      if (options.scrollHeight > options.clientHeight) {
        const selectedItem = document.querySelector('.' + this.$style.SelectItem__option_selected)
        if (selectedItem) {
          const topSpaceTarget = selectedItem.getBoundingClientRect().top
          options.scrollTop = topSpaceTarget - allSizesSelect.height - options.clientHeight / 2 + selectedItem.clientHeight / 2
        }
      }

      this.calculating = false
    },
    upChange (value) {
      this.currentValue = value
      this.opened = false
    },
    onTransitionEnd () {
      this.top = false
      this.left = false
    },
    getVisibleCount () {
      const itemHeight = this.$el.querySelector('.' + this.$style.SelectItem__option).offsetHeight
      return Math.floor((this.$refs.options.offsetHeight - BOUNDARIES_PADDING * 2) / itemHeight)
    },
    getNextPageIndex (direction, idx, items) {
      const last = items.length - 1

      if (!this.hasScroll()) {
        return direction === 'down' ? last : 0
      }

      if (this.isItemsFlat) {
        const visible = this.getVisibleCount()
        const next = direction === 'down' ? idx + visible - 1 : idx - visible
        return next > last ? last : next < 0 ? 0 : next
      }

      const viewportHeight = this.$refs.options.offsetHeight - BOUNDARIES_PADDING * 2
      const els = this.$refs.options.querySelectorAll('.' + this.$style.SelectItem__option)
      const currEl = els[idx]

      if (direction === 'down') {
        const targetTop = currEl.getBoundingClientRect().top + viewportHeight
        for (let i = idx + 1; i < els.length; i++) {
          if (els[i].getBoundingClientRect().top > targetTop) {
            return i
          }
        }
        return els.length - 1
      } else if (direction === 'up') {
        const targetBottom = currEl.getBoundingClientRect().bottom - viewportHeight
        for (let i = idx - 1; i > -1; i--) {
          if (els[i].getBoundingClientRect().bottom < targetBottom) {
            return i
          }
        }
        return 0
      }
    },
    hasScroll () {
      const el = this.$refs.options
      return el.scrollHeight > el.offsetHeight
    },
    highlight (index) {
      const flat = getFlatItems(this.displayOptions).map(v => v.value)
      if (this.cursor === null) {
        this.cursor = this.currentValue
      }
      let next = index
      if (index === 'first') {
        next = 0
      } else if (index === 'last') {
        next = flat.length - 1
      } else if (index === 'next') {
        const idx = this.cursor === null ? -1 : flat.indexOf(this.cursor)
        next = idx + 1
        if (next === flat.length) next = flat.length - 1
      } else if (index === 'prev') {
        const idx = this.cursor === null ? flat.length - 1 : flat.indexOf(this.cursor)
        next = idx - 1
        if (next === -1) next = 0
      } else if (index === 'nextpage') {
        const idx = this.cursor === null ? 0 : flat.indexOf(this.cursor)
        next = this.getNextPageIndex('down', idx, flat)
      } else if (index === 'prevpage') {
        const idx = this.cursor === null ? 0 : flat.indexOf(this.cursor)
        next = this.getNextPageIndex('up', idx, flat)
      }
      this.cursor = flat[next]
      this.scrollToHighlighted()
      this.mouseChangedSinceLastKeydown = false
    },
    async scrollToHighlighted () {
      await this.$nextTick()
      const target = this.$el.querySelector('.' + this.$style.SelectItem__option_highlighted)
      const targetRect = target.getBoundingClientRect()
      const optRect = this.$refs.options.getBoundingClientRect()
      const topBoundary = optRect.top + BOUNDARIES_PADDING
      const bottomBoundary = optRect.bottom - BOUNDARIES_PADDING
      const topOverflow = targetRect.top < topBoundary
      const bottomOverflow = targetRect.bottom > bottomBoundary
      if (bottomOverflow) {
        this.$refs.options.scrollBy(0, targetRect.bottom - bottomBoundary)
      }
      if (topOverflow) {
        this.$refs.options.scrollBy(0, -(topBoundary - targetRect.top))
      }
    },
    lookUp (term, items) {
      for (const item of items) {
        if (item.text.toLowerCase().startsWith(term)) {
          return item.value
        }
        if (item.subItems) {
          const found = this.lookUp(term, item.subItems)
          if (found !== undefined) return found
        }
      }
    },
    search (key) {
      this.searchWord = this.searchWord === null ? key : this.searchWord + key
      const found = this.lookUp(this.searchWord, this.displayOptions)
      if (found !== undefined) {
        this.cursor = found
        this.scrollToHighlighted()
      }
    },
    onKeydown (event) {
      const preventKeys = [
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
        'PageDown',
        'PageUp',
        'Space'
      ]

      if (!this.opened) {
        if (['Enter', 'Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
          event.preventDefault()
          this.opened = true
        }
      } else {
        if (preventKeys.includes(event.code)) {
          event.preventDefault()
        }

        if (event.code === 'ArrowDown') this.highlight('next')
        else if (event.code === 'ArrowUp') this.highlight('prev')
        else if (event.code === 'Home') this.highlight('first')
        else if (event.code === 'End') this.highlight('last')
        else if (event.code === 'PageDown') this.highlight('nextpage')
        else if (event.code === 'PageUp') this.highlight('prevpage')

        if (['Enter', 'Space'].includes(event.code) && this.cursor !== null) {
          this.currentValue = this.cursor
        }

        if (['Escape', 'Enter', 'Space'].includes(event.code)) {
          this.opened = false
        }

        if (event.key.length === 1) {
          this.search(event.key.toLowerCase())
        }
      }
    }
  }
}
</script>

<style module lang="scss" src="./Select.scss" />
