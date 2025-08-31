/**
 * @name GUIToggler
 * @author ㄱㅇㅇ
 * @authorId 1006027073103609887
 * @version 1.1.0
 * @description 🎛️ 채팅 자동 반응/포맷 설정 GUI를 Discord 안에서 직접 조절할 수 있게 해줍니다.
 * @invite rfaznuJj
 * @donate https://buymeacoffee.com/ex0net
 * @patreon https://patreon.com/ex0net
 * @website https://github.com/ex0net/BetterDiscord-GUIToggler
 * @source https://github.com/ex0net/BetterDiscord-GUIToggler
 * @updateUrl https://raw.githubusercontent.com/ex0net/BetterDiscord-GUIToggler/main/GUIToggler.plugin.js
 */

module.exports = class AutoReactFormatter {
  start() {
    this.modules = {};
    this._loadModules();

    this.settings = BdApi.loadData("AutoReactFormatter", "settings") || {
      enabled: true,
      mode: "bold",
      autoVote: true,
      autoReact: true,
      reactionEmoji: "✅"
    };

    this.injectGUI();

    // 메시지 전송 가로채기 → 자동 포맷 적용
    const MessageActions = BdApi.findModuleByProps("jumpToMessage", "_sendMessage");
    if (!MessageActions || !MessageActions.sendMessage) {
      console.error("MessageActions.sendMessage 모듈을 찾을 수 없습니다.");
      return;
    }
    this.originalSendMessage = MessageActions.sendMessage;

    MessageActions.sendMessage = (channelId, msgObj, ...rest) => {
      if (this.settings.enabled && typeof msgObj?.content === "string") {
        msgObj = { ...msgObj, content: this.applyFormat(msgObj.content) };
      }
      return this.originalSendMessage(channelId, msgObj, ...rest);
    };

    // MESSAGE_CREATE 이벤트 구독 → 자동 리액션
    const { Dispatcher, UserStore } = this.modules;
    this._onMessageCreate = (payload) => {
      try {
        if (!this.settings.autoReact) return;
        const me = UserStore?.getCurrentUser?.();
        const m = payload?.message ?? payload;
        if (!m?.id || !m?.channel_id || !m?.author?.id) return;
        if (m.author.id !== me?.id) return;
        setTimeout(() => {
          this.addReaction(m.channel_id, m.id, this.settings.reactionEmoji);
        }, 200);
      } catch (e) {
        console.error("[GUIToggler] MESSAGE_CREATE handler error:", e);
      }
    };
    Dispatcher?.subscribe?.("MESSAGE_CREATE", this._onMessageCreate);
  }

  stop() {
    const panel = document.getElementById("auto-react-gui");
    if (panel) panel.remove();

    const { Dispatcher } = this.modules || {};
    if (Dispatcher && this._onMessageCreate) {
      Dispatcher.unsubscribe?.("MESSAGE_CREATE", this._onMessageCreate);
    }

    const MessageActions = BdApi.findModuleByProps("jumpToMessage", "_sendMessage");
    if (MessageActions && this.originalSendMessage) {
      MessageActions.sendMessage = this.originalSendMessage;
    }
  }

  _loadModules() {
    this.modules.Dispatcher = BdApi.findModuleByProps("subscribe", "dispatch");
    this.modules.UserStore = BdApi.findModuleByProps("getCurrentUser", "getUser");
    this.modules.ReactionUtils = BdApi.findModuleByProps("addReaction", "removeReaction");
    this.modules.EmojiStore = BdApi.findModuleByProps("getByName", "getById"); // 이모지 캐시
  }

  /**
   * 자동 포맷 적용
   */
  applyFormat(text) {
    switch (this.settings.mode) {
      case "bold":
        return `**${text}**`;
      case "italic":
        return `_${text}_`;
      case "code":
        return `\`\`\`${text}\`\`\``;
      default:
        return text;
    }
  }

  /**
   * 리액션 추가 (:name: 지원)
   */
  addReaction(channelId, messageId, emojiInput) {
    try {
      const { ReactionUtils } = this.modules;
      if (!ReactionUtils?.addReaction) return;

      const parsed = this._parseEmoji(emojiInput);

      const tryAdd = async () => {
        try {
          return await ReactionUtils.addReaction(channelId, messageId, {
            emojiId: parsed.id,
            emojiName: parsed.name,
            burst: false
          });
        } catch {
          return await ReactionUtils.addReaction(channelId, messageId, parsed.raw, false);
        }
      };

      tryAdd()
        .then(() => console.log(`[GUIToggler] Reacted "${emojiInput}" to ${messageId}`))
        .catch((err) => console.error("[GUIToggler] Failed to add reaction:", err));
    } catch (e) {
      console.error("[GUIToggler] addReaction fatal:", e);
    }
  }

  /**
   * "<:name:id>", ":name:", "✅" 지원
   */
  _parseEmoji(input) {
    const s = String(input || "").trim();

    // <:name:id>
    const m = /^<a?:([a-zA-Z0-9_]+):(\d+)>$/.exec(s);
    if (m) return { raw: s, id: m[2], name: m[1] };

    // :name:
    if (/^:[a-zA-Z0-9_]+:$/.test(s)) {
      const name = s.slice(1, -1);
      const e = this.modules.EmojiStore?.getByName?.(name);
      if (e) return { raw: `<:${e.name}:${e.id}>`, id: e.id, name: e.name };
    }

    // 유니코드
    return { raw: s, id: null, name: s };
  }

  saveSettings() {
    BdApi.saveData("AutoReactFormatter", "settings", this.settings);
  }

  injectGUI() {
    const gui = document.createElement("div");
    gui.id = "auto-react-gui";
    gui.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:9999;
      background:#111;color:#fff;padding:10px;border:1px solid #444;
      border-radius:8px;font-family:monospace;box-shadow:0 6px 24px rgba(0,0,0,.35);
    `;

    const createCheckbox = (label, key) => {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:flex;gap:6px;align-items:center;margin:4px 0;";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = this.settings[key];
      box.addEventListener("change", () => {
        this.settings[key] = box.checked;
        this.saveSettings();
      });
      const span = document.createElement("span");
      span.textContent = label;
      wrap.appendChild(box);
      wrap.appendChild(span);
      gui.appendChild(wrap);
    };

    createCheckbox("🎭 전체 자동 반응 ON/OFF", "autoReact");
    createCheckbox("📝 자동 포맷 ON/OFF", "enabled");

    const row = document.createElement("div");
    row.style.cssText = "margin-top:6px;display:flex;align-items:center;gap:6px;";
    const styleLabel = document.createElement("span");
    styleLabel.textContent = "스타일:";
    row.appendChild(styleLabel);

    const select = document.createElement("select");
    ["bold", "italic", "code"].forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      if (m === this.settings.mode) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      this.settings.mode = select.value;
      this.saveSettings();
    });
    row.appendChild(select);
    gui.appendChild(row);

    const emojiLabel = document.createElement("label");
    emojiLabel.textContent = "리액션 이모지:";
    emojiLabel.style.cssText = "display:block;margin-top:8px;";

    const emojiInput = document.createElement("input");
    emojiInput.type = "text";
    emojiInput.value = this.settings.reactionEmoji;
    emojiInput.style.cssText = "width:160px;margin-top:4px;background:#181818;border:1px solid #333;color:#fff;border-radius:6px;padding:4px 6px;";
    emojiInput.addEventListener("input", () => {
      this.settings.reactionEmoji = emojiInput.value.trim();
      this.saveSettings();
    });

    gui.appendChild(emojiLabel);
    gui.appendChild(emojiInput);

    document.body.appendChild(gui);
  }
};
