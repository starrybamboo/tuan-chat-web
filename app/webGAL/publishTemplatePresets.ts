import defaultChooseScss from "../../../WebGAL_Terre/packages/terre2/assets/templates/WebGAL_Default_Template/Stage/Choose/choose.scss?raw";
import defaultTextboxScss from "../../../WebGAL_Terre/packages/terre2/assets/templates/WebGAL_Default_Template/Stage/TextBox/textbox.scss?raw";
import defaultTitleScss from "../../../WebGAL_Terre/packages/terre2/assets/templates/WebGAL_Default_Template/UI/Title/title.scss?raw";
import defaultTemplateJson from "../../../WebGAL_Terre/packages/terre2/assets/templates/WebGAL_Default_Template/template.json?raw";
import blackTextboxScss from "../../../WebGAL_Terre/packages/terre2/public/templates/WebGAL Black/Stage/TextBox/textbox.scss?raw";
import blackTitleScss from "../../../WebGAL_Terre/packages/terre2/public/templates/WebGAL Black/UI/Title/title.scss?raw";
import blackTemplateJson from "../../../WebGAL_Terre/packages/terre2/public/templates/WebGAL Black/template.json?raw";

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
