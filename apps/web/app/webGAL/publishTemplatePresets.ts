import blackTextboxScss from "./templates/black/Stage/TextBox/textbox.scss?raw";
import blackTemplateJson from "./templates/black/template.json?raw";
import blackTitleScss from "./templates/black/UI/Title/title.scss?raw";
import tuanchatChooseScss from "./templates/tuanchat/Stage/Choose/choose.scss?raw";
import tuanchatTextboxScss from "./templates/tuanchat/Stage/TextBox/textbox.scss?raw";
import tuanchatTemplateJson from "./templates/tuanchat/template.json?raw";
import tuanchatTitleScss from "./templates/tuanchat/UI/Title/title.scss?raw";

export type PublishTemplatePreset = {
  chooseScss: string;
  templateJson: string;
  textboxScss: string;
  titleScss: string;
};

export type PublishBaseTemplate = "none" | "black" | "tuanchat";

const TUANCHAT_TEMPLATE_PRESET: PublishTemplatePreset = {
  templateJson: tuanchatTemplateJson,
  titleScss: tuanchatTitleScss,
  textboxScss: tuanchatTextboxScss,
  chooseScss: tuanchatChooseScss,
};

const BLACK_TEMPLATE_PRESET: PublishTemplatePreset = {
  templateJson: blackTemplateJson,
  titleScss: blackTitleScss,
  textboxScss: blackTextboxScss,
  // WebGAL Black 当前没有自带 choose.scss；保留空文件即可回退到引擎默认选择样式。
  chooseScss: "",
};

export function getPublishTemplatePreset(baseTemplate: PublishBaseTemplate | undefined): PublishTemplatePreset {
  return baseTemplate === "black" ? BLACK_TEMPLATE_PRESET : TUANCHAT_TEMPLATE_PRESET;
}
