<template>
  <UnstyledButton
    :class="cls"
    type="button"
    @click="handleClick"
  >
    <slot />
  </UnstyledButton>
</template>

<script>
import UnstyledButton from '../UnstyledButton'

export default {
  components: { UnstyledButton },
  props: {
    plain: Boolean,
    light: Boolean
  },
  computed: {
    cls () {
      return {
        [this.$style.HintButton]: true,
        [this.$style.HintButton_light]: this.light,
        [this.$style.HintButton_plain]: this.plain
      }
    }
  },
  methods: {
    handleClick (event) {
      this.$emit('click', event)
    }
  }
}
</script>

<style module lang="scss">
@import "../../lib/variables";
@import "../../lib/mixins";

.HintButton {
  z-index: 110 + 1; // should be greater than in .hint:::after
  padding: 8px;
  margin-left: 7px;
  background-color: $white;
  color: $darkGrey !important;
  text-decoration: none;
  border-radius: 4px;
  min-width: 41px;
  line-height: 20px;

  &:hover {
    background-color: $mediumGrey;
  }

  &:first-child {
    margin-left: 0;
  }
}

.HintButton_plain {
  margin-left: 2px;
  background: transparent;
  color: $white !important;
  text-decoration: underline;

  &:hover {
    background: transparent;
    color: $mediumGrey !important;
  }
}

.HintButton_light {
  background-color: $darkGrey;
  color: $white !important;

  &:hover {
    background-color: $almostBlack;
  }
}

.HintButton_light.HintButton_plain {
  background: transparent;
  color: $darkGrey !important;

  &:hover {
    background: transparent;
    color: $black !important;
  }
}
</style>
