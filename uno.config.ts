import { defineConfig, presetMini, presetUno, presetWind, transformerVariantGroup } from "unocss";

export default defineConfig({
    presets: [presetUno(), presetMini(), presetWind()],
    transformers: [transformerVariantGroup()]
})
