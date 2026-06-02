<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
  }>(),
  {
    modelValue: '',
    placeholder: '搜索文章',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [keyword: string]
}>()

const draftKeyword = ref(props.modelValue)

function handleSubmit() {
  emit('submit', draftKeyword.value.trim())
}

watch(
  () => props.modelValue,
  (value) => {
    draftKeyword.value = value
  },
)
</script>

<template>
  <form class="public-search-box" role="search" @submit.prevent="handleSubmit">
    <label class="public-search-box__label" for="public-search-box-input">搜索文章</label>
    <span class="public-search-box__control">
      <Search aria-hidden="true" />
      <input
        id="public-search-box-input"
        v-model="draftKeyword"
        class="public-search-box__input"
        type="search"
        :placeholder="placeholder"
        @input="emit('update:modelValue', draftKeyword)"
      />
    </span>
    <button class="public-search-box__button" type="submit">搜</button>
  </form>
</template>

<style scoped>
.public-search-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: center;
}

.public-search-box__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.public-search-box__control {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: var(--color-input-background);
}

.public-search-box__control :deep(svg) {
  width: 1rem;
  height: 1rem;
  margin-inline: 0.6rem 0.1rem;
  color: var(--color-muted);
}

.public-search-box__input {
  width: 100%;
  min-height: 2.25rem;
  padding: 0.45rem 0.65rem 0.45rem 0.35rem;
  border: 0;
  background: transparent;
  color: var(--color-text);
}

.public-search-box__button {
  min-height: 2.25rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  cursor: pointer;
}
</style>
