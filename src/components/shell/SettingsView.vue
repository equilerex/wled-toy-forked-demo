<script setup lang="ts">
import { computed } from 'vue'
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import AppearanceSection from './settings/AppearanceSection.vue'
import DataSection from './settings/DataSection.vue'
import DevicesSection from './settings/DevicesSection.vue'
import GeneralSection from './settings/GeneralSection.vue'
import OutputSection from './settings/OutputSection.vue'
import ShortcutsSection from './settings/ShortcutsSection.vue'
import { settingsOpener, settingsView, type SettingsSection } from '@/lib/app/preferences'

const sections: Array<{ id: SettingsSection; label: string; component: unknown }> = [
  { id: 'general', label: 'General', component: GeneralSection },
  { id: 'appearance', label: 'Appearance', component: AppearanceSection },
  { id: 'devices', label: 'Devices', component: DevicesSection },
  { id: 'output', label: 'Output', component: OutputSection },
  { id: 'shortcuts', label: 'Shortcuts', component: ShortcutsSection },
  { id: 'data', label: 'Data', component: DataSection },
]

const current = computed(() => sections.find((section) => section.id === settingsView.section) ?? sections[0])

function onCloseAutoFocus(e: Event) {
  const opener = settingsOpener()
  if (!opener) return
  e.preventDefault()
  opener.focus()
}
</script>

<template>
  <DialogRoot v-model:open="settingsView.open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/40" />
      <DialogContent
        class="settings-view fixed left-1/2 top-1/2 z-50 flex h-[min(620px,calc(100dvh-40px))] w-[min(900px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[8px] border border-(--pref-line) bg-(--app-floating) text-[13px] text-default shadow-2xl outline-none"
        @close-auto-focus="onCloseAutoFocus"
      >
        <TabsRoot v-model="settingsView.section" orientation="vertical" class="flex min-w-0 flex-1">
          <div class="flex w-[184px] shrink-0 flex-col border-e border-(--pref-line) bg-(--app-chrome)">
            <DialogTitle class="flex h-[52px] shrink-0 items-center px-4 text-[13px] font-semibold text-highlighted">Preferences</DialogTitle>
            <TabsList class="flex flex-col gap-px px-2" aria-label="Preference sections">
              <TabsTrigger
                v-for="section in sections"
                :key="section.id"
                :value="section.id"
                class="settings-tab flex h-[28px] cursor-default items-center rounded-[4px] px-2 text-start text-[13px] text-default outline-none hover:bg-(--app-hover) data-[state=active]:bg-(--app-selected) data-[state=active]:font-medium data-[state=active]:text-highlighted"
              >
                {{ section.label }}
              </TabsTrigger>
            </TabsList>
            <p class="mt-auto px-4 pb-4 text-[11px] leading-[1.45] text-dimmed">Changes are auto applied.</p>
          </div>

          <div class="flex min-w-0 flex-1 flex-col">
            <header class="flex h-[52px] shrink-0 items-center gap-4 border-b border-(--pref-line) px-5">
              <h2 class="min-w-0 flex-1 text-[15px] font-semibold leading-tight text-highlighted">{{ current.label }}</h2>
              <DialogDescription class="sr-only">{{ current.label }} preferences</DialogDescription>
              <DialogClose class="pref-button">Done</DialogClose>
            </header>
            <TabsContent
              v-for="section in sections"
              :key="section.id"
              :value="section.id"
              tabindex="-1"
              class="settings-body min-h-0 flex-1 outline-none"
              :class="section.id === 'devices' ? 'flex' : 'overflow-y-auto px-5 pb-5'"
            >
              <component :is="section.component" />
            </TabsContent>
          </div>
        </TabsRoot>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
/* --ui-border equals --ui-bg-elevated in the dark theme, so hairlines on this floating layer take the accented border */
.settings-view {
  --pref-line: color-mix(in oklab, var(--ui-border-accented) 75%, transparent);
}

