<template>
  <Input
    ref="input"
    v-bind="attrs"
    v-on="listeners"
  />
</template>

<script>
import Input from '../Input'

export const MASKS = [
  [/^\+7/, '+7 ___ ___-__-__'],
  [/^[7-8]/, '+7 ___ ___-__-__', function (value, caretPosition) { return { value: value.replace(/^[7-8]/, '+7'), caretPosition: caretPosition + 1 } }],
  [/^9/, '+7 ___ ___-__-__', function (value, caretPosition) { return { value: value.replace(/^9/, '+79'), caretPosition: caretPosition + 2 } }],
  [/^\+380/, '+380 __ ___-__-__'],
  [/^\+375/, '+375 __ ___-__-__']
]

function clean (value, caretPosition) {
  const plus = value[0] === '+'
  let result = value.replace(/[^\d]/g, ' ')
  if (plus) result = result.replace(/^ /, '+')
  if (caretPosition === undefined) caretPosition = result.length
  caretPosition = result.slice(0, caretPosition).replace(/\s/g, '').length
  result = result.replace(/\s/g, '')
  return {
    value: result,
    caretPosition: caretPosition
  }
}

function transform (el) {
  let result = clean(el.value, getCaretPosition(el))
  const mask = chooseMask(result.value)
  if (mask) {
    if (mask[2]) result = mask[2](result.value, result.caretPosition)
    result = applyMask(result.value, mask[1], result.caretPosition)
  }
  return result
}

function getCaretPosition (el) {
  return el.selectionEnd
}

function setCaretPosition (el, caretPosition) {
  /* комментарии из старого кода */
  // Если какое-то другое поле (не this.input) в фокусе, то установка selectionStart и selectionEnd
  // сбивает этот фокус:
  // на другом поле перестает мигать курсор. При попытке ввести символ, он вставляется в другое поле, а потом
  // фокус переходит к this.input и в нем начинает мигать курсор.
  if (el !== document.activeElement) return
  try {
    el.selectionStart = el.selectionEnd = caretPosition
  } catch (e) {
    // IE 10-11 falls here if the input is not visible
  }
  return el.selectionEnd
}

function chooseMask (value) {
  for (let i = 0; i < MASKS.length; i++) {
    if (value.match(MASKS[i][0])) return MASKS[i]
  }
  return null
}

function applyMask (value, mask, caretPosition) {
  const result = mask.split('')
  let valuePosition = 0
  let newCaretPosition = 0
  let caretShift = true

  for (let maskPosition = 0; maskPosition < mask.length; maskPosition++) {
    if (value[valuePosition] === mask[maskPosition] || (mask[maskPosition] === '_' && value[valuePosition] !== undefined)) {
      result[maskPosition] = value[valuePosition]
      valuePosition++
    }
    if (caretShift === true) {
      newCaretPosition++
      if (valuePosition >= caretPosition) caretShift = false
    }
  }

  newCaretPosition = Math.max(mask.indexOf('_', newCaretPosition), newCaretPosition)
  return {
    value: result.join(''),
    caretPosition: newCaretPosition
  }
}

function isSelectionCollapsed (el) {
  return el.selectionStart === el.selectionEnd
}

function moveCaretLeft (el) {
  const pos = getCaretPosition(el)
  const str = el.value.slice(0, pos)
  const i = reverseString(str).search(/\d/)
  if (i > 0) setCaretPosition(el, pos - i)
}

function moveCaretRight (el) {
  const pos = getCaretPosition(el)
  const str = el.value.slice(pos)
  const i = str.search(/\d/)
  if (i > 0) setCaretPosition(el, pos + i)
}

function moveCaretOnRemove (event) {
  const el = event.target
  // const value = el.value
  if (!isSelectionCollapsed(el)) return
  if (event.which === 8) { // backspace
    moveCaretLeft(el)
  } else if (event.which === 46) { // delete
    moveCaretRight(el)
  }
}

function reverseString (str) {
  return str.split('').reverse().join('')
}

export const PhoneInputMixin = {
  inheritAttrs: false,
  model: {
    prop: 'value',
    event: 'input'
  },
  props: {
    value: {
      type: String,
      default: undefined
    }
  },
  data () {
    return {
      valueInternal: ''
    }
  },
  computed: {
    valueData () {
      return this.value !== undefined ? this.value : this.valueInternal
    },
    attrs () {
      return { ...this.$attrs, value: this.valueData }
    },
    listeners () {
      return {
        ...this.$listeners,
        focus: this.onFocus,
        input: this.onInput,
        keydown: this.onKeydown
      }
    }
  },
  mounted () {
    const inputEl = this.getInputEl()
    this.setValueAndPosition(transform(inputEl))
  },
  methods: {
    getInputEl () {
      if (this.$el.tagName === 'INPUT' || this.$el.tagName === 'TEXTAREA') return this.$el
      else return this.$el.querySelector('input,textarea')
    },
    setValueAndPosition ({ value, caretPosition }) {
      if (this.value === undefined) this.valueInternal = value
      this.$emit('input', value)
      this.$nextTick(() => {
        const inputEl = this.getInputEl()
        inputEl.value = value
        if (caretPosition !== undefined) setCaretPosition(inputEl, caretPosition)
      })
    },
    onInput () {
      const inputEl = this.getInputEl()
      this.setValueAndPosition(transform(inputEl))
    },
    onFocus (event) {
      setTimeout(() => { // this.$nextTick не работает при клике внутрь поля
        if (isSelectionCollapsed(event.target)) this.setValueAndPosition(transform(event.target))
        this.$emit('focus', event)
      })
    },
    onKeydown (event) {
      moveCaretOnRemove(event)
      this.$emit('keydown', event)
    },
    focus () {
      this.$refs.input.focus()
    }
  }
}

export default {
  name: 'PhoneInput',
  components: {
    Input
  },
  mixins: [PhoneInputMixin]
}

</script>
