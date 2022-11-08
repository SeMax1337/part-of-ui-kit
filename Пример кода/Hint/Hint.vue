<template>
  <transition
    :enter-class="$style.Hint_hidden"
    :leave-active-class="$style.Hint_hidden"
    @enter="open"
    @before-enter="$emit('before-show')"
    @after-enter="$emit('after-show')"
    @before-leave="$emit('before-hide')"
    @after-leave="$emit('after-hide')"
  >
    <div
      v-show="_show"
      :class="cls"
      :style="hintStyles"
      @mouseenter="conditionalToggle"
      @mouseleave="conditionalToggle"
      @click.stop
    >
      <div :class="$style.Hint__inner">
        <template v-if="type === 'confirm'">
          <span :class="$style.Hint_label">
            <slot>
              {{ $t('Are you sure?') }}
            </slot>
          </span>
          <div :class="$style.Hint__buttons">
            <HintButton
              :light="kind === 'light'"
              @click="confirm"
            >
              {{ $t('Yes') }}
            </HintButton>
            <HintButton
              :light="kind === 'light'"
              :plain="true"
              @click="cancel"
            >
              {{ $t('No') }}
            </HintButton>
          </div>
        </template>
        <slot v-else />
      </div>
      <div :class="$style.Hint__tail" :style="tailStyles" />
    </div>
  </transition>
</template>

<script>
import HintButton from './HintButton.vue'
import NarrowViewportMixin from '../../lib/NarrowViewportMixin'

export const POSITIONS = ['bottom', 'left', 'right', 'top']
export const ALIGNS = ['center', 'start', 'end']
export const KINDS = ['regular', 'light', 'error']
export const TYPES = ['help', 'confirm']

