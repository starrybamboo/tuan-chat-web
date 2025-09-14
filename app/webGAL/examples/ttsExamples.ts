/**
 * SceneEditor TTS 使用示例
 *
 * 这个文件展示了如何使用更新后的 SceneEditor 进行 TTS 语音生成
 */

import { EmoControlMethod } from "@/tts";
import { SceneEditor } from "@/webGAL/sceneEditor";

import type { ChatMessageResponse } from "../../../api";

// 示例：基本的语音生成使用
async function basicTTSExample() {
  const sceneEditor = new SceneEditor(12345); // spaceId
  await sceneEditor.initRender();

  // 模拟聊天消息
  const message: ChatMessageResponse = {
    message: {
      content: "你好，这是一个测试语音生成的文本。",
      // ... 其他字段
    },
    // ... 其他字段
  } as ChatMessageResponse;

  // 准备参考音频文件（通常来自用户上传）
  const refVocal = new File(["..."], "reference.wav", { type: "audio/wav" });

  // 1. 同步生成语音（适用于短文本）
  try {
    const fileName = await sceneEditor.uploadVocal(message, refVocal);
    if (fileName) {
      console.log("语音生成成功，文件名:", fileName);

      // 在 WebGAL 场景中添加带语音的对话
      await sceneEditor.addDialog(
        "角色名",
        undefined, // 角色头像
        message.message.content,
        "scene_name",
        undefined, // 左侧立绘
        undefined, // 右侧立绘
        fileName, // 语音文件名
      );
    }
  }
  catch (error) {
    console.error("同步语音生成失败:", error);
  }
}

// 示例：异步语音生成（适用于长文本或批量生成）
async function asyncTTSExample() {
  const sceneEditor = new SceneEditor(12345);
  await sceneEditor.initRender();

  const message: ChatMessageResponse = {
    message: {
      content: "这是一段较长的文本，需要使用异步模式来生成语音，以避免阻塞用户界面。在异步模式下，我们可以跟踪生成进度，并在完成后获取结果。",
    },
  } as ChatMessageResponse;

  const refVocal = new File(["..."], "reference.wav", { type: "audio/wav" });

  // 1. 启动异步语音生成
  const result = await sceneEditor.generateVocalAsync(message, refVocal, {
    emotionControl: EmoControlMethod.NONE,
    emotionWeight: 0.8,
    maxTokensPerSegment: 120,
  });

  if (result.success && result.jobId) {
    console.log("异步任务已创建，任务ID:", result.jobId);
    console.log("预期文件名:", result.fileName);

    // 2. 轮询检查任务状态
    const pollInterval = setInterval(async () => {
      const fileName = await sceneEditor.downloadAsyncVocal(result.jobId!, result.fileName!);

      if (fileName) {
        console.log("异步语音生成完成，文件名:", fileName);
        clearInterval(pollInterval);

        // 在场景中使用生成的语音
        await sceneEditor.addDialog(
          "角色名",
          undefined,
          message.message.content,
          "scene_name",
          undefined,
          undefined,
          fileName,
        );
      }
    }, 2000); // 每2秒检查一次

    // 设置超时，避免无限轮询
    setTimeout(() => {
      clearInterval(pollInterval);
      console.warn("异步语音生成超时");
    }, 60000); // 60秒超时
  }
  else {
    console.error("异步任务创建失败:", result.error);
  }
}

// 示例：情感控制的语音生成
async function emotionalTTSExample() {
  const sceneEditor = new SceneEditor(12345);
  await sceneEditor.initRender();

  const message: ChatMessageResponse = {
    message: {
      content: "我今天非常开心！",
    },
  } as ChatMessageResponse;

  const refVocal = new File(["..."], "reference.wav", { type: "audio/wav" });

  // 使用文本描述控制情感
  const result = await sceneEditor.generateVocalAsync(message, refVocal, {
    emotionControl: EmoControlMethod.TEXT,
    emotionText: "开心的、兴奋的",
    emotionWeight: 0.9,
    maxTokensPerSegment: 120,
  });

  if (result.success) {
    console.log("情感语音生成任务已创建");
  }
}

// 示例：批量语音生成
async function batchTTSExample() {
  const sceneEditor = new SceneEditor(12345);
  await sceneEditor.initRender();

  const messages: ChatMessageResponse[] = [
    { message: { content: "第一句对话" } },
    { message: { content: "第二句对话" } },
    { message: { content: "第三句对话" } },
  ] as ChatMessageResponse[];

  const refVocal = new File(["..."], "reference.wav", { type: "audio/wav" });

  // 并行启动多个异步任务
  const tasks = messages.map((message, _index) =>
    sceneEditor.generateVocalAsync(message, refVocal, {
      emotionControl: EmoControlMethod.NONE,
      maxTokensPerSegment: 120,
    }),
  );

  const results = await Promise.all(tasks);
  console.log("所有语音生成任务已启动:", results);

  // 后续可以轮询检查每个任务的状态
  results.forEach((result, index) => {
    if (result.success && result.jobId) {
      console.log(`消息 ${index + 1} 的任务ID: ${result.jobId}`);
    }
  });
}

// 导出示例函数以供参考
export {
  asyncTTSExample,
  basicTTSExample,
  batchTTSExample,
  emotionalTTSExample,
};
