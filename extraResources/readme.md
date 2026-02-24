Electron 打包会优先通过 `pnpm electron:prepare:resources`
从 `../WebGAL_Terre/release` 同步资源到本目录。

如果自动同步未命中，也可手动把 WebGAL_Terre 发行内容放到本目录，
并确保 `WebGAL_Terre.exe` 与本文件同级。
