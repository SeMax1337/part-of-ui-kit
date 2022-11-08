<template>
  <div :class="cls" @click="$refs.input.focus()">
    <component
      :is="tag"
      ref="input"
      :class="$style.Input__native"
      v-bind="attrs"
      :value.prop="internalValue"
      v-on="listeners"
    />
    <span :class="$style.Input__label">{{ label }}</span>
    <span
      v-if="$slots.addon"
      :class="$style.Input__addon"
    >
      <slot name="addon" />
    </span>
  </div>
</template>

<script>
import { insert, splice, capitalize } from '../../lib/utils/string'

// TODO: используются только m и l, по идее можно и нужно удалить
export const SIZES = ['m', 's', 'l', 'xl']

export default {
  name: 'Input',
  inheritAttrs: false,
  model: {
    prop: 'value',
    event: 'input'
  },
  props: {
    type: {
      type: String,
      default: 'text'
    },
    value: {
      type: String,
      default: undefined
    },
    size: {
      type: String,
      default: SIZES[0],
      validator (value) {
        return SIZES.indexOf(value) !== -1
      }
    },
    label: {
      type: String,
      default: undefined
    },
    disabled: Boolean,
    error: Boolean,
    readonly: Boolean,
    required: Boolean,
    rows: {
      type: [Number, String],
      default: 3
    },
    noResize: Boolean,
    highlighted: Boolean,
    /**
     * Включает сдвиг лейбла при фокусе и заполнении.
     * Работает только при size=l
     */
    floatingLabel: {
      type: Boolean,
      default: true
    },
    /**
     * Вариант поля с увеличенным значением выравненным по правому краю
     * и уменьшенным лейблом по левому без анимации
     */
    alignRight: {
      type: Boolean,
      default: false
    },
    lettersOnly: {
      type: Boolean,
      default: false
    },
    numbersOnly: {
      type: Boolean,
      default: false
    },
    matchPattern: {
      type: RegExp,
      default: null
    },
    capitalize: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      focused: false,
      previousValue: '',
      caret: { start: 0, end: 0 },
      unwatch: null
    }
  },
  computed: {
    tag () {
      return this.type === 'textarea' ? 'textarea' : 'input'
    },
    listeners () {
      return {
        ...this.$listeners,
        input: this.onInput,
        focus: (event) => {
          this.focused = true
          if (this.$listeners.focus) { this.$listeners.focus(event) }
        },
        blur: (event) => {
          this.focused = false
          if (this.$listeners.blur) { this.$listeners.blur(event) }
        }
      }
    },
    attrs () {
      return {
        ...this.$attrs,
        ref: 'input',
        disabled: this.disabled,
        readOnly: this.readonly,
        required: null,
        value: this.value,
        type: this.type !== 'textarea' ? this.type : undefined,
        rows: this.type === 'textarea' ? this.rows : undefined
      }
    },
    cls () {
      return {
        [this.$style.Input]: true,
        [this.$style.Input_textarea]: this.type === 'textarea',
        [this.$style.Input_error]: this.error,
        [this.$style.Input_focused]: this.focused,
        [this.$style[`Input_size_${this.size}`]]: true,
        [this.$style.Input_filled]: !!this.value,
        [this.$style.Input_disabled]: this.disabled,
        [this.$style.Input_readonly]: this.readonly,
        [this.$style.Input_required]: this.required,
        [this.$style.Input_noResize]: this.type === 'textarea' && this.noResize,
        [this.$style.Input_highlighted]: this.highlighted,
        [this.$style.Input_floatingLabel]: this.floatingLabel,
        [this.$style.Input_alignRight]: this.alignRight
      }
    },
    internalValue () {
      return this.value || ''
    },
    regexp () {
      if (this.lettersOnly) return /^[\p{L} -]*$/u
      else if (this.numbersOnly) return /^-?(\d+(\.\d*)?)?$/
      return this.matchPattern
    }
  },
  watch: {
    value: {
      immediate: true,
      handler (v) {
        this.previousValue = v
      }
    },
    async focused (value) {
      const method = (value ? 'add' : 'remove') + 'EventListener'
      document[method]('selectionchange', this.onSelectionChange)
      await this.$nextTick()
      this.$emit('focused', value)
    }
  },
  mounted () {
    if (document.activeElement === this.$refs.input) {
      this.focused = true
    }
    this.unwatch = this.$watch(
      function () {
        return this.regexp || this.capitalize
      },
      function () {
        const v = this.$refs.input.value
        this.previousValue = this.getValidSequence('', v, 0, v.length)
        this.$refs.input.value = this.previousValue
        this.capitalizeValue()
        this.$emit('input', this.previousValue)
      }
    )
  },
  beforeDestroy () {
    this.unwatch && this.unwatch()
  },
  methods: {
    focus () {
      this.$refs.input.focus()
    },
    onInput (event) {
      const v = event.target.value
      let emit

      if (this.regexp || this.capitalize) {
        this.modify(v)
        emit = this.previousValue
      } else {
        emit = v
      }

      this.$emit('input', emit)
    },
    modify (v) {
      if (this.regexp) {
        // текст не выделен
        if (this.caret.start === this.caret.end) {
          const enteredLength = v.length - this.previousValue.length

          // если текст вставлен из буфера обмена
          // вставляем из него только валидные символы
          if (enteredLength > 1) {
            let new_ = this.previousValue
            const valid = this.getValidSequence(this.previousValue, v, this.caret.start, enteredLength)
            new_ = insert(this.previousValue, this.caret.start, valid)
            if (new_ !== v) {
              this.setValue(new_, this.caret.start + valid.length)
            }
            this.previousValue = new_
          } else {
            // вставка или удаление одного символа
            if (this.isMatchPattern(v)) {
              this.previousValue = v
            } else {
              this.setValue(this.previousValue, this.caret.start)
            }
          }
        // замена выделенного текста
        } else {
          const replacedLength = this.caret.end - this.caret.start
          const enteredLength = v.length - this.previousValue.length + replacedLength
          let new_ = splice(v, this.caret.start, enteredLength)
          const valid = this.getValidSequence(new_, v, this.caret.start, enteredLength)
          new_ = insert(new_, this.caret.start, valid)
          this.setValue(new_, this.caret.start + valid.length)
          this.previousValue = new_
        }
      }

      this.capitalizeValue()
    },
    isMatchPattern (string) {
      if (this.regexp) {
        return this.regexp.test(string)
      }
      return true
    },
    capitalizeValue () {
      if (this.capitalize) {
        const caret = this.$refs.input.selectionEnd
        this.previousValue = capitalize(this.$refs.input.value)
        this.setValue(this.previousValue, caret)
      }
    },
    getValidSequence (previousValue, v, start, enteredLength) {
      const valid = []
      for (let i = start; i < start + enteredLength; i++) {
        if (this.isMatchPattern(insert(previousValue, i, valid.join('') + v[i]))) {
          valid.push(v[i])
        }
      }
      return valid.join('')
    },
    setValue (v, caret) {
      const t = this.$refs.input
      t.value = v
      t.setSelectionRange(caret, caret)
    },
    onSelectionChange () {
      this.caret.start = this.$refs.input.selectionStart
      this.caret.end = this.$refs.input.selectionEnd
    }
  }
}
</script>