export default {
  name: 'Hint',
  components: { HintButton },
  mixins: [NarrowViewportMixin],
  model: {
    prop: 'show',
    event: 'toggle'
  },
  props: {
    show: {
      type: Boolean,
      default: undefined
    },
    showOnHover: {
      type: Boolean,
      default: true
    },
    mountTo: {
      type: typeof window === 'object' ? window.HTMLElement : Object,
      required: false,
      default: () => typeof document === 'object' ? document.body : undefined
    },
    position: {
      type: String,
      default: POSITIONS[0],
      validator (value) {
        return POSITIONS.indexOf(value) !== -1
      }
    },
    align: {
      type: String,
      default: ALIGNS[0],
      validator (value) {
        return ALIGNS.indexOf(value) !== -1
      }
    },
    kind: {
      type: String,
      default: KINDS[0],
      validator (value) {
        return KINDS.indexOf(value) !== -1
      }
    },
    type: {
      type: String,
      default: TYPES[0],
      validator (value) {
        return TYPES.indexOf(value) !== -1
      }
    },
    targetref: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      hintStyles: {},
      tailStyles: {},
      showData: false,
      positionLocal: null,
      alignLocal: null
    }
  },
  computed: {
    _show: {
      get () {
        return this.show !== undefined ? this.show : this.showData
      },
      set (value) {
        if (this.show === undefined) this.showData = value
        this.$emit('toggle', value)
      }
    },
    cls () {
      return [
        this.$style.Hint,
        this.$style[`Hint_${this.positionLocal}`],
        this.$style[`Hint_${this.alignLocal}`],
        this.$style[`Hint_${this.kind}`]
      ]
    }
  },
  i18n: {
    locale: 'ru',
    messages: {
      ru: {
        'Are you sure?': 'Уверены?',
        Yes: 'Да',
        No: 'Нет'
      }
    }
  },
  watch: {
    _show (value) {
      if (!value) return
      this.justShowed = true
      setTimeout(() => {
        this.justShowed = false
      }, 100)
    },
    align: {
      handler (value) {
        this.alignLocal = value
      },
      immediate: true
    },
    position: {
      handler (value) {
        this.positionLocal = value
      },
      immediate: true
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.target = this.findTarget()
      if (!this.target) return

      if (this.target.length) {
        this.target = this.target[0]
      }
      if (this.target.$el) {
        this.target = this.target.$el
      }

      this.hint = this.$el
      if (this.mountTo) {
        this.mountTo.appendChild(this.hint)
      }
      if (this.showOnHover) {
        this.target.addEventListener('mouseenter', this.conditionalToggle)
        this.target.addEventListener('mouseleave', this.conditionalToggle)
      } else if (this.type !== 'confirm') {
        window.addEventListener('click', this.conditionalToggle)
      } else {
        window.addEventListener('click', this.cancel)
      }

      if (this.isNarrowViewport) {
        this.alignLocal = 'center'

        if (['left', 'right'].includes(this.positionLocal)) {
          this.positionLocal = 'bottom'
        }
      }
    })
  },
  destroyed () {
    if (this.mountTo && this.hint && this.hint.parentNode === this.mountTo) {
      this.mountTo.removeChild(this.hint)
    }
  },
  beforeDestroy () {
    if (this.target) {
      this.target.removeEventListener('mouseenter', this.conditionalToggle)
      this.target.removeEventListener('mouseleave', this.conditionalToggle)
    }
    window.removeEventListener('click', this.conditionalToggle)
    window.removeEventListener('click', this.cancel)
  },
  methods: {
    open () {
      // Нужно при использовании одной подсказки в разных положениях или с разным содержимым,
      // чтобы браузер успел по-новой вычислить параметры её элемента.
      this.$nextTick(() => {
        this.openNow()
        this.$nextTick(() => {
          this.openNow()
        })
      })
    },
    openNow () {
      const targetRect = this.target.getBoundingClientRect()
      const shift = 26
      const isFlat = targetRect.height < 2 * shift
      const isNarrow = targetRect.width < 2 * shift

      const indent = 2

      let posT = 0
      let posL = 0

      if (this.positionLocal === 'left' || this.positionLocal === 'right') {
        if (this.positionLocal === 'left') {
          posL = targetRect.left - this.hint.offsetWidth - indent
        } else {
          posL = targetRect.left + targetRect.width + indent
        }
        if (this.alignLocal === 'start') {
          posT = targetRect.top - (isFlat ? shift - targetRect.height / 2 : 0)
        } else if (this.alignLocal === 'end') {
          posT = targetRect.top + targetRect.height - this.hint.offsetHeight + (isFlat ? shift - targetRect.height / 2 : 0)
        } else {
          posT = targetRect.top + (targetRect.height - this.hint.offsetHeight) / 2
        }
      } else {
        if (this.positionLocal === 'top') {
          posT = targetRect.top - this.hint.offsetHeight - indent
        } else {
          posT = targetRect.top + targetRect.height + indent
        }
        if (this.alignLocal === 'start') {
          posL = targetRect.left - (isNarrow ? shift + 1 - targetRect.width / 2 : 0)
        } else if (this.alignLocal === 'end') {
          posL = targetRect.left + targetRect.width - this.hint.offsetWidth + (isNarrow ? shift - 1 - targetRect.width / 2 : 0)
        } else {
          posL = targetRect.left + targetRect.width / 2 - this.hint.offsetWidth / 2
        }
      }
      posL = Math.ceil(posL + window.pageXOffset)
      posT = Math.ceil(posT + window.pageYOffset)

      // обработка выхода за пределы экрана
      const offset = 16
      if (['top', 'bottom'].includes(this.positionLocal)) {
        const right = posL + this.hint.offsetWidth > window.innerWidth - offset
        if (right) posL = window.innerWidth - offset - this.hint.offsetWidth
        const left = posL < offset
        if (left) posL = offset
        if (left || right) this.moveTail(posL)
      }

      this.$set(this.hintStyles, 'top', posT + 'px')
      this.$set(this.hintStyles, 'left', posL + 'px')
      this.$once('after-hide', () => {
        this.$set(this.hintStyles, 'top', '')
        this.$set(this.hintStyles, 'left', '')
      })
    },
    moveTail (posL) {
      const targetRect = this.target.getBoundingClientRect()
      const l = targetRect.left + targetRect.width / 2 - posL
      this.$set(this.tailStyles, 'left', l + 'px')

      this.$once('after-hide', () => {
        this.tailStyles.left = ''
      })
    },
    conditionalToggle (event) {
      if (
        event.type === 'click' &&
        this._show &&
        !this.justShowed &&
        (this.menu || !this.$el.contains(event.target))
      ) {
        this._show = false
      }
      if (!this.showOnHover) return

      if (
        event.type === 'mouseenter' &&
        !this._show
      ) {
        this._show = true
      } else if (
        event.type === 'mouseleave' &&
        this._show &&
        !this.$el.contains(event.relatedTarget) &&
        !this.target.contains(event.relatedTarget)
      ) {
        this._show = false
      }
    },
    confirm () {
      this.$emit('confirm')
      this._show = false
    },
    cancel () {
      if (this.justShowed || !this._show) return
      this.$emit('cancel')
      this._show = false
    },
    findTarget () {
      let parent = this.$parent
      let target
      while (parent !== undefined && parent.$refs !== undefined) {
        if (parent.$refs[this.targetref]) {
          target = parent.$refs[this.targetref]
          break
        }
        parent = parent.$parent
      }
      return target
    }
  }
}
</script>