.settings-view :is(button, select, input, textarea, [role='tab'], [role='radio'], [role='switch']):focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 1px;
}

.settings-view .pref-input:focus-visible {
  outline-offset: -1px;
}

.pref-group {
  margin-top: 16px;
}

.pref-group-title {
  padding-bottom: 5px;
  border-bottom: 1px solid var(--pref-line);
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text-muted);
}

.pref-rows > * + * {
  border-top: 1px solid var(--pref-line);
}

.pref-row {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 24px;
  padding: 8px 0;
}

.pref-label {
  display: block;
  font-size: 13px;
  color: var(--ui-text-highlighted);
}

.pref-hint {
  max-width: 52ch;
  margin-top: 1px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ui-text-muted);
}

.pref-error {
  max-width: 52ch;
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ui-error);
}

.pref-control {
  display: flex;
  width: 240px;
  flex-shrink: 0;
  justify-content: flex-end;
}

.pref-input {
  height: 24px;
  border: 1px solid var(--ui-border-accented);
  border-radius: 4px;
  background: var(--ui-bg);
  padding: 0 7px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-highlighted);
}

.pref-input::placeholder {
  color: var(--ui-text-dimmed);
}

.pref-input:disabled {
  opacity: 0.45;
}

.pref-input-number {
  width: 88px;
}

.pref-select {
  position: relative;
  display: block;
  width: 100%;
}

.pref-select select {
  appearance: none;
  padding-inline-end: 24px;
}

.pref-select::after {
  content: '';
  position: absolute;
  inset-inline-end: 9px;
  top: 8px;
  width: 6px;
  height: 6px;
  border: solid var(--ui-text-muted);
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
  pointer-events: none;
}

.pref-segmented {
  display: flex;
  width: 100%;
  height: 24px;
  overflow: hidden;
  border: 1px solid var(--ui-border-accented);
  border-radius: 4px;
  background: var(--ui-bg);
}

.pref-segment {
  flex: 1;
  cursor: default;
  font-size: 12px;
  color: var(--ui-text-muted);
  transition: background-color 80ms;
}

.pref-segment + .pref-segment {
  border-inline-start: 1px solid var(--ui-border-accented);
}

.pref-segment:hover {
  background: var(--app-hover);
}

.pref-segment[data-state='checked'] {
  background: var(--ui-bg-accented);
  font-weight: 500;
  color: var(--ui-text-highlighted);
}

.settings-view .pref-segment:focus-visible {
  outline-offset: -2px;
}

.pref-switch {
  position: relative;
  width: 30px;
  height: 18px;
  flex-shrink: 0;
  cursor: default;
  border-radius: 9px;
  background: color-mix(in oklab, var(--ui-text) 28%, transparent);
  transition: background-color 80ms;
}

.pref-switch[data-state='checked'] {
  background: var(--ui-primary);
}

.pref-switch-thumb {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  background: white;
  transform: translateX(2px);
  transition: transform 80ms;
}

.pref-switch-thumb[data-state='checked'] {
  transform: translateX(14px);
}

.pref-button {
  height: 24px;
  flex-shrink: 0;
  cursor: default;
  border: 1px solid var(--ui-border-accented);
  border-radius: 4px;
  background: var(--ui-bg);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
  transition: background-color 80ms;
}

.pref-button:hover:not(:disabled) {
  background: var(--ui-bg-accented);
}

.pref-button:disabled {
  opacity: 0.45;
}

.pref-button-danger {
  color: var(--ui-error);
}

.pref-range {
  height: 16px;
  accent-color: var(--ui-primary);
}

.pref-kbd {
  display: inline-block;
  min-width: 22px;
  margin-inline-start: 6px;
  border: 1px solid var(--pref-line);
  border-radius: 4px;
  background: var(--ui-bg);
  padding: 1px 6px;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-align: center;
  color: var(--ui-text-highlighted);
}
</style>