<style module lang="scss">
/* stylelint-disable no-descending-specificity */
@import "../../lib/variables";
@import "../../lib/mixins";

$transitionFunction: cubic-bezier(0.25, 0.1, 0.25, 1);
$transitionTime: 0.2s;
$paddingM: 11px;
$paddingL: 15px;

.Input {
  overflow: hidden;
  position: relative;
  border: 1px solid $mediumGrey;
  background: $white;
  color: $almostBlack;
  border-radius: 10px;
  min-height: 40px;
  width: 100%;
  display: flex;
  transition:
    box-shadow $transitionTime $transitionFunction,
    border-color $transitionTime $transitionFunction;
  box-shadow: 0 0 0 0 $xLightGreen;
  font: $fontNormal2 $fontFamilyDefault;
  line-height: normal;
  cursor: text;

  &:hover {
    border-color: $semiDarkGrey;
  }
}

.Input__native {
  -webkit-appearance: none;
  border: 0;
  padding: 0 0 1px 0;
  margin: 0;
  background: transparent;
  width: 100%;
  outline: none;
  resize: vertical;
  color: inherit;
  font: inherit;
  box-shadow: inset 0 0 0 1000px #fff;
  max-height: 800px;

  &::placeholder {
    color: $mediumGrey;
    -webkit-text-fill-color: currentColor;
  }

  .Input:not(.Input_focused) &::placeholder {
    color: transparent !important;
  }
}