<style module lang="scss">
@import "../../lib/variables";
@import "../../lib/mixins";

$arrowSize: 7px;
$hintPadding: 1px + 0.5 * $arrowSize;

// stylelint-disable no-descending-specificity

.Hint {
  position: absolute !important; /* !important for IE */
  z-index: 100;
  opacity: 1;
  color: $white;
  font-size: $fontSmall;
  transition: opacity 0.2s;
  margin-right: 16px;
  max-width: 288px;
}

.Hint__inner {
  background: $darkGrey;
  padding: 12px 16px;
  border-radius: 8px;
}

.Hint__tail {
  position: absolute;
  z-index: 105;
  width: $arrowSize;
  height: $arrowSize;
  background: $darkGrey;
  border: inherit;
  transform: rotate(45deg);
}

.Hint_top {
  padding: 0 0 $hintPadding 0;

  .Hint__tail {
    left: 50%;
    bottom: 2px;
    transform: translate(2px, 0) rotate(45deg);
  }
}

.Hint_bottom {
  padding: $hintPadding 0 0 0;

  .Hint__tail {
    left: 50%;
    top: 2px;
    transform: translate(2px, 0) rotate(45deg);
  }
}

.Hint_left {
  padding: 0 $hintPadding 0 0;

  .Hint__tail {
    top: 50%;
    right: 2px;
    transform: translate(0, 1px) rotate(45deg);
  }
}

.Hint_right {
  padding: 0 0 0 $hintPadding;

  .Hint__tail {
    top: 50%;
    left: 2px;
    transform: translate(0, 1px) rotate(45deg);
  }
}

.Hint_left,
.Hint_right {
  &.Hint_center .Hint__tail {
    margin-top: -5px;
  }
}

.Hint_top,
.Hint_bottom {
  &.Hint_center .Hint__tail {
    margin-left: -5px;
  }
}

.Hint_start {
  &.Hint_top .Hint__tail,
  &.Hint_bottom .Hint__tail {
    left: 22px;
  }

  &.Hint_left .Hint__tail,
  &.Hint_right .Hint__tail {
    top: 22px;
  }
}

.Hint_end {
  &.Hint_top .Hint__tail,
  &.Hint_bottom .Hint__tail {
    left: auto;
    right: 22px;
  }

  &.Hint_left .Hint__tail,
  &.Hint_right .Hint__tail {
    top: auto;
    bottom: 22px;
  }
}

.Hint a:link,
.Hint a:visited {
  color: $white;
}

.Hint_error {
  &::before,
  &::after {
    background: $red;
  }

  & > .Hint__inner,
  & > .Hint__tail {
    color: $white;
    background: $red;
  }
}

.Hint_label {
  margin-right: 7px;
}

.Hint_light {
  .Hint__tail {
    background: $white;
    box-shadow: 0 4px 20px rgba($black, 0.1);
  }

  & > .Hint__inner {
    background: $white;
    color: $almostBlack;
    box-shadow: 0 4px 20px rgba($black, 0.1);

    a:link,
    a:visited {
      color: $almostBlack;
    }
  }

  & > .Hint__tail {
    background: $white;
  }
}

.Hint__buttons {
  margin-top: 8px;
  white-space: nowrap;
  position: relative;
  cursor: default;
}

.Hint_hidden {
  opacity: 0;
}

@include mobile {
  @media (max-width: max-mobile-width()) {
    .Hint {
      max-width: calc(100% - 32px);
    }
  }
}
</style>
