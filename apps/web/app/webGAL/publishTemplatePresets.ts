import blackTextboxScss from "./templates/black/Stage/TextBox/textbox.scss?raw";
import blackTemplateJson from "./templates/black/template.json?raw";
import blackTitleScss from "./templates/black/UI/Title/title.scss?raw";
// WebGAL 模板文件已 vendored 到仓库内，避免 CI 依赖外部 WebGAL_Terre 工作区。
import defaultChooseScss from "./templates/default/Stage/Choose/choose.scss?raw";
import defaultTextboxScss from "./templates/default/Stage/TextBox/textbox.scss?raw";
import defaultTemplateJson from "./templates/default/template.json?raw";
import defaultTitleScss from "./templates/default/UI/Title/title.scss?raw";

export type PublishTemplatePreset = {
  chooseScss: string;
  templateJson: string;
  textboxScss: string;
  titleScss: string;
};

const DEFAULT_TEMPLATE_PRESET: PublishTemplatePreset = {
  templateJson: defaultTemplateJson,
  titleScss: defaultTitleScss,
  textboxScss: defaultTextboxScss,
  chooseScss: defaultChooseScss,
};

const BLACK_TEMPLATE_PRESET: PublishTemplatePreset = {
  templateJson: blackTemplateJson,
  titleScss: blackTitleScss,
  textboxScss: blackTextboxScss,
  // WebGAL Black 当前没有自带 choose.scss；保留空文件即可回退到引擎默认选择样式。
  chooseScss: "",
};

export function getPublishTemplatePreset(baseTemplate: "none" | "black" | undefined): PublishTemplatePreset {
  return baseTemplate === "black" ? BLACK_TEMPLATE_PRESET : DEFAULT_TEMPLATE_PRESET;
}