.Input_error {
  border-color: $red;

  &:hover {
    border-color: $red2 !important;
  }
}

.Input_focused {
  border-color: $mediumGreen !important;
  box-shadow: 0 0 0 4px $xLightGreen;

  &:hover {
    border-color: $mediumGreen !important;
  }
}

.Input_highlighted {
  background-color: $xLightYellow !important;

  .Input__native {
    box-shadow: inset 0 0 0 1000px $xLightYellow;
  }
}

.Input_noResize .Input__native {
  resize: none;
}

.Input__wrapper {
  display: flex;
  position: relative;
  cursor: text;
}

.Input__label {
  user-select: none;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 15px;
  height: calc(100% - 1px);
  display: flex;
  align-items: center;
  padding-bottom: 1px;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  font: inherit;
  font-size: $fontNormal2;
  color: $darkGrey;
  white-space: nowrap;
  transition:
    margin-top $transitionTime $transitionFunction,
    font-size $transitionTime $transitionFunction;
}

.Input_required .Input__label::after {
  content: '*';
  font-family: Arial, Helvetica, sans-serif;
  display: inline;
}

.Input_disabled {
  background: $lightGrey;
  border-color: $semiLightGrey;
  cursor: default;
  color: $darkGrey;

  &:hover {
    border-color: $semiLightGrey !important;
  }

  .Input__label {
    color: $semiDarkGrey;
  }

  .Input__native {
    -webkit-text-fill-color: $darkGrey;
    opacity: 1;
    box-shadow: inset 0 0 0 1000px $lightGrey;
  }
}

.Input_readonly {
  &.Input_focused .Input__native::placeholder {
    color: transparent;
  }
}

.Input_size_m {
  border-radius: 8px;

  .Input__native {
    padding-left: $paddingM;
    padding-right: $paddingM;
  }

  &.Input_textarea .Input__native {
    padding-top: 13px;
    padding-bottom: 12px;
  }

  .Input__label {
    left: $paddingM;
    max-width: calc(100% - #{$paddingM * 2});
  }

  &:not(.Input_readonly).Input_focused .Input__label,
  &.Input_filled .Input__label {
    display: none;
  }
}

.Input_size_l {
  min-height: 48px;

  .Input__native {
    padding-left: $paddingL;
    padding-right: $paddingL;
  }

  &.Input_textarea .Input__native {
    padding-top: 0 !important;
    margin-top: 25px;
    min-height: 0;
  }

  .Input__label {
    left: $paddingL;
    max-width: calc(100% - #{$paddingL * 2});
  }

  &:not(.Input_readonly).Input_focused .Input__label,
  &.Input_filled .Input__label {
    display: none;
  }

  &.Input_floatingLabel.Input_focused .Input__native,
  &.Input_floatingLabel.Input_filled .Input__native {
    padding-top: 19px;
  }

  &.Input_floatingLabel:not(.Input_readonly).Input_focused .Input__label,
  &.Input_floatingLabel.Input_filled .Input__label {
    margin-top: -8px;
    font-size: 13px;
    display: flex;
  }

  &.Input_textarea.Input_floatingLabel:not(.Input_readonly).Input_focused .Input__label,
  &.Input_textarea.Input_floatingLabel.Input_filled .Input__label {
    margin-top: -7px;
  }
}

.Input_alignRight {
  font-size: 22px;

  .Input__native {
    text-align: right;
    padding: 0 12px !important;
  }

  .Input__label {
    font-size: $fontSmall;
    position: static;
    order: -1;
    flex-shrink: 0;
    padding-left: 11px;
    padding-bottom: 9px;
    display: flex !important;
    align-items: flex-end;
  }
}

.Input__addon {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  .Input_size_m & {
    padding-right: 12px;
  }

  .Input_size_l & {
    padding-right: 16px;
  }

  > * {
    flex-shrink: 0;
  }

  > * + * {
    margin-left: 8px;
  }
}

.Input_textarea {
  line-height: 24px;

  .Input__label {
    height: auto;
    top: 13px;
  }
}

.Input:not(.Input_textarea) {
  &.Input_size_m {
    height: 40px;
  }

  &.Input_size_l {
    height: 48px;
  }
}

@include mobile {
  @media (max-width: max-mobile-width()) {
    .Input_alignRight .Input__label {
      font-size: $fontXSmall !important;
    }
  }
}
</style>
