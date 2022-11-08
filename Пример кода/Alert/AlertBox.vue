<template>
  <div :class="[$style.AlertBox, blockCls]">
    <InlineIcon
      v-if="iconName"
      :name="iconName"
      :ssr-class="$style.AlertBox__icon"
      size="s"
    />
    <div :class="$style.AlertBox__content">
      <div
        v-if="title"
        :class="$style.AlertBox__title"
      >
        {{ title }}
      </div>
      {{ text }}
      <Vnodes :vnodes="content" />
      <slot />
    </div>
    <UnstyledButton
      v-if="!uncloseable"
      :class="$style.AlertBox__btnClose"
      @click="$emit('close')"
    >
      <InlineIcon
        name="cross"
        size="s"
      />
    </UnstyledButton>
  </div>
</template>

<script>
import InlineIcon from '../InlineIcon'
import UnstyledButton from '../UnstyledButton'
import { sleep } from '../../lib/utils/sleep'

export const KINDS = ['info', 'success', 'error', 'warning']

export default {
  name: 'AlertBox',
  components: {
    InlineIcon,
    UnstyledButton,
    Vnodes: {
      functional: true,
      render: (h, ctx) => ctx.props.vnodes
    }
  },
  props: {
    iconName: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: null
    },
    text: {
      type: String,
      default: null
    },
    content: {
      type: Array,
      default: null
    },
    uncloseable: {
      type: Boolean,
      default: false
    },
    kind: {
      type: String,
      default: KINDS[0]
    },
    timeout: {
      type: [String, Number],
      default: 3 // время жизни в секундах (0 or '' to disable)
    }
  },
  computed: {
    blockCls () {
      return {
        [this.$style.AlertBox_uncloseable]: this.uncloseable,
        [this.$style.AlertBox_hasIcon]: this.iconName,
        [this.$style[`AlertBox_kind_${this.kind}`]]: this.kind
      }
    }
  },
  mounted () {
    if (this.timeout) this.startDestroying()
  },
  methods: {
    async startDestroying () {
      const time = parseFloat(this.timeout) * 1000
      await sleep(time)
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss" module>
@import "../../lib/variables";

.AlertBox {
  position: relative;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 284px;
  box-sizing: border-box;
  padding: 16px;
  padding-right: 44px;
  font-size: 14px;
  line-height: 20px;
}

.AlertBox__title {
  font-weight: bold;
  margin-bottom: 6px;
}

.AlertBox__icon {
  position: absolute;
  top: 18px;
  left: 16px;
}

.AlertBox__btnClose {
  position: absolute;
  top: 0;
  right: 0;
  width: 48px;
  height: 48px;
  color: $semiDarkGrey;
  transition: color 0.2s;

  &:hover {
    color: $almostBlack;
  }
}

.AlertBox_hasIcon {
  padding-left: 44px;
}

.AlertBox_uncloseable {
  padding-right: 16px;
}

.AlertBox_kind_info {
  background: $xLightBlue;
}

.AlertBox_kind_success {
  background: $xLightGreen;
}

.AlertBox_kind_error {
  background: $xLightRed;
}

.AlertBox_kind_warning {
  background: $xLightYellow;
}
</style>
