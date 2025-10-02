import { Circle, ExtensionCategory, register } from "@antv/g6";

import type { GitNodeStyleProps } from "./types";

const NodeId = "git-node";
class GitNode extends Circle {
  // 副标题样式
  getSubtitleStyle(attributes: GitNodeStyleProps) {
    return {
      x: 0,
      y: 45, // 放在主标题下方
      text: attributes.subtitle || "",
      fontSize: 12,
      fill: "#666",
      textAlign: "center",
      textBaseline: "middle",
    };
  }

  drawSubtitleShape(attributes: GitNodeStyleProps, container: Circle) {
    const subtitleStyle = this.getSubtitleStyle(attributes);
    this.upsert("subtitle", "text", subtitleStyle, container);
  }

  // 渲染方法
  render(attributes = this.parsedAttributes, container: Circle) {
    // 1. 渲染基础矩形和主标题
    super.render(attributes, container);

    // 2. 添加副标题
    this.drawSubtitleShape(attributes, container);
  }
}

register(ExtensionCategory.NODE, NodeId, GitNode);
