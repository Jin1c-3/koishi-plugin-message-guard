import { Context, Schema, Time } from "koishi";
import {} from "@koishijs/censor/lib";
import {} from "koishi-plugin-adapter-onebot";

export const name = "message-guard";

export const using = ["censor"];

export const usage = `## 本插件可以检测 \`onebot\` 平台中群聊消息是否<u>包含</u>违禁词，若有就撤回禁言，防止<u>键政炸群</u>。

插件本身**没有违禁词库**，需要安装中 \`censor\` 服务！

推荐安装 [@q78kg/koishi-plugin-text-censor](https://www.npmjs.com/package/%40q78kg%2Fkoishi-plugin-text-censor/v/1.0.5)

**安装后需要自己配置哦**

## \`@q78kg/koishi-plugin-text-censor\` 的配置教程

1. 敏感词库
  - 自己写敏感词库
  - 不想自己写的可以参考这个项目，选择下载他的词库：[Sensitive-lexicon](https://github.com/konsheng/Sensitive-lexicon)

2. 把词库上传到服务器
  - 在控制台点击**资源管理器**，然后批量上传即可

  3. 写配置文件位置
  - 注意，配置文件地址是相对地址。示例： \`./data/text-censor/tfck.txt\``;

export interface Config {
  mute: boolean;
  muteDuration: number;
  recall: boolean;
  alert: boolean;
}

export const Config: Schema<Config> = Schema.object({
  mute: Schema.boolean().description("是否禁言").default(false),
  muteDuration: Schema.natural()
    .role("s")
    .description("禁言时长 (秒)")
    .default((10 * Time.minute) / 1000),
  recall: Schema.boolean().description("是否撤回").default(true),
  alert: Schema.boolean().description("是否提示").default(true),
});

function deepEqual(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
      return false;
    }
  }
  return true;
}

export function apply(
  ctx: Context,
  { mute, muteDuration, recall, alert }: Config
) {
  ctx.i18n.define("zh-CN", require("./locales/zh_CN"));
  const logger = ctx.logger("message-guard");
  ctx = ctx.platform("onebot").guild();
  ctx.middleware(async (session, next) => {
    const transformedElements = await ctx.censor.transform(session.elements, session);
    if (!deepEqual(session.elements, transformedElements)) {
      logger.info(`sesitive word detected: ${session.content}`);
      if (alert) {
        session.send(session.text("commands.message-guard.messages.alert"));
      }
      if (mute) {
        await session.onebot.setGroupBan(
          session.channelId,
          session.userId,
          muteDuration
        );
      }
      if (recall) {
        await session.onebot.deleteMsg(session.messageId);
      }
      return;
    }
    next();
  });
}
